import { expect, test } from "playwright.config";

import { expectFeatureMenuItemToBeFalsy, expectFeatureMenuItemToBeTruthy } from "@/src/utils/_tests/assertions";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

const watchPage = "watch" as const;
test.describe("featureMenu", () => {
	test("feature menu should be enabled", async ({ page }) => {
		await navigateToPageType(page, watchPage);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.button.placement", "feature_menu");
		const featureMenuButton = page.locator("#yte-feature-menu-button");
		await expect(featureMenuButton).toBeAttached();
	});
	test("feature menu should be disabled", async ({ page }) => {
		await navigateToPageType(page, watchPage);
		await disableFeature(page, "screenshotButton.button.enabled");
		const featureMenuButton = page.locator("#yte-feature-menu-button");
		await expect(featureMenuButton).not.toBeVisible();
	});
	test("should add feature menu item to feature menu", async ({ page }) => {
		await navigateToPageType(page, watchPage);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.button.placement", "feature_menu");
		await expectFeatureMenuItemToBeTruthy(page, "yte-feature-screenshotButton-menuitem");
	});
	test("feature menu should open when button is clicked", async ({ page }) => {
		await navigateToPageType(page, watchPage);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.button.placement", "feature_menu");
		const featureMenuButton = page.locator("#yte-feature-menu-button");
		await expect(featureMenuButton).toBeAttached();
		await featureMenuButton.click();
		const featureMenu = page.locator("#yte-feature-menu");
		await expect(featureMenu).toBeVisible();
	});
	test("feature menu item should be added when feature enabled and removed when disabled", async ({ page }) => {
		await navigateToPageType(page, watchPage);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.button.placement", "feature_menu");
		await expectFeatureMenuItemToBeTruthy(page, "yte-feature-screenshotButton-menuitem");
		await disableFeature(page, "screenshotButton.button.enabled");
		await expectFeatureMenuItemToBeFalsy(page, "yte-feature-screenshotButton-menuitem");
	});
	test("feature menu should close when button is clicked again", async ({ page }) => {
		await navigateToPageType(page, watchPage);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.button.placement", "feature_menu");
		const featureMenuButton = page.locator("#yte-feature-menu-button");
		await expect(featureMenuButton).toBeAttached();
		// Open the menu
		await featureMenuButton.click();
		const featureMenu = page.locator("#yte-feature-menu");
		await expect(featureMenu).toBeVisible();
		// Close the menu
		await featureMenuButton.click();
		await expect(featureMenu).not.toBeVisible();
	});
});
