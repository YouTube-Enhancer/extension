import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/copyTimestampUrlButton/index.metadata";
import {
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeTruthy
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, clickFeatureMenuItem, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { ensurePlayerControlsVisible } from "@/src/utils/_tests/pageSetup";
import { freezeAndGetTime, waitForYoutubePlayerReady } from "@/src/utils/_tests/player";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home, watch } = pageTypeRecord;

const { left, menu, right } = placementRecord;

async function getClipboardText(page: Page): Promise<string> {
	return await page.evaluate(async () => await navigator.clipboard.readText());
}

test.describe("copyTimestampUrlButton", () => {
	for (const pageType of testPages) {
		test(`copy timestamp url button should copy timestamp url on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await waitForYoutubePlayerReady(page, pageType);
			const start = await freezeAndGetTime(page, pageType);
			expect(start).not.toBeNull();
			const expectedTimestamp = Math.round(start!);
			await setOption(page, "copyTimestampUrlButton.button.placement", left);
			await enableFeature(page, "copyTimestampUrlButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-copyTimestampUrlButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-copyTimestampUrlButton-button", left);
			// The label is only "Copied" for 1000 ms after the click, so read it before the (slower) clipboard.
			await expect
				.poll(async () => {
					return await page.locator("#yte-feature-copyTimestampUrlButton-button").getAttribute("data-title");
				})
				.toContain("Copied");
			await expect.poll(async () => await getClipboardText(page)).toMatch(new RegExp(`^https:\\/\\/youtu\\.be\\/.+\\?t=${expectedTimestamp}$`));
		});
		test(`copy timestamp url button should restore the button label one second after copying on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "copyTimestampUrlButton.button.placement", left);
			await enableFeature(page, "copyTimestampUrlButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-copyTimestampUrlButton-button");
			const button = page.locator("#yte-feature-copyTimestampUrlButton-button");
			const label = await button.getAttribute("data-title");
			expect(label).not.toBeNull();
			await clickFeatureButton(page, pageType, "yte-feature-copyTimestampUrlButton-button", left);
			await expect.poll(async () => await button.getAttribute("data-title")).toContain("Copied");
			// The button is not a toggle: the click listener restores the original label 1000 ms later.
			await expect.poll(async () => await button.getAttribute("data-title")).toBe(label);
		});
		test(`copy timestamp url button should persist after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "copyTimestampUrlButton.button.placement", left);
			await enableFeature(page, "copyTimestampUrlButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-copyTimestampUrlButton-button");
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-copyTimestampUrlButton-button");
		});
		test(`copy timestamp url button should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "copyTimestampUrlButton.button.placement", left);
			await enableFeature(page, "copyTimestampUrlButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-copyTimestampUrlButton-button");
			await disableFeature(page, "copyTimestampUrlButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-copyTimestampUrlButton-button");
			await enableFeature(page, "copyTimestampUrlButton.button.enabled");
			await setOption(page, "copyTimestampUrlButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-copyTimestampUrlButton-button");
		});
	}

	test(`copy timestamp url button should persist after full page reload`, async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await setOption(page, "copyTimestampUrlButton.button.placement", left);
		await enableFeature(page, "copyTimestampUrlButton.button.enabled");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-copyTimestampUrlButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-copyTimestampUrlButton-button");
	});

	test("copy timestamp url button should copy the timestamp url from the feature menu item on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await waitForYoutubePlayerReady(page, watch);
		const start = await freezeAndGetTime(page, watch);
		expect(start).not.toBeNull();
		const expectedTimestamp = Math.round(start!);
		await setOption(page, "copyTimestampUrlButton.button.placement", menu);
		await enableFeature(page, "copyTimestampUrlButton.button.enabled");
		await expectFeatureMenuItemToBeTruthy(page, "yte-feature-copyTimestampUrlButton-menuitem");
		await clickFeatureMenuItem(page, watch, "yte-feature-copyTimestampUrlButton-menuitem");
		// getFeatureButton resolves to the menu item, so the "Copied!" feedback lands on it instead of a button.
		await expect.poll(async () => await page.locator("#yte-feature-copyTimestampUrlButton-menuitem").getAttribute("data-title")).toContain("Copied");
		await expect.poll(async () => await getClipboardText(page)).toMatch(new RegExp(`^https:\\/\\/youtu\\.be\\/.+\\?t=${expectedTimestamp}$`));
	});

	test("copy timestamp url button should use its configured default placement on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		// The feature overrides the shared buttonField default of feature_menu with the right player controls.
		await enableFeature(page, "copyTimestampUrlButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-copyTimestampUrlButton-button", right);
	});

	test("copy timestamp url button should keep working after an in-page navigation on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "copyTimestampUrlButton.button.placement", left);
		await enableFeature(page, "copyTimestampUrlButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-copyTimestampUrlButton-button", left);
		await spaNavigateToRelatedVideo(page);
		await expectFeatureButtonToBeIn(page, "yte-feature-copyTimestampUrlButton-button", left);
		const videoId = new URL(page.url()).searchParams.get("v");
		expect(videoId).toBeTruthy();
		// The re-added button must copy the video that is playing now, not the one the page started on.
		await clickFeatureButton(page, watch, "yte-feature-copyTimestampUrlButton-button", left);
		await expect.poll(async () => await getClipboardText(page)).toContain(`https://youtu.be/${videoId}?t=`);
	});

	test("copy timestamp url button should show Copied! in its hover tooltip and drop it a second later on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "copyTimestampUrlButton.button.placement", right);
		await enableFeature(page, "copyTimestampUrlButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-copyTimestampUrlButton-button", right);
		const button = page.locator("#yte-feature-copyTimestampUrlButton-button");
		const label = await button.getAttribute("data-title");
		expect(label).toBeTruthy();
		await ensurePlayerControlsVisible(page, watch);
		await button.hover();
		const tooltip = page.locator("#yte-feature-copyTimestampUrlButton-tooltip");
		await expect(tooltip).toHaveText(label!);
		// Click without moving the pointer off the button, so the feature updates the tooltip that is already open.
		await button.click();
		await expect(tooltip).toHaveText("Copied!");
		// The click listener removes the tooltip and restores the label 1000 ms later.
		await expect(tooltip).not.toBeAttached();
		await expect(button).toHaveAttribute("data-title", label!);
	});

	test(`copy timestamp url button should not be present on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "copyTimestampUrlButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-copyTimestampUrlButton-button");
	});
});
