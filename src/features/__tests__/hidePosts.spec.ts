import type { Page } from "@playwright/test";

import { test } from "playwright.config";

import { metadata } from "@/src/features/hidePosts/index.metadata";
import {
	expectBodyWithClass,
	expectBodyWithoutClass,
	expectElementsHidden,
	expectElementsNotHidden,
	expectToStay
} from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToFirstVideo, spaNavigateToHome } from "@/src/utils/_tests/navigation";
import { loginRequiredPages, resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hidePosts: { bodyClass, selectors }
} = hideFeatureSelectors;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home, watch } = pageTypeRecord;

/** A single read would sample before the feature could have added the class, so hold the expectation for a settle window. */
async function expectBodyClassToStayAbsent(page: Page): Promise<void> {
	await expectToStay(async () => page.evaluate((className) => document.body.classList.contains(className), bodyClass), false, { page });
}

test.describe("hidePosts", () => {
	for (const pageType of testPages) {
		test(`hides posts section on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await expectBodyWithoutClass(page, bodyClass);
			await enableFeature(page, "hidePosts.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
		test(`hides elements after navigation on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hidePosts.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
			// The feature is gated to home by includePages, so leaving the page type must drop the class again.
			await navigateToPageType(page, watch);
			await expectBodyWithoutClass(page, bodyClass, { timeout: 15000 });
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`persists hide after full page reload on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hidePosts.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hidePosts.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
			await disableFeature(page, "hidePosts.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await expectElementsNotHidden(page, selectors);
			await enableFeature(page, "hidePosts.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
	}

	test(`drops the hide class when SPA navigating off home and restores it on return`, async ({ page }) => {
		test.skip(!hasAuthState() && loginRequiredPages.includes(home), `${home} requires login`);
		await navigateToPageType(page, home);
		await enableFeature(page, "hidePosts.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		// In-page navigation drives yt-navigate-start/finish, so the includePages gate is re-evaluated without a document load.
		await spaNavigateToFirstVideo(page);
		await expectBodyWithoutClass(page, bodyClass, { timeout: 15000 });
		await spaNavigateToHome(page);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
	});
	test(`should not hide posts on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "hidePosts.enabled");
		await expectBodyClassToStayAbsent(page);
	});
});
