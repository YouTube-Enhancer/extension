import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/maximizePlayerButton/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeIn, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { left } = placementRecord;
const { home, watch } = pageTypeRecord;
test.describe("maximizePlayerButton", () => {
	for (const pageType of testPages) {
		test(`maximize player button should be enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "maximizePlayerButton.button.placement", left);
			await enableFeature(page, "maximizePlayerButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
		});
		test(`player should be maximized on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "maximizePlayerButton.button.placement", left);
			await enableFeature(page, "maximizePlayerButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-maximizePlayerButton-button", left);
			await expect(page.locator("body")).toHaveAttribute("yte-maximized");
		});
		test(`maximize player button should persist after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "maximizePlayerButton.button.placement", left);
			await enableFeature(page, "maximizePlayerButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
		});
	}

	// maximizePlayer/minimizePlayer only branch on theater mode and the new layout, never on live vs VOD, so this only runs on watch.
	test(`clicking maximize button again should un-maximize player on watch`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
		await clickFeatureButton(page, watch, "yte-feature-maximizePlayerButton-button", left);
		await expect(page.locator("body")).toHaveAttribute("yte-maximized");
		await clickFeatureButton(page, watch, "yte-feature-maximizePlayerButton-button", left);
		await expect(page.locator("body")).not.toHaveAttribute("yte-maximized");
	});

	// The enable/disable transition goes through featureButtonManager with no page-dependent code, so this only runs on watch.
	test(`maximize player button should re-appear after disable then re-enable on watch`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
		await disableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-maximizePlayerButton-button");
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
	});

	test(`maximize player button should persist after full page reload`, async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await setOption(page, "maximizePlayerButton.button.placement", left);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-maximizePlayerButton-button");
	});

	test(`should not create maximize player button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "maximizePlayerButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-maximizePlayerButton-button");
	});

	test.describe("feature conflicts", () => {
		test.describe("automaticallyMaximizePlayer vs automaticTheaterMode", () => {
			test("maximize is active when enabled after theater on watch", async ({ page }) => {
				await navigateToPageType(page, watch);
				await enableFeature(page, "automaticTheaterMode.enabled");
				await enableFeature(page, "automaticallyMaximizePlayer.enabled");
				await expect.poll(async () => await page.evaluate(() => document.body.hasAttribute("yte-maximized"))).toBeTruthy();
			});

			test("theater mode is active when enabled after maximize on watch", async ({ page }) => {
				await navigateToPageType(page, watch);
				await enableFeature(page, "automaticallyMaximizePlayer.enabled");
				await enableFeature(page, "automaticTheaterMode.enabled");
				await expect
					.poll(
						async () =>
							await page.evaluate(() => {
								const flexy = document.querySelector("ytd-watch-flexy");
								const grid = document.querySelector("ytd-watch-grid");
								return flexy?.hasAttribute("theater") || grid?.hasAttribute("theater");
							}),
						{ timeout: 15000 }
					)
					.toBeTruthy();
			});
		});
	});

	test.describe("automatic maximize state sync", () => {
		test("reflects automatic maximization in the button state on watch", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "maximizePlayerButton.button.placement", left);
			await enableFeature(page, "maximizePlayerButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-maximizePlayerButton-button", left);
			const button = page.locator("#yte-feature-maximizePlayerButton-button");
			await expect(button).not.toHaveAttribute("aria-checked", "true");
			const offTitle = await button.getAttribute("data-title");
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect(page.locator("body")).toHaveAttribute("yte-maximized", { timeout: 15000 });
			await expect(button).toHaveAttribute("aria-checked", "true");
			await expect.poll(async () => button.getAttribute("data-title")).not.toBe(offTitle);
		});
		test("keeps the cued thumbnail overlay above the maximized video on watch", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "automaticallyMaximizePlayer.enabled");
			await expect(page.locator("body")).toHaveAttribute("yte-maximized", { timeout: 15000 });
			const overlay = page.locator("#movie_player .ytp-cued-thumbnail-overlay");
			await expect(overlay).toBeAttached();
			await expect(overlay).toHaveCSS("z-index", "1");
		});
	});
});
