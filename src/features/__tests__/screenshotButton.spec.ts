import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/screenshotButton/index.metadata";
import { expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { left } = placementRecord;
test.describe("screenshotButton", () => {
	for (const pageType of testPages) {
		test(`should take a screenshot and save as file on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "screenshotButton.button.enabled");
			await setOption(page, "screenshotButton.saveAs", "file");
			await setOption(page, "screenshotButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
			const downloadPromise = page.waitForEvent("download");
			await clickFeatureButton(page, pageType, "yte-feature-screenshotButton-button", left);
			const download = await downloadPromise;
			expect(download).toBeTruthy();
		});
		test(`should take a screenshot and copy it to the clipboard on ${pageType}`, async ({ page }) => {
			page.on("dialog", (dialog) => {
				void (async () => {
					await dialog.accept();
				})();
			});
			const screenshotFormat = "png";
			await navigateToPageType(page, pageType);
			await enableFeature(page, "screenshotButton.button.enabled");
			await setOption(page, "screenshotButton.saveAs", "clipboard");
			await setOption(page, "screenshotButton.format", screenshotFormat);
			await setOption(page, "screenshotButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-screenshotButton-button", left);
			await expect(page.getByText("Screenshot copied to clipboard")).toBeVisible();
			const copiedToClipboard = page.getByText("Screenshot copied to clipboard");
			await expect(copiedToClipboard).toBeVisible();
			const screenshotCopied = await page.waitForFunction(async (format) => {
				const items = await navigator.clipboard.read();
				return items.some((item) => item.types.includes(`image/${format}`));
			}, screenshotFormat);
			expect(screenshotCopied).toBeTruthy();
		});
		test(`should take a screenshot and save as file and copy to clipboard on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "screenshotButton.button.enabled");
			await setOption(page, "screenshotButton.saveAs", "both");
			await setOption(page, "screenshotButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
			const downloadPromise = page.waitForEvent("download");
			await clickFeatureButton(page, pageType, "yte-feature-screenshotButton-button", left);
			const download = await downloadPromise;
			expect(download).toBeTruthy();
			// Verify clipboard got image data
			const screenshotCopied = await page.waitForFunction(async () => {
				const items = await navigator.clipboard.read();
				return items.some((item) => item.types.some((type) => type.startsWith("image/")));
			});
			expect(await screenshotCopied.jsonValue()).toBeTruthy();
			await expect(page.getByText("Screenshot copied to clipboard")).toBeVisible();
		});
	}
});
