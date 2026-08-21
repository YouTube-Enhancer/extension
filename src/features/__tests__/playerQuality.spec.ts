import { test } from "playwright.config";

import type { YoutubePlayerQualityLevel } from "@/src/features/playerQuality/types";

import { metadata } from "@/src/features/playerQuality/index.metadata";
import { expectCurrentQualityLevelToBeFalsy, expectCurrentQualityLevelToBeTruthy } from "@/src/utils/_tests/assertions";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getClosestQuality } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
// Live streams don't reliably enforce exact quality levels via setPlaybackQualityRange;
// only run the specific-quality tests (lower fallback, hd720) on VOD page types.
const vodPages = testPages.filter((p) => p !== "live");

export const qualityLevel = "hd2160" as YoutubePlayerQualityLevel;
test.describe("playerQuality", () => {
	for (const pageType of testPages) {
		test(`should set quality to closest on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerQuality.quality", qualityLevel);
			await enableFeature(page, "playerQuality.enabled");
			const closestQuality = await getClosestQuality(page, pageType, qualityLevel);
			if (!closestQuality) return; // quality selection not supported (e.g. live stream with only "auto")
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality);
		});
		test(`quality should not be set to closest when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "playerQuality.enabled");
			const closestQuality = await getClosestQuality(page, pageType, qualityLevel);
			if (!closestQuality) return; // quality selection not supported
			await expectCurrentQualityLevelToBeFalsy(page, pageType, closestQuality);
		});
	}
	for (const pageType of vodPages) {
		test(`should set quality with lower fallback strategy on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerQuality.quality", qualityLevel);
			await setOption(page, "playerQuality.fallbackStrategy", "lower");
			await enableFeature(page, "playerQuality.enabled");
			const closestQuality = await getClosestQuality(page, pageType, qualityLevel, "lower");
			if (!closestQuality) return; // quality selection not supported
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality);
		});
		test(`should set quality to hd720 on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerQuality.quality", "hd720");
			await enableFeature(page, "playerQuality.enabled");
			const closestQuality = await getClosestQuality(page, pageType, "hd720");
			if (!closestQuality) return; // quality selection not supported
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality);
		});
	}
});
