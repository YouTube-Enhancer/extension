/**
 * Feature Configuration Persistence Sweep
 * this suite tests feature configuration contracts and persistence in small batches:
 * 1. Idempotency: verifies double-enable (0 -> 1 -> 1) and double-disable (1 -> 0 -> 0).
 * 2. Storage persistence: asserts that configuration changes persist in `chrome.storage.local`.
 * 3. Navigation persistence: confirms state survives both hard page reloads and SPA navigations.
 * 4. Automated triage: isolates failing features into individual `test.step` blocks on retry.
 */

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { watchExtensionErrors } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import {
	collectSwitches,
	disableFeature,
	enableFeature,
	type Switch
} from "@/src/utils/_tests/features";
import { loadAllFeatureMetadata } from "@/src/utils/_tests/metadata";
import {
	navigateToLiveOrSkip,
	navigateToPageType,
	reloadPage,
	spaNavigateToFirstVideo,
	spaNavigateToHome,
	spaNavigateToRelatedVideo
} from "@/src/utils/_tests/navigation";
import { readStoredOptions } from "@/src/utils/_tests/storage";
import { loginRequiredPages, resolvePageTypes } from "@/src/utils/_tests/utils";
import { getPathValue } from "@/src/utils/misc";

type PageBatch = {
	batchIndex: number;
	features: SweepFeature[];
	targetPageType: PageType;
	totalBatchesForPage: number;
};

type SweepFeature = {
	enabledKeys: Switch[];
	id: string;
	targetPageType: PageType;
};

function chunk<T>(items: readonly T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		chunks.push(items.slice(i, i + size));
	}
	return chunks;
}

/**
 * Checks all features in a batch against a single snapshot of readStoredOptions.
 * Eliminates redundant postMessage roundtrips by verifying all flags in memory.
 */
async function expectAllStoredFlags(
	page: Parameters<typeof readStoredOptions>[0],
	features: SweepFeature[],
	value: boolean
) {
	await expect
		.poll(async () => {
			const options = await readStoredOptions(page);
			return features.every((feature) =>
				feature.enabledKeys.every((key) => getPathValue(options, key) === value)
			);
		})
		.toBe(true);
}

/**
 * Verifies all enabled keys for a single feature against readStoredOptions.
 */
async function expectStoredFlags(
	page: Parameters<typeof readStoredOptions>[0],
	keys: Switch[],
	value: boolean
) {
	await expect
		.poll(async () => {
			const options = await readStoredOptions(page);
			return keys.every((key) => getPathValue(options, key) === value);
		})
		.toBe(true);
}

/**
 * Executes SPA navigation appropriate for the given page surface.
 */
async function performSpaNavigation(
	page: Parameters<typeof readStoredOptions>[0],
	pageType: PageType
) {
	if (pageType === "watch") {
		await spaNavigateToRelatedVideo(page);
	} else if (pageType === "home") {
		await spaNavigateToFirstVideo(page);
	} else {
		await spaNavigateToHome(page);
	}
}

function resolveTargetPage(includePages?: readonly PageType[]): PageType {
	const testPages = resolvePageTypes(includePages);
	if (testPages.includes("watch")) return "watch";
	return testPages[0];
}

/**
 * Standard isolated persistence battery used exclusively in Retry triage fallback.
 * Always navigates fresh: navigateToPageType guards against re-navigating the same URL
 * but still asserts extension readiness, ensuring clean initial state per feature.
 */
async function runIsolatedFeatureBattery(
	page: Parameters<typeof readStoredOptions>[0],
	feature: SweepFeature,
	errors: string[]
) {
	if (feature.targetPageType === "live") {
		await navigateToLiveOrSkip(page);
	} else {
		await navigateToPageType(page, feature.targetPageType);
	}

	// Initial Enable (0 -> 1)
	await toggleFeatures(page, [feature], enableFeature);
	await expectStoredFlags(page, feature.enabledKeys, true);

	// Idempotent Enable (1 -> 1)
	await toggleFeatures(page, [feature], enableFeature);
	await expectStoredFlags(page, feature.enabledKeys, true);

	// Page Reload persistence
	await reloadPage(page, feature.targetPageType);
	await expectStoredFlags(page, feature.enabledKeys, true);

	// SPA Navigation persistence
	await performSpaNavigation(page, feature.targetPageType);
	await expectStoredFlags(page, feature.enabledKeys, true);

	// Initial Disable (1 -> 0)
	await toggleFeatures(page, [feature], disableFeature);
	await expectStoredFlags(page, feature.enabledKeys, false);

	// Idempotent Disable (0 -> 0)
	await toggleFeatures(page, [feature], disableFeature);
	await expectStoredFlags(page, feature.enabledKeys, false);

	expect(errors, `No errors expected for feature ${feature.id}`).toEqual([]);
}

