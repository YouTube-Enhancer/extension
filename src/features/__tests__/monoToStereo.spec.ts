import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/monoToStereo/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { right } = placementRecord;

async function isMonoEnabled(page: Page): Promise<boolean> {
	return await page.evaluate(() => !!window.engine?.monoEnabled);
}

test.describe("monoToStereoButton", () => {
	for (const pageType of testPages) {
		test(`button should be enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["monoAudio"]);
			await enableFeature(page, "monoToStereoButton.button.enabled");
			await setOption(page, "monoToStereoButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
			await expect.poll(async () => await isMonoEnabled(page)).toBeFalsy();
		});
		test(`button should be disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["monoAudio"]);
			await disableFeature(page, "monoToStereoButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-monoToStereoButton-button");
		});
		test(`audio should switch to stereo on click on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["monoAudio"]);
			await enableFeature(page, "monoToStereoButton.button.enabled");
			await setOption(page, "monoToStereoButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-monoToStereoButton-button", right);
			await expect.poll(async () => await isMonoEnabled(page)).toBeTruthy();
		});
		test(`audio should toggle back to mono on second click on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["monoAudio"]);
			await enableFeature(page, "monoToStereoButton.button.enabled");
			await setOption(page, "monoToStereoButton.button.placement", right);
			await clickFeatureButton(page, pageType, "yte-feature-monoToStereoButton-button", right);
			await clickFeatureButton(page, pageType, "yte-feature-monoToStereoButton-button", right);
			await expect.poll(async () => await isMonoEnabled(page)).toBeFalsy();
		});
	}
});
