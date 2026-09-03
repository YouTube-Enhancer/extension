import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/monoToStereo/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { right } = placementRecord;
const { watch } = pageTypeRecord;

async function isMonoEnabled(page: Page): Promise<boolean> {
	return await page.evaluate(() => !!window.engine?.monoEnabled);
}

test.describe("monoToStereoButton", () => {
	for (const pageType of testPages) {
		test(`audio should switch to stereo on click on ${pageType}`, async ({ page }) => {
			// videoMeetsCapabilities has no monoAudio case, so the requirement is silently ignored on live; the
			// channel splitter reads channel 0 whatever the source is, so a mono source is not required there.
			await navigateToPageType(page, pageType, pageType === "live" ? [] : ["monoAudio"]);
			await enableFeature(page, "monoToStereoButton.button.enabled");
			await setOption(page, "monoToStereoButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
			const button = page.locator("#yte-feature-monoToStereoButton-button");
			await expect(button).toHaveAttribute("aria-checked", "false");
			await clickFeatureButton(page, pageType, "yte-feature-monoToStereoButton-button", right);
			await expect.poll(async () => await isMonoEnabled(page)).toBeTruthy();
			await expect(button).toHaveAttribute("aria-checked", "true");
		});
	}

	// Neither the toggle nor the button lifecycle branches on live vs VOD, and the live fixture costs up to 120 s.
	test(`audio should toggle back to mono on second click on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["monoAudio"]);
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await setOption(page, "monoToStereoButton.button.placement", right);
		const button = page.locator("#yte-feature-monoToStereoButton-button");
		await clickFeatureButton(page, watch, "yte-feature-monoToStereoButton-button", right);
		await expect.poll(async () => await isMonoEnabled(page)).toBeTruthy();
		await expect(button).toHaveAttribute("aria-checked", "true");
		await clickFeatureButton(page, watch, "yte-feature-monoToStereoButton-button", right);
		await expect.poll(async () => await isMonoEnabled(page)).toBeFalsy();
		await expect(button).toHaveAttribute("aria-checked", "false");
	});

	test(`button should re-appear after disable then re-enable on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["monoAudio"]);
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await setOption(page, "monoToStereoButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
		await disableFeature(page, "monoToStereoButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-monoToStereoButton-button");
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await setOption(page, "monoToStereoButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
	});

	test(`button should persist after full page reload`, async ({ page }) => {
		await navigateToPageType(page, testPages[0], ["monoAudio"]);
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await setOption(page, "monoToStereoButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0], ["monoAudio"]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
	});

	test(`should not create mono to stereo button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-monoToStereoButton-button");
	});
});
