import { test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden, expectElementsNotHidden } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { hasAnyMatch } from "@/src/utils/_tests/dom";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { loginRequiredPages } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hidePlayables: { bodyClass, selectors }
} = hideFeatureSelectors;

const { home, watch } = pageTypeRecord;
// The feature declares no includePages, so resolvePageTypes would return all 11 pages; the CSS only matches home-feed markup,
// so home carries the behaviour and watch is kept as a second page to prove the body class is not home-only.
const testPages: readonly PageType[] = [home, watch];

test.describe("hidePlayables", () => {
	for (const pageType of testPages) {
		test(`hides playables section on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
			await navigateToPageType(page, pageType);
			await enableFeature(page, "hidePlayables.enabled");
			await expectBodyWithClass(page, bodyClass);
			// The playables shelf is only served on some home feeds; without it the display assertion below would
			// iterate over nothing and pass without checking anything.
			test.skip(!(await hasAnyMatch(page, selectors)), "fixture has no playables shelf");
			await expectElementsHidden(page, selectors, { requireMatch: true });
		});
	}

	// onEnable/onDisable only add/remove a body class and no page gating exists, so the remaining cycles run on home only.
	test("shows playables section when disabled on home", async ({ page }) => {
		test.skip(!hasAuthState(), "home requires login");
		await navigateToPageType(page, home);
		await disableFeature(page, "hidePlayables.enabled");
		await expectBodyWithoutClass(page, bodyClass);
		await expectElementsNotHidden(page, selectors);
	});
	test("persists hide after full page reload on home", async ({ page }) => {
		test.skip(!hasAuthState(), "home requires login");
		await navigateToPageType(page, home);
		await enableFeature(page, "hidePlayables.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
		await page.reload();
		await navigateToPageType(page, home);
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
	});
	test("re-applies after disable then re-enable on home", async ({ page }) => {
		test.skip(!hasAuthState(), "home requires login");
		await navigateToPageType(page, home);
		await enableFeature(page, "hidePlayables.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
		await disableFeature(page, "hidePlayables.enabled");
		await expectBodyWithoutClass(page, bodyClass);
		await expectElementsNotHidden(page, selectors);
		await enableFeature(page, "hidePlayables.enabled");
		await expectBodyWithClass(page, bodyClass);
		await expectElementsHidden(page, selectors);
	});
});
