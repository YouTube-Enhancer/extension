import { test } from "playwright.config";

import { metadata } from "@/src/features/hideEndScreenCards/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden, expectElementsNotHidden } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { injectDynamicContent } from "@/src/utils/_tests/dom";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const { home, watch } = pageTypeRecord;

const {
	hideEndScreenCards: { bodyClass, selectors }
} = hideFeatureSelectors;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

test.describe("hideEndScreenCards", () => {
	for (const pageType of testPages) {
		test(`hides end screen cards on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["endScreenCards"]);
			await enableFeature(page, "hideEndScreenCards.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`shows end screen cards when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["endScreenCards"]);
			await disableFeature(page, "hideEndScreenCards.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await page.evaluate(() => {
				const video = document.querySelector("video");
				if (video) video.currentTime = Math.max(0, video.duration - 2);
			});
			await expectElementsNotHidden(page, selectors);
		});
		test(`hides end screen cards after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["endScreenCards"]);
			await enableFeature(page, "hideEndScreenCards.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType, ["endScreenCards"]);
			await disableFeature(page, "hideEndScreenCards.enabled");
			await enableFeature(page, "hideEndScreenCards.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`hides end screen cards on re-enable after disable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["endScreenCards"]);
			await enableFeature(page, "hideEndScreenCards.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await disableFeature(page, "hideEndScreenCards.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await page.evaluate(() => {
				const video = document.querySelector("video");
				if (video) video.currentTime = Math.max(0, video.duration - 2);
			});
			await expectElementsNotHidden(page, selectors);
			await enableFeature(page, "hideEndScreenCards.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`hides dynamically added end screen cards on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["endScreenCards"]);
			await enableFeature(page, "hideEndScreenCards.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
			await injectDynamicContent(page, selectors);
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
	}

	test(`persists hide after full page reload on target pages`, async ({ page }) => {
		await navigateToPageType(page, testPages[0], ["endScreenCards"]);
		await enableFeature(page, "hideEndScreenCards.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
		await page.reload();
		await navigateToPageType(page, testPages[0], ["endScreenCards"]);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
	});

	test(`should not hide end screen cards on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "hideEndScreenCards.enabled");
		await expectBodyWithoutClass(page, bodyClass);
		await expectElementsNotHidden(page, selectors);
	});

	test.describe("feature conflicts", () => {
		test.describe("hideEndScreenCards vs automaticallyShowMoreVideosOnEndScreen", () => {
			test("hideEndScreenCards CSS class is applied when both are enabled on watch", async ({ page }) => {
				await navigateToPageType(page, watch);
				await enableFeature(page, "hideEndScreenCards.enabled");
				await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
				await expectBodyWithClass(page, bodyClass);
			});
		});
	});
});
