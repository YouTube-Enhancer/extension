import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/screenshotButton/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { left } = placementRecord;
const { home, watch } = pageTypeRecord;
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
	}

	// The remaining screenshot and lifecycle paths are page-agnostic and the live fixture costs up to 120 s,
	// so they run on watch only; live stays covered by the save-as-file smoke case above.
	test(`should take a screenshot and copy it to the clipboard on ${watch}`, async ({ page }) => {
		page.on("dialog", (dialog) => {
			void (async () => {
				await dialog.accept();
			})();
		});
		const screenshotFormat = "png";
		await navigateToPageType(page, watch);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.saveAs", "clipboard");
		await setOption(page, "screenshotButton.format", screenshotFormat);
		await setOption(page, "screenshotButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
		await clickFeatureButton(page, watch, "yte-feature-screenshotButton-button", left);
		await expect(page.getByText("Screenshot copied to clipboard")).toBeVisible();
		const copiedToClipboard = page.getByText("Screenshot copied to clipboard");
		await expect(copiedToClipboard).toBeVisible();
		const screenshotCopied = await page.waitForFunction(async (format) => {
			const items = await navigator.clipboard.read();
			return items.some((item) => item.types.includes(`image/${format}`));
		}, screenshotFormat);
		expect(screenshotCopied).toBeTruthy();
	});

	test(`should take a screenshot and save as file and copy to clipboard on ${watch}`, async ({ page }) => {
		page.on("dialog", (dialog) => {
			void (async () => {
				await dialog.accept();
			})();
		});
		await navigateToPageType(page, watch);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.saveAs", "both");
		await setOption(page, "screenshotButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
		const downloadPromise = page.waitForEvent("download");
		await clickFeatureButton(page, watch, "yte-feature-screenshotButton-button", left);
		const download = await downloadPromise;
		expect(download).toBeTruthy();
		// Verify clipboard got image data
		await expect(page.getByText("Screenshot copied to clipboard")).toBeVisible();
		const screenshotCopied = await page.waitForFunction(async () => {
			const items = await navigator.clipboard.read();
			return items.some((item) => item.types.some((type) => type.startsWith("image/")));
		});
		expect(await screenshotCopied.jsonValue()).toBeTruthy();
	});

	test(`screenshot button should persist after navigation on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
	});

	test(`screenshot button should re-appear after disable then re-enable on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
		await disableFeature(page, "screenshotButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-screenshotButton-button");
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
	});

	test(`should not create screenshot button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "screenshotButton.button.enabled");
		await expect(page.locator("#yte-feature-screenshotButton-button")).not.toBeAttached();
	});
});
