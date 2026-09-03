import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/flipVideoButtons/index.metadata";
import {
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeTruthy
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, clickFeatureMenuItem, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { toggleFullscreen } from "@/src/utils/_tests/fullscreen";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const { left, menu, right } = placementRecord;
const { home, watch } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

test.describe("flipVideoButtons", () => {
	for (const pageType of testPages) {
		test.describe("flipVideoHorizontalButton", () => {
			test(`horizontal flip button should be present on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
				await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", right);
				await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-button");
			});
		});
	}

	test.describe("flipVideoVerticalButton", () => {
		// Only run on watch: neither index.ts nor utils.ts branch on live vs VOD, and the live page costs up to 120s of navigation.
		test("vertical flip button should be present on watch", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
			await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoVerticalButton-button");
		});
	});

	// Load-time re-add is page-independent (framework hard navigation), so this only runs on watch.
	test("flip buttons should persist after navigation on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
		await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", right);
		await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
		await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-button");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoVerticalButton-button");
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-button");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoVerticalButton-button");
		await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoHorizontalButton-button", right);
		await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoVerticalButton-button", right);
	});

	// Enable/disable handling lives in featureButtonManager and is page-independent, so this only runs on watch.
	test("flip buttons should re-appear after disable then re-enable on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
		await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", right);
		await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
		await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-button");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoVerticalButton-button");
		await disableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
		await disableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-flipVideoHorizontalButton-button");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-flipVideoVerticalButton-button");
		await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
		await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", right);
		await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
		await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-button");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoVerticalButton-button");
	});

	test(`flip buttons should persist after full page reload`, async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
		await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", right);
		await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
		await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-button");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoVerticalButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-button");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoVerticalButton-button");
	});

	test(`should not create flip video buttons on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
		await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-flipVideoHorizontalButton-button");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-flipVideoVerticalButton-button");
	});

	test.describe("button placement", () => {
		for (const placement of [left, right] as const) {
			test(`flip buttons should render in ${placement}`, async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", placement);
				await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", placement);
				await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
				await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
				await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-button");
				await expectFeatureButtonToBeTruthy(page, "yte-feature-flipVideoVerticalButton-button");
				await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoHorizontalButton-button", placement);
				await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoVerticalButton-button", placement);
			});
		}
	});

	test.describe("flipping the video", () => {
		test("horizontal flip button should flip the video and restore it on a second click on watch", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", right);
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoHorizontalButton-button", right);
			await clickFeatureButton(page, watch, "yte-feature-flipVideoHorizontalButton-button", right);
			await expectVideoTransform(page, "scale(-1, 1)");
			await clickFeatureButton(page, watch, "yte-feature-flipVideoHorizontalButton-button", right);
			await expectVideoTransform(page, "scale(1, 1)");
		});
		test("vertical flip button should flip the video and restore it on a second click on watch", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", right);
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoVerticalButton-button", right);
			await clickFeatureButton(page, watch, "yte-feature-flipVideoVerticalButton-button", right);
			await expectVideoTransform(page, "scale(1, -1)");
			await clickFeatureButton(page, watch, "yte-feature-flipVideoVerticalButton-button", right);
			await expectVideoTransform(page, "scale(1, 1)");
		});
		test("both flip buttons should combine into a flip on each axis on watch", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", right);
			await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", right);
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoHorizontalButton-button", right);
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoVerticalButton-button", right);
			await clickFeatureButton(page, watch, "yte-feature-flipVideoHorizontalButton-button", right);
			await expectVideoTransform(page, "scale(-1, 1)");
			// The two axes are independent latches, so the second click must keep the first one applied.
			await clickFeatureButton(page, watch, "yte-feature-flipVideoVerticalButton-button", right);
			await expectVideoTransform(page, "scale(-1, -1)");
			await clickFeatureButton(page, watch, "yte-feature-flipVideoHorizontalButton-button", right);
			await expectVideoTransform(page, "scale(1, -1)");
		});
		test("flip buttons should render in the feature menu and flip the video from it on watch", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", menu);
			await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", menu);
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-flipVideoHorizontalButton-menuitem");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-flipVideoVerticalButton-menuitem");
			await clickFeatureMenuItem(page, watch, "yte-feature-flipVideoHorizontalButton-menuitem");
			await expectVideoTransform(page, "scale(-1, 1)");
		});
	});

	test.describe("fullscreen transition", () => {
		test("flip buttons should move from left to right on fullscreen enter/exit", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.placement", left);
			await setOption(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.fullscreenPlacement", right);
			await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.placement", left);
			await setOption(page, "flipVideoButtons.buttons.flipVideoVerticalButton.fullscreenPlacement", right);
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoHorizontalButton.enabled");
			await enableFeature(page, "flipVideoButtons.buttons.flipVideoVerticalButton.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoHorizontalButton-button", left);
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoVerticalButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoHorizontalButton-button", right);
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoVerticalButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoHorizontalButton-button", left);
			await expectFeatureButtonToBeIn(page, "yte-feature-flipVideoVerticalButton-button", left);
		});
	});
});

/** Asserts the inline transform the feature writes on the player's video element. */
async function expectVideoTransform(page: Page, expected: string): Promise<void> {
	await expect
		.poll(async () => page.evaluate(() => document.querySelector<HTMLVideoElement>("#movie_player video.html5-main-video")?.style.transform ?? null))
		.toBe(expected);
}
