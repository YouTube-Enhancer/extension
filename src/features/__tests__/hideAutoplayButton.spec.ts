import { test } from "playwright.config";

import { metadata } from "@/src/features/hideAutoplayButton/index.metadata";
import {
	expectBodyWithClass,
	expectBodyWithoutClass,
	expectElementsHidden
} from "@/src/utils/_tests/assertions";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

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
	for (const pageType of testPages) {
		test(`hides autoplay button on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideAutoplayButton.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`does not hide autoplay button by default on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await expectBodyWithoutClass(page, bodyClass);
		});
		test(`persists after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideAutoplayButton.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			await expectElementsHidden(page, selectors);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideAutoplayButton.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
			await disableFeature(page, "hideAutoplayButton.enabled");
			await expectBodyWithoutClass(page, bodyClass);
			await enableFeature(page, "hideAutoplayButton.enabled");
			await expectBodyWithClass(page, bodyClass);
			await expectElementsHidden(page, selectors);
		});
		test(`hides autoplay button after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hideAutoplayButton.enabled");
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
			// A genuine in-page navigation to another watch page, so the includePages gate runs through
			// the navigation manager instead of a fresh document load re-running onEnable. The body
			// class is the feature's whole effect; expectElementsHidden is deliberately not repeated
			// because YouTube hides .ytp-autonav-toggle itself once playback starts (see above).
			await spaNavigateToRelatedVideo(page);
			await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		});
	}

	test(`should not hide autoplay button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "hideAutoplayButton.enabled");
		await expectBodyWithoutClass(page, bodyClass);
	});
});
