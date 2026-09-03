import type { Page } from "@playwright/test";

import { test } from "playwright.config";

import { metadata } from "@/src/features/hideTranslateComment/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden, expectElementsNotHidden } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import {
	navigateToPageType,
	spaNavigateBack,
	spaNavigateToFirstVideo,
	spaNavigateToHome,
	spaNavigateToRelatedVideo
} from "@/src/utils/_tests/navigation";
import { loginRequiredPages, resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hideTranslateComment: { bodyClass, selectors }
} = hideFeatureSelectors;

const { channel_videos: channelVideos, home, watch } = pageTypeRecord;

const injectedTranslateButtonSelector = "#yte-test-translate-button-host ytd-tri-state-button-view-model.translate-button";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

/**
 * The real translate button only renders for comments written in another language, so the selector assertions
 * would otherwise iterate over zero elements and assert nothing. Injecting one makes the check deterministic.
 */
async function injectTranslateButton(page: Page): Promise<void> {
	await page.evaluate(() => {
		const host = document.createElement("div");
		host.id = "yte-test-translate-button-host";
		host.innerHTML = `<ytd-tri-state-button-view-model class="translate-button">Translate to English</ytd-tri-state-button-view-model>`;
		document.body.appendChild(host);
	});
}

test.describe("hideTranslateComment", () => {
	for (const pageType of testPages) {
		test(`hides translate comment button on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideTranslateComment.enabled");
			await expectBodyWithClass(page, bodyClass);
			await injectTranslateButton(page);
			await expectElementsHidden(page, selectors, { requireMatch: true });
		});
		test(`shows translate comment button when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "hideTranslateComment.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await injectTranslateButton(page);
			// Scoped to the injected button: real translate buttons can be display:none for YouTube's own reasons.
			await expectElementsNotHidden(page, [injectedTranslateButtonSelector], { requireMatch: true });
		});
		test(`hides translate comment after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideTranslateComment.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			// A genuine in-page navigation, so featureOrchestrator.updateFeatureOnNavigation runs instead of a fresh document load.
			await spaNavigateToRelatedVideo(page);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		});
		test(`persists hide after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideTranslateComment.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideTranslateComment.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
			await disableFeature(page, "hideTranslateComment.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await expectElementsNotHidden(page, selectors);
			await enableFeature(page, "hideTranslateComment.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
	}

	test(`drops the hide class when SPA navigating off ${watch} and restores it on return`, async ({ page }) => {
		test.skip(!hasAuthState() && loginRequiredPages.includes(home), `the in-page hop lands on ${home}, which requires login`);
		await navigateToPageType(page, watch);
		await enableFeature(page, "hideTranslateComment.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		// Leaving watch in-page must run the includePages gate, otherwise the class stays and hides translate buttons elsewhere.
		await spaNavigateToHome(page);
		await expectBodyWithoutClass(page, bodyClass, { timeout: 15000 });
		await spaNavigateBack(page, "watch");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
	});
	test(`applies the hide class when SPA navigating from ${channelVideos} to a watch page`, async ({ page }) => {
		await navigateToPageType(page, channelVideos);
		await enableFeature(page, "hideTranslateComment.enabled");
		// The feature is gated to watch, so nothing is applied while the channel page is showing.
		await expectBodyWithoutClass(page, bodyClass);
		// Arriving at watch without a document load is the only path that goes through updateFeatureOnNavigation.
		await spaNavigateToFirstVideo(page);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await injectTranslateButton(page);
		await expectElementsHidden(page, selectors, { requireMatch: true });
	});
	test(`should not hide translate comment on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "hideTranslateComment.enabled");
		await expectBodyWithoutClass(page, bodyClass);
		await expectElementsNotHidden(page, selectors);
	});
});
