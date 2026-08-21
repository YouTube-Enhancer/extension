import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/screenshotButton/index.metadata";
import {
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeTruthy
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { toggleFullscreen } from "@/src/utils/_tests/fullscreen";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { left, right } = placementRecord;
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
			page.on("dialog", (dialog) => {
				void (async () => {
					await dialog.accept();
				})();
			});
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
			await expect(page.getByText("Screenshot copied to clipboard")).toBeVisible();
			const screenshotCopied = await page.waitForFunction(async () => {
				const items = await navigator.clipboard.read();
				return items.some((item) => item.types.some((type) => type.startsWith("image/")));
			});
			expect(await screenshotCopied.jsonValue()).toBeTruthy();
		});
		test(`screenshot button should not be present when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-screenshotButton-button");
		});
		test(`screenshot button should persist after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "screenshotButton.button.enabled");
			await setOption(page, "screenshotButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
		});
		test(`screenshot button should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "screenshotButton.button.enabled");
			await setOption(page, "screenshotButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
			await disableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-screenshotButton-button");
			await enableFeature(page, "screenshotButton.button.enabled");
			await setOption(page, "screenshotButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
		});
	}

	test(`screenshot button should persist after full page reload`, async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
	});

	test(`should not create screenshot button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "screenshotButton.button.enabled");
		await expect(page.locator("#yte-feature-screenshotButton-button")).not.toBeAttached();
	});

	test.describe("button placement", () => {
		for (const placement of [left, right] as const) {
			test(`should render button in ${placement}`, async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "screenshotButton.button.placement", placement);
				await enableFeature(page, "screenshotButton.button.enabled");
				await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
				await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", placement);
			});
		}

		test("should render button in feature menu", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "screenshotButton.button.placement", "feature_menu");
			await enableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-screenshotButton-menuitem");
		});
	});

	test.describe("fullscreen transition", () => {
		test("should move button from left to right on fullscreen enter/exit", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "screenshotButton.button.placement", left);
			await setOption(page, "screenshotButton.button.fullscreenPlacement", right);
			await enableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", left);
		});

		test("should not move button when fullscreenPlacement is same", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "screenshotButton.button.placement", right);
			await setOption(page, "screenshotButton.button.fullscreenPlacement", "same");
			await enableFeature(page, "screenshotButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", right);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-screenshotButton-button", right);
		});
	});
});
