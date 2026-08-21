import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/playbackSpeedButtons/index.metadata";
import { placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getCurrentSpeed } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { left } = placementRecord;
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
	}
});
