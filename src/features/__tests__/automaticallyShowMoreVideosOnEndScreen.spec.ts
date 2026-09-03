import { test } from "playwright.config";

import { metadata } from "@/src/features/automaticallyShowMoreVideosOnEndScreen/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const { home } = pageTypeRecord;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

test.describe("automaticallyShowMoreVideosOnEndScreen", () => {
	for (const pageType of testPages) {
		test(`should add show more videos classes on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithClass(page, "yte-show-html5-endscreen");
			await expectBodyWithClass(page, "yte-hide-ytp-fullscreen-grid");
		});
		test(`should persist show more videos classes after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithClass(page, "yte-show-html5-endscreen");
			await expectBodyWithClass(page, "yte-hide-ytp-fullscreen-grid");
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithClass(page, "yte-show-html5-endscreen");
			await expectBodyWithClass(page, "yte-hide-ytp-fullscreen-grid");
		});
		test(`persists show more videos classes after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithClass(page, "yte-show-html5-endscreen");
			await expectBodyWithClass(page, "yte-hide-ytp-fullscreen-grid");
			await page.reload();
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, "yte-show-html5-endscreen", { timeout: 15000 });
			await expectBodyWithClass(page, "yte-hide-ytp-fullscreen-grid", { timeout: 15000 });
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithClass(page, "yte-show-html5-endscreen");
			await expectBodyWithClass(page, "yte-hide-ytp-fullscreen-grid");
			await disableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithoutClass(page, "yte-show-html5-endscreen");
			await expectBodyWithoutClass(page, "yte-hide-ytp-fullscreen-grid");
			await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithClass(page, "yte-show-html5-endscreen");
			await expectBodyWithClass(page, "yte-hide-ytp-fullscreen-grid");
		});
	}

	test(`should not add show more videos classes on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
		await expectBodyWithoutClass(page, "yte-show-html5-endscreen");
		await expectBodyWithoutClass(page, "yte-hide-ytp-fullscreen-grid");
	});
});
