import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/playbackSpeedButtons/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeIn, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { toggleFullscreen } from "@/src/utils/_tests/fullscreen";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getCurrentSpeed } from "@/src/utils/_tests/player";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { watch } = pageTypeRecord;
const { left, right } = placementRecord;
const speedAdjustment = 0.25;
test.describe("playbackSpeedButtons", () => {
	for (const pageType of testPages) {
		test(`increase speed button should increase playback speed on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playbackSpeedButtons.speed", speedAdjustment);
			await setOption(page, "playbackSpeedButtons.button.placement", left);
			await enableFeature(page, "playbackSpeedButtons.button.enabled");
			const currentSpeed = await getCurrentSpeed(page, pageType);
			expect(currentSpeed).toBeTruthy();
			if (!currentSpeed) return;
			await clickFeatureButton(page, pageType, "yte-feature-increasePlaybackSpeedButton-button", left);
			await expect.poll(async () => getCurrentSpeed(page, pageType), { intervals: [200], timeout: 5000 }).toBe(currentSpeed + speedAdjustment);
		});
		test(`decrease speed button should decrease playback speed on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playbackSpeedButtons.speed", speedAdjustment);
			await setOption(page, "playbackSpeedButtons.button.placement", left);
			await enableFeature(page, "playbackSpeedButtons.button.enabled");
			const currentSpeed = await getCurrentSpeed(page, pageType);
			expect(currentSpeed).toBeTruthy();
			if (!currentSpeed) return;
			await clickFeatureButton(page, pageType, "yte-feature-decreasePlaybackSpeedButton-button", left);
			await expect.poll(async () => getCurrentSpeed(page, pageType), { intervals: [200], timeout: 5000 }).toBe(currentSpeed - speedAdjustment);
		});
		test(`speed buttons should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playbackSpeedButtons.button.placement", left);
			await enableFeature(page, "playbackSpeedButtons.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-increasePlaybackSpeedButton-button");
			await disableFeature(page, "playbackSpeedButtons.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-increasePlaybackSpeedButton-button");
			await enableFeature(page, "playbackSpeedButtons.button.enabled");
			await setOption(page, "playbackSpeedButtons.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-increasePlaybackSpeedButton-button");
		});
	}

	test(`speed buttons should persist after full page reload`, async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await setOption(page, "playbackSpeedButtons.button.placement", left);
		await enableFeature(page, "playbackSpeedButtons.button.enabled");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-increasePlaybackSpeedButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-increasePlaybackSpeedButton-button");
	});

	test(`should not create speed buttons on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "playbackSpeedButtons.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-increasePlaybackSpeedButton-button");
	});

	test.describe("feature conflicts", () => {
		test.describe("playerSpeed vs playbackSpeedButtons", () => {
			test("playerSpeed default is applied and speed buttons are present when both enabled on watch", async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "playerSpeed.speed", 2);
				await setOption(page, "playbackSpeedButtons.speed", 0.25);
				await setOption(page, "playbackSpeedButtons.button.placement", left);
				await enableFeature(page, "playerSpeed.enabled");
				await enableFeature(page, "playbackSpeedButtons.button.enabled");
				await page.waitForTimeout(2000);

				await expect(page.locator("#yte-feature-decreasePlaybackSpeedButton-button")).toBeAttached();
				await expect(page.locator("#yte-feature-increasePlaybackSpeedButton-button")).toBeAttached();

				const speed = await page.evaluate(() => {
					const video = document.querySelector("video");
					return video?.playbackRate ?? null;
				});
				expect(speed).toBe(2);
			});
		});
	});

	test.describe("button placement", () => {
		// player_controls_left is already asserted by clickFeatureButton in the increase/decrease click tests.
		test(`speed buttons should render in ${right}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "playbackSpeedButtons.button.placement", right);
			await enableFeature(page, "playbackSpeedButtons.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-increasePlaybackSpeedButton-button");
			await expectFeatureButtonToBeIn(page, "yte-feature-increasePlaybackSpeedButton-button", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-decreasePlaybackSpeedButton-button");
			await expectFeatureButtonToBeIn(page, "yte-feature-decreasePlaybackSpeedButton-button", right);
		});
	});

	test.describe("fullscreen transition", () => {
		test("speed buttons should move from left to right on fullscreen enter/exit", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "playbackSpeedButtons.button.placement", left);
			await setOption(page, "playbackSpeedButtons.button.fullscreenPlacement", right);
			await enableFeature(page, "playbackSpeedButtons.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-increasePlaybackSpeedButton-button", left);
			await expectFeatureButtonToBeIn(page, "yte-feature-decreasePlaybackSpeedButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-increasePlaybackSpeedButton-button", right);
			await expectFeatureButtonToBeIn(page, "yte-feature-decreasePlaybackSpeedButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-increasePlaybackSpeedButton-button", left);
			await expectFeatureButtonToBeIn(page, "yte-feature-decreasePlaybackSpeedButton-button", left);
		});
	});
});
