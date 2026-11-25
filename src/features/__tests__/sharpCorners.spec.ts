import type { Page } from "@playwright/test";

import type { pageTypeRecord } from "@/src/utils/_tests/constants";

import { expectBodyWithClass, expectBodyWithoutClass } from "@/src/utils/_tests/assertions";
import { enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import {
	test,
	verifyDefaults,
	verifyNavigationPersistence,
	verifyReEnableCycle,
	verifyReloadPersistence
} from "@/tests/harness";

const bodyClass = "yte-sharp-corners";
const testPages: (keyof typeof pageTypeRecord)[] = ["watch", "home"];

test.describe("sharpCorners", () => {
	const assertOn = (page: Page) => expectBodyWithClass(page, bodyClass, { timeout: 15000 });
	const assertOff = (page: Page) => expectBodyWithoutClass(page, bodyClass);
	const subject = { assertOff, assertOn };

	for (const pageType of testPages) {
		test(`adds body class when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "sharpCorners.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		});
		test(`does not add body class by default on ${pageType}`, async ({ page }) => {
			await verifyDefaults(page, pageType, subject);
		});
		test(`persists after full page reload on ${pageType}`, async ({ page }) => {
			await verifyReloadPersistence(page, pageType, "sharpCorners", subject);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await verifyReEnableCycle(page, pageType, "sharpCorners", subject);
		});
	}
	// All pages: the feature declares no includePages, so the case is the effect surviving an SPA
	// navigation rather than re-arm on a new page type. The body class is the feature's whole effect.
	test("body class should persist after navigation on watch", async ({ page }) => {
		// A genuine in-page navigation to another video, so the navigation manager's yt-navigate
		// listeners run instead of a fresh document load re-running onEnable.
		await verifyNavigationPersistence(page, "watch", "sharpCorners", subject, (navPage) =>
			spaNavigateToRelatedVideo(navPage)
		);
	});
});
