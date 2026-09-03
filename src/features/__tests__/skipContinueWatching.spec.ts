import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/skipContinueWatching/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { live, watch } = pageTypeRecord;
// The patch installs `function () {}` (index.ts:15); anything else is not this feature's handler.
const EMPTY_FUNCTION_SOURCE = /^function\s*\w*\s*\(\s*\)\s*\{\s*\}$/;

interface YtdWatchElement extends Element {
	youthereDataChanged_: () => void;
}

async function expectHandlerReplaced(page: Page, original: null | string): Promise<void> {
	// Without a captured original, "differs from original" is satisfied by anything - including a missing element.
	expect(original).not.toBeNull();
	await expect
		.poll(
			async () => {
				const current = await getHandler(page);
				return current !== null && current !== original && EMPTY_FUNCTION_SOURCE.test(current);
			},
			{ timeout: 15000 }
		)
		.toBe(true);
}

async function expectHandlerRestored(page: Page, original: null | string): Promise<void> {
	await expect
		.poll(
			async () => {
				const current = await getHandler(page);
				return current?.toString() === original?.toString();
			},
			{ timeout: 15000 }
		)
		.toBe(true);
}

async function getHandler(page: Page): Promise<null | string> {
	return await page.evaluate(() => {
		const el = document.querySelector<YtdWatchElement>("ytd-watch-grid, ytd-watch-flexy");
		return el?.youthereDataChanged_?.toString() ?? null;
	});
}

test.describe("skipContinueWatching", () => {
	for (const pageType of testPages) {
		test(`should not patch when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const original = await getHandler(page);
			await disableFeature(page, "skipContinueWatching.enabled");
			await expectHandlerRestored(page, original);
		});
		test(`should re-patch after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const original = await getHandler(page);
			await enableFeature(page, "skipContinueWatching.enabled");
			await expectHandlerReplaced(page, original);
			await disableFeature(page, "skipContinueWatching.enabled");
			await expectHandlerRestored(page, original);
			await enableFeature(page, "skipContinueWatching.enabled");
			await expectHandlerReplaced(page, original);
		});
		test(`should persist after full page reload on ${pageType}`, async ({ page }) => {
			test.setTimeout(120_000);
			await navigateToPageType(page, pageType);
			const original = await getHandler(page);
			await enableFeature(page, "skipContinueWatching.enabled");
			await expectHandlerReplaced(page, original);
			await page.reload();
			await navigateToPageType(page, pageType);
			// No disable/enable round trip: after a reload YouTube reinstalls its own handler, so this only
			// passes when the feature re-patched on its own.
			await expectHandlerReplaced(page, original);
		});
	}

	// Watch only: onNavigate has no live branch and the live fixture has no sidebar of regular videos to click
	// through to.
	test(`should keep the handler patched after in-page navigation to another video on ${watch}`, async ({ page }) => {
		test.setTimeout(120_000);
		await navigateToPageType(page, watch);
		const original = await getHandler(page);
		await enableFeature(page, "skipContinueWatching.enabled");
		await expectHandlerReplaced(page, original);
		// A genuine in-document navigation: every other navigation in this spec is a document load, which runs
		// onEnable instead of onNavigate.
		await spaNavigateToRelatedVideo(page);
		await expectHandlerReplaced(page, original);
	});

	test("should not patch on non-target page", async ({ page }) => {
		// live sits outside includePages but is still a /watch document, so ytd-watch-flexy exists and the
		// handler is observable - on a channel page getHandler is null either way and nothing is asserted.
		await navigateToPageType(page, live);
		const before = await getHandler(page);
		expect(before).not.toBeNull();
		await enableFeature(page, "skipContinueWatching.enabled");
		await expectToStay(async () => getHandler(page), before, { page });
	});
});
