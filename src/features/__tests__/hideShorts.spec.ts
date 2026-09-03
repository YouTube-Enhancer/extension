import { test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden, expectElementsNotHidden } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { injectDynamicContent } from "@/src/utils/_tests/dom";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { loginRequiredPages } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const { channel_home: channelHome, home, search, subscriptions, watch } = pageTypeRecord;

const subFeatures = [
	{
		bodyClass: hideFeatureSelectors.hideShortsSidebar.bodyClass,
		config: "hideShorts.sidebar.enabled" as const,
		page: watch,
		selectors: hideFeatureSelectors.hideShortsSidebar.selectors,
		subFeature: "sidebar"
	},
	{
		bodyClass: hideFeatureSelectors.hideShortsHome.bodyClass,
		config: "hideShorts.home.enabled" as const,
		page: home,
		selectors: hideFeatureSelectors.hideShortsHome.selectors,
		subFeature: "home"
	},
	{
		bodyClass: hideFeatureSelectors.hideShortsChannel.bodyClass,
		config: "hideShorts.channel.enabled" as const,
		page: channelHome,
		selectors: hideFeatureSelectors.hideShortsChannel.selectors,
		subFeature: "channel"
	},
	{
		bodyClass: hideFeatureSelectors.hideShortsSearch.bodyClass,
		config: "hideShorts.search.enabled" as const,
		page: search,
		selectors: hideFeatureSelectors.hideShortsSearch.selectors,
		subFeature: "search"
	},
	{
		bodyClass: hideFeatureSelectors.hideShortsVideos.bodyClass,
		config: "hideShorts.videos.enabled" as const,
		page: watch,
		selectors: hideFeatureSelectors.hideShortsVideos.selectors,
		subFeature: "videos"
	},
	{
		bodyClass: hideFeatureSelectors.hideShortsSubscriptions.bodyClass,
		config: "hideShorts.subscriptions.enabled" as const,
		page: subscriptions,
		selectors: hideFeatureSelectors.hideShortsSubscriptions.selectors,
		subFeature: "subscriptions"
	}
] satisfies { bodyClass: string; config: string; page: PageType; selectors: readonly string[]; subFeature: string }[];

test.describe("hideShorts", () => {
	for (const { bodyClass, config, page, selectors, subFeature } of subFeatures) {
		test.describe(`${config}`, () => {
			test(`hides on ${page}`, async ({ page: pageObj }) => {
				test.skip(!hasAuthState() && loginRequiredPages.includes(page), `${page} requires login`);
				await navigateToPageType(pageObj, page);
				await enableFeature(pageObj, config);
				await expectBodyWithClass(pageObj, bodyClass);
				await expectElementsHidden(pageObj, selectors);
			});
			test(`${subFeature} hiding should persist after navigation on ${page}`, async ({ page: pageObj }) => {
				test.skip(!hasAuthState() && loginRequiredPages.includes(page), `${page} requires login`);
				await navigateToPageType(pageObj, page);
				await enableFeature(pageObj, config);
				await expectBodyWithClass(pageObj, bodyClass);
				await expectElementsHidden(pageObj, selectors);
				await navigateToPageType(pageObj, home);
				await navigateToPageType(pageObj, page);
				await disableFeature(pageObj, config);
				await enableFeature(pageObj, config);
				await expectBodyWithClass(pageObj, bodyClass);
				await expectElementsHidden(pageObj, selectors);
			});
			test(`${subFeature} hiding should work on re-enable after disable on ${page}`, async ({ page: pageObj }) => {
				test.skip(!hasAuthState() && loginRequiredPages.includes(page), `${page} requires login`);
				await navigateToPageType(pageObj, page);
				await enableFeature(pageObj, config);
				await expectBodyWithClass(pageObj, bodyClass);
				await expectElementsHidden(pageObj, selectors);
				await disableFeature(pageObj, config);
				await expectBodyWithoutClass(pageObj, bodyClass);
				await expectElementsNotHidden(pageObj, selectors);
				await enableFeature(pageObj, config);
				await expectBodyWithClass(pageObj, bodyClass);
				await expectElementsHidden(pageObj, selectors);
			});
			test(`${subFeature} hiding should persist after full page reload on ${page}`, async ({ page: pageObj }) => {
				test.skip(!hasAuthState() && loginRequiredPages.includes(page), `${page} requires login`);
				await navigateToPageType(pageObj, page);
				await enableFeature(pageObj, config);
				await expectBodyWithClass(pageObj, bodyClass);
				await expectElementsHidden(pageObj, selectors);
				await pageObj.reload();
				await navigateToPageType(pageObj, page);
				await expectBodyWithClass(pageObj, bodyClass, { timeout: 15000 });
				await expectElementsHidden(pageObj, selectors);
			});
			if (subFeature === "videos") {
				// Hiding is a static body-class CSS rule with no observer, so one sub-feature covers dynamically added content.
				test(`${subFeature} hiding should apply to dynamically added content on ${page}`, async ({ page: pageObj }) => {
					test.skip(!hasAuthState() && loginRequiredPages.includes(page), `${page} requires login`);
					await navigateToPageType(pageObj, page);
					await enableFeature(pageObj, config);
					await expectBodyWithClass(pageObj, bodyClass);
					await expectElementsHidden(pageObj, selectors);
					await injectDynamicContent(pageObj, selectors);
					await expectBodyWithClass(pageObj, bodyClass);
					await expectElementsHidden(pageObj, selectors);
				});
			}
		});
	}
});
