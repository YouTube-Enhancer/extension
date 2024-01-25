import {
	enableFeature,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy,
	navigateToOptionsPage,
	navigateToYoutubePage,
	selectOption,
	test
} from "playwright.config";
test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});
// TODO: code tests for button placements
test("should place button in left controls", async ({ page }) => {
	await selectOption(page, "button_placements.screenshotButton", "player_controls_left");
	await enableFeature(page, "enable_screenshot_button");
	await navigateToYoutubePage(page);
	await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
	await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", "player_controls_left");
});
test("should place button in right controls", async ({ page }) => {
	await selectOption(page, "button_placements.screenshotButton", "player_controls_right");
	await enableFeature(page, "enable_screenshot_button");
	await navigateToYoutubePage(page);
	await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
	await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", "player_controls_right");
});
test("should place button below player", async ({ page }) => {
	await selectOption(page, "button_placements.screenshotButton", "below_player");
	await enableFeature(page, "enable_screenshot_button");
	await navigateToYoutubePage(page);
	await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
	await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", "below_player");
});
