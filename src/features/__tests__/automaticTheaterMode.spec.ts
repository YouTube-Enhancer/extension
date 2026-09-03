import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/automaticTheaterMode/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);

const { watch } = pageTypeRecord;
export async function expectNotTheaterMode(page: Page): Promise<void> {
	await expect
		.poll(
			async () => {
				return await page.evaluate(() => {
					const flexy = document.querySelector("ytd-watch-flexy");
					const grid = document.querySelector("ytd-watch-grid");
					return flexy?.hasAttribute("theater") || grid?.hasAttribute("theater");
				});
			},
			{ timeout: 15000 }
		)
		.toBeFalsy();
}
export async function expectTheaterMode(page: Page): Promise<void> {
	await expect
		.poll(
			async () => {
				return await page.evaluate(() => {
					const flexy = document.querySelector("ytd-watch-flexy");
					const grid = document.querySelector("ytd-watch-grid");
					return flexy?.hasAttribute("theater") || grid?.hasAttribute("theater");
				});
			},
			{ timeout: 15000 }
		)
		.toBeTruthy();
}

async function isTheaterMode(page: Page): Promise<boolean> {
	return await page.evaluate(() => {
		const flexy = document.querySelector("ytd-watch-flexy");
		const grid = document.querySelector("ytd-watch-grid");
		return Boolean(flexy?.hasAttribute("theater") || grid?.hasAttribute("theater"));
	});
}

test.describe("automaticTheaterMode", () => {
	for (const pageType of testPages) {
		test(`theater mode should be enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticTheaterMode.enabled");
			await expectTheaterMode(page);
		});
	}

	// Watch only: onNavigate needs a genuine single-page navigation, and clicking through to a related video is only
	// possible from a watch page (navigateToPageType would be a document load that re-runs onEnable instead).
	test(`theater mode should be applied after navigation when enabled on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "automaticTheaterMode.enabled");
		await expectTheaterMode(page);
		// Leave theater mode so the assertion after the navigation cannot be satisfied by YouTube remembering the
		// layout; nothing re-applies it until onNavigate runs.
		await page.locator("button.ytp-size-button").evaluate((el) => (el as HTMLButtonElement).click());
		await expectNotTheaterMode(page);
		await spaNavigateToRelatedVideo(page);
		await expectTheaterMode(page);
	});
	// Watch only: disableFeature writes the already-default false, so this only re-checks the untouched initial state, which is page agnostic.
	test(`theater mode should be disabled on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await disableFeature(page, "automaticTheaterMode.enabled");
		await expectNotTheaterMode(page);
	});
	// Watch only: onEnable/onDisable call the same makeTheaterTask with no page-specific code (index.ts:31-44).
	test(`theater mode should re-apply after disable then re-enable on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "automaticTheaterMode.enabled");
		await expectTheaterMode(page);
		await disableFeature(page, "automaticTheaterMode.enabled");
		await expectNotTheaterMode(page);
		await enableFeature(page, "automaticTheaterMode.enabled");
		await expectTheaterMode(page);
	});
	// Watch only: the init path has no live-vs-VOD branch, and on live the post-reload navigateToPageType re-runs channel discovery and discards the reloaded page.
	test(`theater mode should persist after full page reload on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "automaticTheaterMode.enabled");
		await expectTheaterMode(page);
		await reloadPage(page, watch);
		await expectTheaterMode(page);
	});

	// Watch only: makeTheaterTask has no page branch, and the early return is what this case pins down.
	test(`does not toggle theater off when the video is already in theater mode on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		// Own the precondition: the enable task must find the player already in theater mode so its
		// `current === desired` early return is the branch under test.
		if (!(await isTheaterMode(page))) {
			await page.locator("button.ytp-size-button").evaluate((el) => (el as HTMLButtonElement).click());
		}
		await expectTheaterMode(page);
		await enableFeature(page, "automaticTheaterMode.enabled");
		// A task that clicked unconditionally would drop out of theater mode; the retry loop runs 20 x 300 ms, so
		// watch for longer than that window instead of sampling once.
		await expectToStay(async () => isTheaterMode(page), true, { durationMs: 7000, intervalMs: 500, page });
	});
});
