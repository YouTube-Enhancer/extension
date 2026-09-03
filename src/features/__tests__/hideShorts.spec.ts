import { test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { expectBodyWithClass, expectBodyWithoutClass, expectElementsHidden, expectElementsNotHidden } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { injectDynamicContent } from "@/src/utils/_tests/dom";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToFirstVideo, spaNavigateToHome } from "@/src/utils/_tests/navigation";
import { loginRequiredPages } from "@/src/utils/_tests/utils";

import { hideFeatureSelectors } from "./__generated__/hideFeatureSelectors";

const { channel_home: channelHome, home, search, shorts, subscriptions, watch } = pageTypeRecord;

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
		// The away leg must be a different page type, otherwise navigateToYoutubePage skips the goto for an identical URL.
		const intermediatePage: PageType = page === search ? watch : search;
		// yt-tab-shape[tab-title="Shorts"] is structurally part of the channel tab bar, so at least one selector always matches there.
		const hiddenMode = subFeature === "channel" ? "any" : "all";
		test.describe(`${config}`, () => {
			test(`hides on ${page}`, async ({ page: pageObj }) => {
				test.skip(!hasAuthState() && loginRequiredPages.includes(page), `${page} requires login`);
				await navigateToPageType(pageObj, page);
				await enableFeature(pageObj, config);
				await expectBodyWithClass(pageObj, bodyClass);
				await expectElementsHidden(pageObj, selectors, { mode: hiddenMode });
			});
			test(`${subFeature} hiding should persist after navigation on ${page}`, async ({ page: pageObj }) => {
				test.skip(!hasAuthState() && loginRequiredPages.includes(page), `${page} requires login`);
				await navigateToPageType(pageObj, page);
				await enableFeature(pageObj, config);
				await expectBodyWithClass(pageObj, bodyClass);
				await expectElementsHidden(pageObj, selectors);
				await navigateToPageType(pageObj, intermediatePage);
				await navigateToPageType(pageObj, page);
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

	// The sub-key tests above only ever assert their own class, so a mis-keyed entry in shortsClassMap would pass them
	// all as long as the intended class also happened to be written.
	test(`enabling one sub-feature does not add the other five body classes`, async ({ page: pageObj }) => {
		await navigateToPageType(pageObj, watch);
		for (const { bodyClass, config } of subFeatures) {
			await enableFeature(pageObj, config);
			await expectBodyWithClass(pageObj, bodyClass);
			for (const other of subFeatures.filter((subFeature) => subFeature.config !== config)) {
				await expectBodyWithoutClass(pageObj, other.bodyClass);
			}
			await disableFeature(pageObj, config);
		}
		// With every sub-key false the derived enabled state is false, so no section class may survive.
		for (const { bodyClass } of subFeatures) {
			await expectBodyWithoutClass(pageObj, bodyClass);
		}
	});
	test(`enabling every sub-feature adds all six body classes`, async ({ page: pageObj }) => {
		await navigateToPageType(pageObj, watch);
		for (const { config } of subFeatures) {
			await enableFeature(pageObj, config);
		}
		for (const { bodyClass } of subFeatures) {
			await expectBodyWithClass(pageObj, bodyClass);
		}
	});
	test(`disabling one sub-feature keeps the other enabled section hidden`, async ({ page: pageObj }) => {
		await navigateToPageType(pageObj, watch);
		await enableFeature(pageObj, "hideShorts.sidebar.enabled");
		await enableFeature(pageObj, "hideShorts.videos.enabled");
		await expectBodyWithClass(pageObj, hideFeatureSelectors.hideShortsSidebar.bodyClass);
		await expectBodyWithClass(pageObj, hideFeatureSelectors.hideShortsVideos.bodyClass);
		// The parent feature stays enabled, so onDisable never runs and the per-section removal has to come from applyShortsVisibility.
		await disableFeature(pageObj, "hideShorts.videos.enabled");
		await expectBodyWithoutClass(pageObj, hideFeatureSelectors.hideShortsVideos.bodyClass);
		await expectBodyWithClass(pageObj, hideFeatureSelectors.hideShortsSidebar.bodyClass);
		await expectElementsHidden(pageObj, hideFeatureSelectors.hideShortsSidebar.selectors);
	});
	test(`does not apply the body classes on a page outside includePages`, async ({ page: pageObj }) => {
		await navigateToPageType(pageObj, watch);
		await enableFeature(pageObj, "hideShorts.sidebar.enabled");
		await expectBodyWithClass(pageObj, hideFeatureSelectors.hideShortsSidebar.bodyClass);
		// includePages lists neither shorts nor live nor playlist, so the dependency gate must disable the feature there.
		await navigateToPageType(pageObj, shorts);
		await expectBodyWithoutClass(pageObj, hideFeatureSelectors.hideShortsSidebar.bodyClass, { timeout: 15000 });
		await navigateToPageType(pageObj, watch);
		await expectBodyWithClass(pageObj, hideFeatureSelectors.hideShortsSidebar.bodyClass, { timeout: 15000 });
	});
	test(`keeps the sidebar class across SPA navigation between included pages`, async ({ page: pageObj }) => {
		test.skip(!hasAuthState() && loginRequiredPages.includes(home), `the in-page hop lands on ${home}, which requires login`);
		await navigateToPageType(pageObj, watch);
		await enableFeature(pageObj, "hideShorts.sidebar.enabled");
		await expectBodyWithClass(pageObj, hideFeatureSelectors.hideShortsSidebar.bodyClass);
		// Both watch and home are in includePages, so onNavigate must re-apply the class instead of the gate dropping it.
		await spaNavigateToHome(pageObj);
		await expectBodyWithClass(pageObj, hideFeatureSelectors.hideShortsSidebar.bodyClass, { timeout: 15000 });
		await spaNavigateToFirstVideo(pageObj);
		await expectBodyWithClass(pageObj, hideFeatureSelectors.hideShortsSidebar.bodyClass, { timeout: 15000 });
	});
});
