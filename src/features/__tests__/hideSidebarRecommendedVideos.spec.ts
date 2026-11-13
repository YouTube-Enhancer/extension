import type { Page } from "@playwright/test";

import { metadata } from "@/src/features/hideSidebarRecommendedVideos/index.metadata";
import {
	expectBodyWithClass,
	expectBodyWithoutClass,
	expectElementsHidden,
	expectElementsNotHidden,
	expectToStay
} from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { enableFeature } from "@/src/utils/_tests/features";
import {
	navigateToPageType,
	spaNavigateBack,
	spaNavigateToHome
} from "@/src/utils/_tests/navigation";
import {
	loginRequiredPages,
	resolveNonTargetPage,
	resolvePageTypes
} from "@/src/utils/_tests/utils";
import {
	test,
	verifyNavigationPersistence,
	verifyNonTargetSilence,
	verifyReEnableCycle,
	verifyReloadPersistence
} from "@/tests/harness";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const {
	hideSidebarRecommendedVideos: { bodyClass, selectors }
} = hideFeatureSelectors;

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home, live, watch } = pageTypeRecord;

test.describe("hideSidebarRecommendedVideos", () => {
	const assertOn = async (page: Page) => {
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
	};
	const assertOff = async (page: Page) => {
		await expectBodyWithoutClass(page, bodyClass);
		await expectElementsNotHidden(page, selectors, { mode: "any" });
	};
	const assertOffClassOnly = (page: Page) => expectBodyWithoutClass(page, bodyClass);
	const subject = { assertOff, assertOn };

	for (const pageType of testPages) {
		test(`hides elements after navigation on ${pageType}`, async ({ page }) => {
			await verifyNavigationPersistence(
				page,
				pageType,
				"hideSidebarRecommendedVideos",
				subject,
				async (navPage) => {
					await navigateToPageType(navPage, home);
					await navigateToPageType(navPage, pageType);
				}
			);
		});
		test(`persists hide after full page reload on ${pageType}`, async ({ page }) => {
			await verifyReloadPersistence(page, pageType, "hideSidebarRecommendedVideos", subject);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await verifyReEnableCycle(page, pageType, "hideSidebarRecommendedVideos", subject);
		});
	}

	test(`drops the hide class when SPA navigating off ${watch} and restores it on return`, async ({
		page
	}) => {
		test.skip(
			!hasAuthState() && loginRequiredPages.includes(home),
			`the in-page hop lands on ${home}, which requires login`
		);
		await navigateToPageType(page, watch);
		await enableFeature(page, "hideSidebarRecommendedVideos.enabled");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
		// In-page navigation drives yt-navigate-start/finish, so the includePages gate is re-evaluated without a document load.
		await spaNavigateToHome(page);
		await expectBodyWithoutClass(page, bodyClass, { timeout: 15000 });
		await spaNavigateBack(page, "watch");
		await expectBodyWithClass(page, bodyClass, { timeout: 15000 });
		await expectElementsHidden(page, selectors);
	});
	test(`does not hide related videos on a live stream watch page`, async ({ page }) => {
		// A /watch URL whose player reports isLive resolves to the "live" page type, which includePages ["watch"] excludes.
		await navigateToPageType(page, live);
		await enableFeature(page, "hideSidebarRecommendedVideos.enabled");
		await expectToStay(
			async () =>
				page.evaluate((className) => document.body.classList.contains(className), bodyClass),
			false,
			{ page }
		);
		// Live layouts vary (chat can take the sidebar over), so the body class above is the assertion that must hold.
		await expectElementsNotHidden(page, selectors);
	});
	test(`should not hide sidebar recommended videos on non-target page`, async ({ page }) => {
		// The feature hides through the body class alone, and a channel page can carry hidden watch-layout sidebars
		// in its DOM, so the absent class is the whole assertion here.
		await verifyNonTargetSilence(page, nonTargetPage!, "hideSidebarRecommendedVideos", {
			...subject,
			assertOff: assertOffClassOnly
		});
	});
});
