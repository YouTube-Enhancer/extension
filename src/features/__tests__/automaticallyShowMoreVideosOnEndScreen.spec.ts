import { test } from "playwright.config";

import { metadata } from "@/src/features/automaticallyShowMoreVideosOnEndScreen/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass } from "@/src/utils/_tests/assertions";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("automaticallyShowMoreVideosOnEndScreen", () => {
	for (const pageType of testPages) {
		test(`should add show more videos classes on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithClass(page, "yte-show-html5-endscreen");
			await expectBodyWithClass(page, "yte-hide-ytp-fullscreen-grid");
		});
		test(`should remove show more videos classes when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "automaticallyShowMoreVideosOnEndScreen.enabled");
			await expectBodyWithoutClass(page, "yte-show-html5-endscreen");
			await expectBodyWithoutClass(page, "yte-hide-ytp-fullscreen-grid");
		});
	}
});
