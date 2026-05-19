import {
	disableFeature,
	enableFeature,
	expect,
	expectCurrentQualityLevelToBeFalsy,
	expectCurrentQualityLevelToBeTruthy,
	getClosestQuality,
	navigateToPageType,
	qualityLevel,
	setOption,
	test
} from "playwright.config";

const testPages = ["watch", "shorts", "live"] as const;

test.describe("playerQuality", () => {
	for (const pageType of testPages) {
		test(`should set quality to closest on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerQuality.quality", qualityLevel);
			await enableFeature(page, "playerQuality.enabled");
			const closestQuality = await getClosestQuality(page, pageType, qualityLevel);
			expect(closestQuality).toBeTruthy();
			if (!closestQuality) return;
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality);
		});
		test(`quality should not be set to closest when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "playerQuality.enabled");
			const closestQuality = await getClosestQuality(page, pageType, qualityLevel);
			expect(closestQuality).toBeTruthy();
			if (!closestQuality) return;
			await expectCurrentQualityLevelToBeFalsy(page, pageType, closestQuality);
		});
		test(`should set quality with lower fallback strategy on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "playerQuality.enabled");
			await setOption(page, "playerQuality.quality", qualityLevel);
			await setOption(page, "playerQuality.fallbackStrategy", "lower");
			const closestQuality = await getClosestQuality(page, pageType, qualityLevel, "lower");
			expect(closestQuality).toBeTruthy();
			if (!closestQuality) return;
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality);
		});
		test(`should set quality to hd720 on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "playerQuality.enabled");
			await setOption(page, "playerQuality.quality", "hd720");
			const closestQuality = await getClosestQuality(page, pageType, "hd720");
			expect(closestQuality).toBeTruthy();
			if (!closestQuality) return;
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality);
		});
	}
});
