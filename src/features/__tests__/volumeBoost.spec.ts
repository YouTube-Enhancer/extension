import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/volumeBoost/index.metadata";
import {
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeTruthy
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { toggleFullscreen } from "@/src/utils/_tests/fullscreen";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";
import { clampDb, dbToLinear } from "@/src/utils/misc";
const { left, right } = placementRecord;
const { home, watch } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

async function expectVolumeBoostAmount(page: Page, expected: number) {
	await expect
		.poll(
			async () =>
				page.evaluate(() => {
					const gain = window.engine?.volumeGain?.gain;
					if (!gain) return null;
					return gain.value;
				}),
			{ timeout: 10_000 }
		)
		.toBeCloseTo(dbToLinear(clampDb(expected)), 5);
}
async function expectVolumeBoostEnabled(page: Page, enabled: boolean) {
	await expect
		.poll(
			async () =>
				page.evaluate(() => {
					const { engine } = window;
					if (!engine) return false;
					const gain = engine.volumeGain?.gain;
					if (gain == null) return false;
					return gain.value !== 1;
				}),
			{ timeout: 10_000 }
		)
		.toBe(enabled);
}
test.describe("volumeBoost", () => {
	test.describe("volumeBoost (global)", () => {
		for (const pageType of testPages) {
			test(`should set global volume boost to 10 on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "global");
				await setOption(page, "volumeBoost.amount", 10);
				await expectVolumeBoostEnabled(page, true);
				await expectVolumeBoostAmount(page, 10);
			});
			test(`should persist global volume boost after navigation on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "global");
				await setOption(page, "volumeBoost.amount", 10);
				await expectVolumeBoostEnabled(page, true);
				await expectVolumeBoostAmount(page, 10);
				await navigateToPageType(page, home);
				await navigateToPageType(page, pageType);
				await disableFeature(page, "volumeBoost.enabled");
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "global");
				await setOption(page, "volumeBoost.amount", 10);
				await expectVolumeBoostEnabled(page, true);
				await expectVolumeBoostAmount(page, 10);
			});
			test(`should re-apply global volume boost after disable then re-enable on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "global");
				await setOption(page, "volumeBoost.amount", 10);
				await expectVolumeBoostEnabled(page, true);
				await expectVolumeBoostAmount(page, 10);
				await disableFeature(page, "volumeBoost.enabled");
				await expectVolumeBoostEnabled(page, false);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "global");
				await setOption(page, "volumeBoost.amount", 10);
				await expectVolumeBoostEnabled(page, true);
				await expectVolumeBoostAmount(page, 10);
			});
			test(`should persist global volume boost after full page reload on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "global");
				await setOption(page, "volumeBoost.amount", 10);
				await expectVolumeBoostEnabled(page, true);
				await expectVolumeBoostAmount(page, 10);
				await page.reload();
				await navigateToPageType(page, pageType);
				await expectVolumeBoostEnabled(page, true);
				await expectVolumeBoostAmount(page, 10);
			});
		}
	});
	const buttonTestPages = testPages.filter((p) => p !== "shorts");
	test.describe("volumeBoost (button)", () => {
		for (const pageType of buttonTestPages) {
			test(`button should be enabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "per_video");
				await setOption(page, "volumeBoost.button.placement", right);
				await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
			});
			test(`button should be disabled when feature is off on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await disableFeature(page, "volumeBoost.enabled");
				await expectFeatureButtonToBeFalsy(page, "yte-feature-volumeBoostButton-button");
			});
			test(`button should set volume boost to 10 on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "per_video");
				await setOption(page, "volumeBoost.amount", 10);
				await setOption(page, "volumeBoost.button.placement", right);
				await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
				await clickFeatureButton(page, pageType, "yte-feature-volumeBoostButton-button", right);
				await expectVolumeBoostEnabled(page, true);
				await expectVolumeBoostAmount(page, 10);
			});
			test(`button should toggle off when clicked again on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "per_video");
				await setOption(page, "volumeBoost.amount", 10);
				await setOption(page, "volumeBoost.button.placement", right);
				await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
				await clickFeatureButton(page, pageType, "yte-feature-volumeBoostButton-button", right);
				await expectVolumeBoostEnabled(page, true);
				await expectVolumeBoostAmount(page, 10);
				await clickFeatureButton(page, pageType, "yte-feature-volumeBoostButton-button", right);
				await expectVolumeBoostEnabled(page, false);
			});
			test(`button should persist boost after navigation on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "per_video");
				await setOption(page, "volumeBoost.amount", 10);
				await setOption(page, "volumeBoost.button.placement", right);
				await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
				await clickFeatureButton(page, pageType, "yte-feature-volumeBoostButton-button", right);
				await expectVolumeBoostEnabled(page, true);
				await expectVolumeBoostAmount(page, 10);
				await navigateToPageType(page, home);
				await navigateToPageType(page, pageType);
				await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
			});
			test(`button should persist boost after full page reload on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "per_video");
				await setOption(page, "volumeBoost.amount", 10);
				await setOption(page, "volumeBoost.button.placement", right);
				await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
				await clickFeatureButton(page, pageType, "yte-feature-volumeBoostButton-button", right);
				await expectVolumeBoostEnabled(page, true);
				await expectVolumeBoostAmount(page, 10);
				await page.reload();
				await navigateToPageType(page, pageType);
				await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
			});
		}
	});

	test(`should not create volume boost button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "volumeBoost.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-volumeBoostButton-button");
	});

	test.describe("button placement", () => {
		for (const placement of [left, right] as const) {
			test(`should render button in ${placement}`, async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "volumeBoost.button.placement", placement);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "per_video");
				await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
				await expectFeatureButtonToBeIn(page, "yte-feature-volumeBoostButton-button", placement);
			});
		}

		test("should render button in feature menu", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "volumeBoost.button.placement", "feature_menu");
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "per_video");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-volumeBoostButton-menuitem");
		});
	});

	test.describe("fullscreen transition", () => {
		test("should move button from left to right on fullscreen enter/exit", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "volumeBoost.button.placement", left);
			await setOption(page, "volumeBoost.button.fullscreenPlacement", right);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "per_video");
			await expectFeatureButtonToBeIn(page, "yte-feature-volumeBoostButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-volumeBoostButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-volumeBoostButton-button", left);
		});

		test("should not move button when fullscreenPlacement is same", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "volumeBoost.button.placement", right);
			await setOption(page, "volumeBoost.button.fullscreenPlacement", "same");
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "per_video");
			await expectFeatureButtonToBeIn(page, "yte-feature-volumeBoostButton-button", right);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-volumeBoostButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-volumeBoostButton-button", right);
		});
	});
	test.describe("audio engine", () => {
		test("resumes a suspended audio context when the page becomes visible on watch", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "global");
			await setOption(page, "volumeBoost.amount", 10);
			await expectVolumeBoostEnabled(page, true);
			await page.evaluate(async () => {
				const { engine } = window;
				if (!engine) throw new Error("audio engine missing");
				await engine.context.suspend();
			});
			await expect.poll(async () => page.evaluate(() => window.engine?.context.state)).toBe("suspended");
			// Firefox suspends the context while the tab is hidden; the engine resumes it on the next visibility change.
			await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
			await expect.poll(async () => page.evaluate(() => window.engine?.context.state), { timeout: 10000 }).toBe("running");
		});
	});
});
