import type { Page } from "@playwright/test";

import { metadata } from "@/src/features/hideAutoplayButton/index.metadata";
import {
	expectBodyWithClass,
	expectBodyWithoutClass,
	expectElementsHidden
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
	hideAutoplayButton: { bodyClass, selectors }
} = hideFeatureSelectors;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

/**
 * The extension's hide is keyed entirely off the body class (index.css:
 * `body.yte-hide-autoplay-button .ytp-autonav-toggle { display: none !important }`). So "does not
 * hide by default" is exactly "the body class is absent", and "re-applies after re-enable" is
 * exactly "the class comes back".
 *
 * The previous shape also asserted the button's computed display directly. That measured YouTube's
 * own behaviour, not the extension's: the fixture video plays, so YouTube hides .ytp-autonav-toggle
 * itself once playback starts. Under full-suite load that lands inside the assertion window and the
 * test fails for a reason that has nothing to do with the feature - the reason these two were a
 * recurring load flake. Keying on the body class removes the dependency on YouTube's playback state.
 */
test.describe("hideAutoplayButton", () => {
	const assertOn = async (page: Page) => {
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
	};
	const assertOff = (page: Page) => expectBodyWithoutClass(page, bodyClass);
	const subject = { assertOff, assertOn };

	for (const pageType of testPages) {
		test(`hides autoplay button on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideAutoplayButton.enabled");
			await assertOn(page);
		});
		test(`does not hide autoplay button by default on ${pageType}`, async ({ page }) => {
			await verifyDefaults(page, pageType, subject);
		});
		test(`persists after full page reload on ${pageType}`, async ({ page }) => {
			await verifyReloadPersistence(page, pageType, "hideAutoplayButton", subject);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await verifyReEnableCycle(page, pageType, "hideAutoplayButton", subject);
		});
		test(`hides autoplay button after navigation on ${pageType}`, async ({ page }) => {
			await verifyNavigationPersistence(page, pageType, "hideAutoplayButton", subject, (navPage) =>
				spaNavigateToRelatedVideo(navPage)
			);
		});
	}

	test(`should not hide autoplay button on non-target page`, async ({ page }) => {
		await verifyNonTargetSilence(page, nonTargetPage!, "hideAutoplayButton", subject);
	});
});
