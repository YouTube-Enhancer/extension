import type { Page } from "@playwright/test";

import { metadata } from "@/src/features/hideNextButton/index.metadata";
import {
	expectBodyWithClass,
	expectBodyWithoutClass,
	expectElementsHidden,
	expectElementsNotHidden
} from "@/src/utils/_tests/assertions";
import { enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";
import {
	test,
	verifyDefaults,
	verifyNavigationPersistence,
	verifyNonTargetSilence,
	verifyReEnableCycle,
	verifyReloadPersistence
} from "@/tests/harness";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hideNextButton: { bodyClass, selectors }
} = hideFeatureSelectors;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

test.describe("hideNextButton", () => {
	const assertOn = async (page: Page) => {
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
	};
	const assertOff = async (page: Page) => {
		await expectBodyWithoutClass(page, bodyClass);
		await expectElementsNotHidden(page, selectors);
	};
	const subject = { assertOff, assertOn };

	for (const pageType of testPages) {
		test(`hides next button on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideNextButton.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`does not hide next button by default on ${pageType}`, async ({ page }) => {
			await verifyDefaults(page, pageType, subject);
		});
		test(`persists after full page reload on ${pageType}`, async ({ page }) => {
			await verifyReloadPersistence(page, pageType, "hideNextButton", subject);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await verifyReEnableCycle(page, pageType, "hideNextButton", subject);
		});
		test(`hides next button after navigation on ${pageType}`, async ({ page }) => {
			// A genuine in-page navigation to another watch page, so the includePages gate runs through
			// the navigation manager instead of a fresh document load re-running onEnable.
			await verifyNavigationPersistence(page, pageType, "hideNextButton", subject, (navPage) =>
				spaNavigateToRelatedVideo(navPage)
			);
		});
	}

	test(`should not hide next button on non-target page`, async ({ page }) => {
		await verifyNonTargetSilence(page, nonTargetPage!, "hideNextButton", subject);
	});
});
