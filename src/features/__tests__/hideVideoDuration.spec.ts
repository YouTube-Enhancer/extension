import type { Page } from "@playwright/test";

import { metadata } from "@/src/features/hideVideoDuration/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass } from "@/src/utils/_tests/assertions";
import { enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
import {
	test,
	verifyDefaults,
	verifyNavigationPersistence,
	verifyReEnableCycle,
	verifyReloadPersistence
} from "@/tests/harness";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hideVideoDuration: { bodyClass }
} = hideFeatureSelectors;
// Live streams don't have duration overlays, so exclude live from test pages.
const testPages = resolvePageTypes(metadata.dependencies?.includePages).filter((p) => p !== "live");

test.describe("hideVideoDuration", () => {
	const assertOn = (page: Page) => expectBodyWithClass(page, bodyClass, { timeout: 15000 });
	const assertOff = (page: Page) => expectBodyWithoutClass(page, bodyClass);
	const subject = { assertOff, assertOn };

	for (const pageType of testPages) {
		test(`adds body class when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideVideoDuration.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		});
		test(`does not have body class by default on ${pageType}`, async ({ page }) => {
			await verifyDefaults(page, pageType, subject);
		});
		test(`persists after full page reload on ${pageType}`, async ({ page }) => {
			await verifyReloadPersistence(page, pageType, "hideVideoDuration", subject);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await verifyReEnableCycle(page, pageType, "hideVideoDuration", subject);
		});
	}
	// All pages: the feature declares no includePages, so the case is the effect surviving an SPA
	// navigation rather than re-arm on a new page type. The body class is the feature's whole effect.
	test("body class should persist after navigation on watch", async ({ page }) => {
		await verifyNavigationPersistence(page, "watch", "hideVideoDuration", subject, (navPage) =>
			spaNavigateToRelatedVideo(navPage)
		);
	});
});
