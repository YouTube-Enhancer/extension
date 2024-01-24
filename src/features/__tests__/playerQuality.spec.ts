import {
	disableFeature,
	enableFeature,
	expect,
	expectCurrentQualityLevelToBeFalsy,
	expectCurrentQualityLevelToBeTruthy,
	getClosestQuality,
	navigateToOptionsPage,
	navigateToYoutubePage,
	qualityLevel,
	selectOption,
	test
} from "playwright.config";

test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});

test("should enable automatically set quality", async ({ page }) => {
	await enableFeature(page, "enable_automatically_set_quality");
});
test("should disable automatically set quality", async ({ page }) => {
	await disableFeature(page, "enable_automatically_set_quality");
});
test("should set quality to closest", async ({ page }) => {
	await enableFeature(page, "enable_automatically_set_quality");
	await selectOption(page, "player_quality", qualityLevel);
	await navigateToYoutubePage(page);
	const closestQuality = await getClosestQuality(page, qualityLevel);
	expect(closestQuality).toBeTruthy();
	if (!closestQuality) return;
	await expectCurrentQualityLevelToBeTruthy(page, closestQuality);
});
test("quality should not be set to closest", async ({ page }) => {
	await disableFeature(page, "enable_automatically_set_quality");
	await navigateToYoutubePage(page);
	const closestQuality = await getClosestQuality(page, qualityLevel);
	expect(closestQuality).toBeTruthy();
	if (!closestQuality) return;
	await expectCurrentQualityLevelToBeFalsy(page, closestQuality);
});
