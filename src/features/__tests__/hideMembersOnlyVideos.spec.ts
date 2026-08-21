import { test } from "playwright.config";

import { metadata } from "@/src/features/hideMembersOnlyVideos/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden, expectElementsNotHidden } from "@/src/utils/_tests/assertions";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { loginRequiredPages, resolvePageTypes } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hideMembersOnlyVideos: { bodyClass: rawBodyClass, selectors }
} = hideFeatureSelectors;
const bodyClass = rawBodyClass.replace(/:not\(.*?\)$/, "");

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("hideMembersOnlyVideos", () => {
	for (const pageType of testPages) {
		test(`hides members only videos on ${pageType}`, async ({ page }) => {
			test.skip(loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideMembersOnlyVideos.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
		test(`shows members only videos when disabled on ${pageType}`, async ({ page }) => {
			test.skip(loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "hideMembersOnlyVideos.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await expectElementsNotHidden(page, selectors);
		});
	}
});
