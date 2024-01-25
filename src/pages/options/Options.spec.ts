import { expect, navigateToOptionsPage, test, waitForSelector } from "playwright.config";
// TODO: add tests for missing options
test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});

test("should render YouTube Enhancer settings page", async ({ extensionId, page }) => {
	expect(page.url()).toBe(`chrome-extension://${extensionId}/src/pages/options/index.html`);
	expect(await page.title()).toBe("YouTube Enhancer | Options");
});
test("should render language select", ({ page }) => {
	const languageSelect = waitForSelector(page, "language");
	expect(languageSelect).toBeTruthy();
});
test("should import settings", async ({ page }) => {
	const importSettings = page.locator("#import_settings_button");
	await expect(importSettings).toBeAttached();
	await importSettings.click();
	const importInput = page.locator(`#import_settings_input`);
	await expect(importInput).toBeAttached();
	await importInput.setInputFiles("./tests/test-settings.json");
	const settingsImported = page.locator(`#notifications > div`).getByText("Settings imported successfully");
	await expect(settingsImported).toBeAttached();
});
test("should export settings", async ({ page }) => {
	const exportSettings = page.locator("#export_settings_button");
	await expect(exportSettings).toBeAttached();
	await exportSettings.click();
	const settingsExported = page.locator(`#notifications > div`).getByText("Settings successfully exported");
	await expect(settingsExported).toBeAttached();
});
test("should clear data", async ({ page }) => {
	const clearData = page.locator("#clear_data_button");
	await expect(clearData).toBeAttached();
	page.on("dialog", (dialog) => {
		void (async () => {
			await dialog.accept();
		})();
	});
	await clearData.click();
	const dataCleared = page.locator(`#notifications > div`).getByText("All data has been deleted.");
	await expect(dataCleared).toBeAttached();
});
test("should reset data", async ({ page }) => {
	const resetData = page.locator("#reset_button");
	await expect(resetData).toBeAttached();
	await resetData.click();
	const confirmButton = page.locator("#confirm_button");
	await expect(confirmButton).toBeAttached();
	await confirmButton.click();
	const dataReset = page.locator(`#notifications > div`).getByText("Options saved.").first();
	await expect(dataReset).toBeAttached();
});