async function toggleFeatures(
	page: Parameters<typeof readStoredOptions>[0],
	features: SweepFeature[],
	toggle: typeof enableFeature
) {
	for (const feature of features) {
		for (const key of feature.enabledKeys) {
			await toggle(page, key);
		}
	}
}

const allMetadata = await loadAllFeatureMetadata();
const validFeatures: SweepFeature[] = [];
const skippedFeatures: string[] = [];

for (const metadata of allMetadata) {
	const enabledKeys = collectSwitches(metadata.defaults, metadata.id);
	if (enabledKeys.length === 0) {
		skippedFeatures.push(metadata.id);
		continue;
	}

	validFeatures.push({
		enabledKeys,
		id: metadata.id,
		targetPageType: resolveTargetPage(metadata.dependencies?.includePages)
	});
}

// Bucket features by target page surface
const featuresByPageType = new Map<PageType, SweepFeature[]>();
for (const feature of validFeatures) {
	const list = featuresByPageType.get(feature.targetPageType) ?? [];
	list.push(feature);
	featuresByPageType.set(feature.targetPageType, list);
}

const BATCH_SIZE = 4;
const pageBatches: PageBatch[] = [];

for (const [pageType, features] of featuresByPageType.entries()) {
	const chunks = chunk(features, BATCH_SIZE);
	for (const [index, batch] of chunks.entries()) {
		pageBatches.push({
			batchIndex: index + 1,
			features: batch,
			targetPageType: pageType,
			totalBatchesForPage: chunks.length
		});
	}
}

/**
 * Configuration persistence sweep across all registered features.
 * Batches features by target page surface to co-verify reload and SPA navigations,
 * toggles cleanly (full 1 -> 1 and 0 -> 0 idempotency), and provides isolated per-feature triage fallback upon retry.
 */
test.describe("feature configuration persistence sweep", () => {
	test("feature metadata is loaded", () => {
		expect(allMetadata.length, "Expected feature metadata to be loaded").toBeGreaterThan(50);
	});

	for (const batch of pageBatches) {
		const batchTitle = `[${batch.targetPageType}] batch ${batch.batchIndex}/${batch.totalBatchesForPage} (${batch.features.map((f) => f.id).join(", ")})`;

		test(batchTitle, async ({ page }, testInfo) => {
			test.skip(
				!hasAuthState() && loginRequiredPages.includes(batch.targetPageType),
				`${batch.targetPageType} requires login`
			);

			// Extension error listener survives page reloads on stable page types
			if (testInfo.retry === 0) {
				const errors = watchExtensionErrors(page);

				// Initial Navigation
				if (batch.targetPageType === "live") {
					await navigateToLiveOrSkip(page);
				} else {
					await navigateToPageType(page, batch.targetPageType);
				}

				// Initial Enable (0 -> 1)
				await toggleFeatures(page, batch.features, enableFeature);
				await expectAllStoredFlags(page, batch.features, true);

				// Idempotent Enable (1 -> 1)
				await toggleFeatures(page, batch.features, enableFeature);
				await expectAllStoredFlags(page, batch.features, true);

				await reloadPage(page, batch.targetPageType);
				await expectAllStoredFlags(page, batch.features, true);

				await performSpaNavigation(page, batch.targetPageType);
				await expectAllStoredFlags(page, batch.features, true);

				// Initial Disable (1 -> 0)
				await toggleFeatures(page, batch.features, disableFeature);
				await expectAllStoredFlags(page, batch.features, false);

				// Idempotent Disable (0 -> 0)
				await toggleFeatures(page, batch.features, disableFeature);
				await expectAllStoredFlags(page, batch.features, false);

				expect(errors, `No errors expected for batch ${batchTitle}`).toEqual([]);
			} else {
				// RETRY #1+: ISOLATED PER-FEATURE TRIAGE FALLBACK
				console.log(
					`[Retry #${testInfo.retry}] Batch failed on previous attempt. Running isolated triage for ${batchTitle}...`
				);

				const errors = watchExtensionErrors(page);

				for (const feature of batch.features) {
					await test.step(`isolate: ${feature.id}`, async () => {
						errors.length = 0;
						try {
							await runIsolatedFeatureBattery(page, feature, errors);
						} catch (error) {
							expect
								.soft(
									error instanceof Error ? error.message : String(error),
									`Regression isolated to ${feature.id}`
								)
								.toBeFalsy();
						} finally {
							await toggleFeatures(page, [feature], disableFeature);
						}
					});
				}
			}
		});
	}

	test("every feature exposes an enabled configuration setting", () => {
		expect(skippedFeatures).toEqual([]);
	});
});
