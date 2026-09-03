import { test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden, expectElementsNotHidden } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { loginRequiredPages } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hideMembersOnlyVideos: { bodyClass: rawBodyClass, selectors }
} = hideFeatureSelectors;
const bodyClass = rawBodyClass.replace(/:not\(.*?\)$/, "");

const { channel_home, channel_videos, home, search, watch } = pageTypeRecord;
// The feature declares no includePages, so resolvePageTypes would return all 11 pages; only these fixtures can render the
// rich grid, item-section shelf and lockup markup the selectors target, on the rest the element assertions match nothing.
const testPages: readonly PageType[] = [home, watch, search, channel_home, channel_videos];
// Navigation and reload have no page-specific branch (one body class, no dependencies): one player page and one list page suffice.
const transitionPages: readonly PageType[] = [watch, search];

test.describe("hideMembersOnlyVideos", () => {
	for (const pageType of testPages) {
		test(`hides members only videos on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideMembersOnlyVideos.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
	}

	for (const pageType of transitionPages) {
		test(`hides elements after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideMembersOnlyVideos.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "hideMembersOnlyVideos.enabled");
			await enableFeature(page, "hideMembersOnlyVideos.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`persists hide after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideMembersOnlyVideos.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
	}

	test("re-applies after disable then re-enable on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "hideMembersOnlyVideos.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
		await disableFeature(page, "hideMembersOnlyVideos.enabled");
		await expectBodyWithoutClass(page, bodyClass);
		await expectElementsNotHidden(page, selectors);
		await enableFeature(page, "hideMembersOnlyVideos.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
	});
});
