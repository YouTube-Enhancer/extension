import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/copyTimestampUrlButton/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { freezeAndGetTime, waitForYoutubePlayerReady } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

const { left } = placementRecord;

async function getClipboardText(page: Page): Promise<string> {
	return await page.evaluate(async () => await navigator.clipboard.readText());
}

test.describe("copyTimestampUrlButton", () => {
	for (const pageType of testPages) {
		test(`copy timestamp url button should be enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "copyTimestampUrlButton.button.placement", left);
			await enableFeature(page, "copyTimestampUrlButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-copyTimestampUrlButton-button");
		});
		test(`copy timestamp url button should be disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "copyTimestampUrlButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-copyTimestampUrlButton-button");
		});
		test(`copy timestamp url button should copy timestamp url on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await waitForYoutubePlayerReady(page, pageType);
			const start = await freezeAndGetTime(page, pageType);
			expect(start).toBeTruthy();
			const expectedTimestamp = Math.round(start!);
			await setOption(page, "copyTimestampUrlButton.button.placement", left);
			await enableFeature(page, "copyTimestampUrlButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-copyTimestampUrlButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-copyTimestampUrlButton-button", left);
			await expect.poll(async () => await getClipboardText(page)).toMatch(new RegExp(`^https:\\/\\/youtu\\.be\\/.+\\?t=${expectedTimestamp}$`));
			await expect
				.poll(async () => {
					return await page.locator("#yte-feature-copyTimestampUrlButton-button").getAttribute("data-title");
				})
				.toContain("Copied");
		});
	}
});
