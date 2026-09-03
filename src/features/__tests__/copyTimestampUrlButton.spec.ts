import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/copyTimestampUrlButton/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { freezeAndGetTime, waitForYoutubePlayerReady } from "@/src/utils/_tests/player";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home } = pageTypeRecord;

const { left } = placementRecord;

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

	test(`copy timestamp url button should not be present on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "copyTimestampUrlButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-copyTimestampUrlButton-button");
	});
});
