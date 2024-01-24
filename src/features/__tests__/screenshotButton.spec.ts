import {
	clickFeatureMenuItem,
	disableFeature,
	enableFeature,
	expect,
	expectFeatureMenuItemToBeTruthy,
	getSelected,
	navigateToOptionsPage,
	navigateToYoutubePage,
	selectOption,
	test
} from "playwright.config";

test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});

test("should enable screenshot button", async ({ page }) => {
	await enableFeature(page, "enable_screenshot_button");
});
test("should disable screenshot button", async ({ page }) => {
	await disableFeature(page, "enable_screenshot_button");
});
test("should take a screenshot and save as file", async ({ page }) => {
	await enableFeature(page, "enable_screenshot_button");
	await selectOption(page, "screenshot_save_as", "file");
	await navigateToYoutubePage(page);
	await expectFeatureMenuItemToBeTruthy(page, "yte-feature-screenshotButton-menuitem");
	const downloadPromise = page.waitForEvent("download");
	await clickFeatureMenuItem(page, "yte-feature-screenshotButton-menuitem");
	const download = await downloadPromise;
	expect(download).toBeTruthy();
});
test("should take a screenshot and copy it to the clipboard", async ({ page }) => {
	await enableFeature(page, "enable_screenshot_button");
	await selectOption(page, "screenshot_save_as", "clipboard");
	const screenshotFormat = await getSelected(page, "screenshot_format");
	await navigateToYoutubePage(page);
	await expectFeatureMenuItemToBeTruthy(page, "yte-feature-screenshotButton-menuitem");
	await clickFeatureMenuItem(page, "yte-feature-screenshotButton-menuitem");
	const copiedToClipboard = page.locator("div").getByText("Screenshot copied to clipboard");
	await expect(copiedToClipboard).toBeAttached();
	page.on("dialog", (dialog) => {
		void (async () => {
			await dialog.accept();
		})();
	});
	const screenshotCopied = await page.evaluate(async (screenshotFormat) => {
		const clipboardItems = await navigator.clipboard.read();
		console.log(clipboardItems);
		return clipboardItems.some((item) => item.types.includes(`image/${screenshotFormat}`));
	}, screenshotFormat);
	expect(screenshotCopied).toBeTruthy();
});
