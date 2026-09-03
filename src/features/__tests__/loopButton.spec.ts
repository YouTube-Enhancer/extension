import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/loopButton/index.metadata";
import {
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeTruthy,
	expectToggleButtonState,
	expectToStay
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, clickFeatureMenuItem, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";
const { left, menu, right } = placementRecord;
const { home, live, watch } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
test.describe("loopButton", () => {
	for (const pageType of testPages) {
		test("loop button should be disabled", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "loopButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-loopButton-button");
		});
		test("loop stays enabled on the video when the loop button is removed", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "loopButton.button.enabled");
			await setOption(page, "loopButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-loopButton-button", left);
			await expect(page.locator("div#movie_player video")).toHaveJSProperty("loop", true);
			await disableFeature(page, "loopButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-loopButton-button");
			// remove() only detaches the button and its listeners, it never resets the video's loop attribute.
			await expect(page.locator("div#movie_player video")).toHaveJSProperty("loop", true);
		});
		test("loop should toggle off when clicking the loop button again", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "loopButton.button.enabled");
			await setOption(page, "loopButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
			await expectToggleButtonState(page, "yte-feature-loopButton-button", false, { title: "Loop off" });
			const offIcon = await getLoopButtonIcon(page);
			expect(offIcon).toBeTruthy();
			// Enable loop
			await clickFeatureButton(page, pageType, "yte-feature-loopButton-button", left);
			await expect(page.locator("div#movie_player video")).toHaveJSProperty("loop", true);
			await expectToggleButtonState(page, "yte-feature-loopButton-button", true, { title: "Loop on" });
			await expect.poll(async () => await getLoopButtonIcon(page)).not.toBe(offIcon);
			// Disable loop
			await clickFeatureButton(page, pageType, "yte-feature-loopButton-button", left);
			await expect(page.locator("div#movie_player video")).toHaveJSProperty("loop", false);
			await expectToggleButtonState(page, "yte-feature-loopButton-button", false, { title: "Loop off" });
			await expect.poll(async () => await getLoopButtonIcon(page)).toBe(offIcon);
		});
		test("loop button icon should follow the loop attribute when it is changed outside the extension", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "loopButton.button.enabled");
			await setOption(page, "loopButton.button.placement", left);
			await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", left);
			const offIcon = await getLoopButtonIcon(page);
			expect(offIcon).toBeTruthy();
			// Looping can be turned on from YouTube's own context menu, which the feature only sees through its observer.
			await setVideoLoopAttribute(page, true);
			await expect.poll(async () => await getLoopButtonIcon(page)).not.toBe(offIcon);
			await setVideoLoopAttribute(page, false);
			await expect.poll(async () => await getLoopButtonIcon(page)).toBe(offIcon);
		});
		test("loop button should persist after navigation", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "loopButton.button.enabled");
			await setOption(page, "loopButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
		});
		test("loop button should persist after full page reload", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "loopButton.button.enabled");
			await setOption(page, "loopButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
			await page.reload();
			await navigateToPageType(page, pageType);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
		});
	}

	test(`should not create loop button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "loopButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-loopButton-button");
	});

	test.describe("button placement", () => {
		for (const placement of [left, right] as const) {
			test(`should render button in ${placement}`, async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "loopButton.button.placement", placement);
				await enableFeature(page, "loopButton.button.enabled");
				await expectFeatureButtonToBeTruthy(page, "yte-feature-loopButton-button");
				await expectFeatureButtonToBeIn(page, "yte-feature-loopButton-button", placement);
			});
		}

		test("should render button in feature menu", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "loopButton.button.placement", "feature_menu");
			await enableFeature(page, "loopButton.button.enabled");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-loopButton-menuitem");
		});

		test("loop should toggle on and off from the feature menu item", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "loopButton.button.placement", menu);
			await enableFeature(page, "loopButton.button.enabled");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-loopButton-menuitem");
			const menuItem = page.locator("#yte-feature-loopButton-menuitem");
			await expect(menuItem).toHaveAttribute("aria-checked", "false");
			await clickFeatureMenuItem(page, watch, "yte-feature-loopButton-menuitem");
			await expect(page.locator("div#movie_player video")).toHaveJSProperty("loop", true);
			await expect(menuItem).toHaveAttribute("aria-checked", "true");
			// Clicking the item does not close the menu, so the second toggle can click it directly.
			await menuItem.click();
			await expect(page.locator("div#movie_player video")).toHaveJSProperty("loop", false);
			await expect(menuItem).toHaveAttribute("aria-checked", "false");
		});
	});

	test("loop button should not be created on a live stream", async ({ page }) => {
		await navigateToPageType(page, live);
		await setOption(page, "loopButton.button.placement", left);
		await enableFeature(page, "loopButton.button.enabled");
		// A live /watch URL is classified as the "live" page type, which loopButton does not include.
		await expectToStay(async () => await page.locator("#yte-feature-loopButton-button, #yte-feature-loopButton-menuitem").count(), 0, { page });
	});
});

/** Serialised markup of the svg currently rendered inside the loop button, used to observe the on/off icon swap. */
async function getLoopButtonIcon(page: Page): Promise<null | string> {
	return page.evaluate(() => document.querySelector("#yte-feature-loopButton-button svg")?.outerHTML ?? null);
}
async function setVideoLoopAttribute(page: Page, loop: boolean): Promise<void> {
	await page.evaluate((shouldLoop) => {
		const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
		if (!video) return;
		if (shouldLoop) video.setAttribute("loop", "");
		else video.removeAttribute("loop");
	}, loop);
}
