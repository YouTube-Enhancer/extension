import {
	clickFeatureMenuItem,
	disableFeature,
	enableFeature,
	expect,
	expectFeatureMenuItemToBeFalsy,
	expectFeatureMenuItemToBeTruthy,
	navigateToPageType,
	test
} from "playwright.config";

const testPages = ["watch", "live"] as const;

test.describe("maximizePlayerButton", () => {
	for (const pageType of testPages) {
		test(`maximize player button should be enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "maximizePlayerButton.button.enabled");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-maximizePlayerButton-menuitem");
		});
		test(`maximize player button should be disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "maximizePlayerButton.button.enabled");
			await expectFeatureMenuItemToBeFalsy(page, "yte-feature-maximizePlayerButton-menuitem");
		});
		test(`player should be maximized on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "maximizePlayerButton.button.enabled");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-maximizePlayerButton-menuitem");
			await clickFeatureMenuItem(page, "yte-feature-maximizePlayerButton-menuitem");
			const isMaximized = await page.evaluate(() => {
				return document.body.hasAttribute("yte-maximized");
			});
			expect(isMaximized).toBeTruthy();
			expect(isMaximized).toBe(true);
		});
		test(`player shouldn't be maximized on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "maximizePlayerButton.button.enabled");
			const maximizePlayerButton = page.locator(`#yte-feature-maximizePlayerButton-menuitem`);
			await expect(maximizePlayerButton).not.toBeAttached();
			const isMaximized = await page.evaluate(() => {
				return document.body.hasAttribute("yte-maximized");
			});
			expect(isMaximized).toBeFalsy();
		});
	}
});
