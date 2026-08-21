import { test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden, expectElementsNotHidden } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
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
		selectors: hideFeatureSelectors.hideShortsSidebar.selectors
	},
	{
		bodyClass: hideFeatureSelectors.hideShortsHome.bodyClass,
		config: "hideShorts.home.enabled" as const,
		page: home,
		selectors: hideFeatureSelectors.hideShortsHome.selectors
	},
	{
		bodyClass: hideFeatureSelectors.hideShortsChannel.bodyClass,
		config: "hideShorts.channel.enabled" as const,
		page: channelHome,
		selectors: hideFeatureSelectors.hideShortsChannel.selectors
	},
	{
		bodyClass: hideFeatureSelectors.hideShortsSearch.bodyClass,
		config: "hideShorts.search.enabled" as const,
		page: search,
		selectors: hideFeatureSelectors.hideShortsSearch.selectors
	},
	{
		bodyClass: hideFeatureSelectors.hideShortsVideos.bodyClass,
		config: "hideShorts.videos.enabled" as const,
		page: watch,
		selectors: hideFeatureSelectors.hideShortsVideos.selectors
	},
	{
		bodyClass: hideFeatureSelectors.hideShortsSubscriptions.bodyClass,
		config: "hideShorts.subscriptions.enabled" as const,
		page: subscriptions,
		selectors: hideFeatureSelectors.hideShortsSubscriptions.selectors
	}
] satisfies { bodyClass: string; config: string; page: PageType; selectors: readonly string[] }[];

test.describe("hideShorts", () => {
	for (const { bodyClass, config, page, selectors } of subFeatures) {
		test.describe(`${config}`, () => {
			test(`hides on ${page}`, async ({ page: pageObj }) => {
				test.skip(loginRequiredPages.includes(page), `${page} requires login`);
				await navigateToPageType(pageObj, page);
				await enableFeature(pageObj, config);
				await expectBodyWithClass(pageObj, bodyClass);
				await expectElementsHidden(pageObj, selectors);
			});
			test(`shows when disabled on ${page}`, async ({ page: pageObj }) => {
				test.skip(loginRequiredPages.includes(page), `${page} requires login`);
				await navigateToPageType(pageObj, page);
				await disableFeature(pageObj, config);
				await expectBodyWithoutClass(pageObj, bodyClass);
				await expectElementsNotHidden(pageObj, selectors);
			});
		});
	}
});
