import { test } from "playwright.config";

import type { pageTypeRecord } from "@/src/utils/_tests/constants";

import { expectBodyWithClass, expectBodyWithoutClass } from "@/src/utils/_tests/assertions";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";

const bodyClass = "yte-sharp-corners";
const testPages: (keyof typeof pageTypeRecord)[] = ["watch", "home"];

test.describe("sharpCorners", () => {
	for (const pageType of testPages) {
		test(`adds body class when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "sharpCorners.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		});
		test(`does not add body class by default on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await expectBodyWithoutClass(page, bodyClass);
		});
		test(`persists after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "sharpCorners.enabled");
			await expectBodyWithClass(page, bodyClass);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "sharpCorners.enabled");
			await expectBodyWithClass(page, bodyClass);
			await disableFeature(page, "sharpCorners.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await enableFeature(page, "sharpCorners.enabled");
			await expectBodyWithClass(page, bodyClass);
		});
	}
	// All pages: the feature declares no includePages, so the case is the effect surviving an SPA
	// navigation rather than re-arm on a new page type. The body class is the feature's whole effect.
	test("body class should persist after navigation on watch", async ({ page }) => {
		await navigateToPageType(page, "watch");
		await enableFeature(page, "sharpCorners.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		// A genuine in-page navigation to another video, so the navigation manager's yt-navigate
		// listeners run instead of a fresh document load re-running onEnable.
		await spaNavigateToRelatedVideo(page);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
	});
});
