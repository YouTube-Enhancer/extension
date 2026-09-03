import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/openTranscriptButton/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeTruthy, expectFeatureMenuItemToBeTruthy } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, clickFeatureMenuItem, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToHome } from "@/src/utils/_tests/navigation";
import { waitForYoutubePlayerReady } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const { left } = placementRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { home, watch } = pageTypeRecord;
const transcriptPanelSelector = "ytd-engagement-panel-section-list-renderer[target-id=PAmodern_transcript_view]";
/**
 * Reads the transcript engagement panel state as a boolean instead of asserting on the locator, so a test can
 * also assert the panel is *not* open while the panel element may not be attached at all yet.
 */
async function isTranscriptPanelExpanded(page: Page): Promise<boolean> {
	return page.evaluate(
		(selector) => document.querySelector(selector)?.getAttribute("visibility") === "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED",
		transcriptPanelSelector
	);
}
test.describe("openTranscriptButton", () => {
	for (const pageType of testPages) {
		test("open transcript button should be enabled", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "openTranscriptButton.button.enabled");
			await setOption(page, "openTranscriptButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
		});
		test("transcript should be shown when clicking the transcript button", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "openTranscriptButton.button.enabled");
			await setOption(page, "openTranscriptButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-openTranscriptButton-button", left);
			await expect(page.locator("ytd-engagement-panel-section-list-renderer[target-id=PAmodern_transcript_view]")).toHaveAttribute(
				"visibility",
				"ENGAGEMENT_PANEL_VISIBILITY_EXPANDED",
				{ timeout: 10000 }
			);
		});
		test("transcript button should persist after navigation", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "openTranscriptButton.button.enabled");
			await setOption(page, "openTranscriptButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
		});
		test("transcript button should re-appear after disable then re-enable", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "openTranscriptButton.button.enabled");
			await setOption(page, "openTranscriptButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
			await disableFeature(page, "openTranscriptButton.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-openTranscriptButton-button");
			await enableFeature(page, "openTranscriptButton.button.enabled");
			await setOption(page, "openTranscriptButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
		});
	}

	test("transcript button should persist after full page reload", async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await enableFeature(page, "openTranscriptButton.button.enabled");
		await setOption(page, "openTranscriptButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
	});

	test("transcript should open when clicking the feature menu item", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "openTranscriptButton.button.placement", "feature_menu");
		await enableFeature(page, "openTranscriptButton.button.enabled");
		await expectFeatureMenuItemToBeTruthy(page, "yte-feature-openTranscriptButton-menuitem");
		expect(await isTranscriptPanelExpanded(page)).toBe(false);
		await clickFeatureMenuItem(page, watch, "yte-feature-openTranscriptButton-menuitem");
		await expect.poll(async () => isTranscriptPanelExpanded(page), { timeout: 10000 }).toBe(true);
	});

	// A real history navigation, not navigateToPageType: that helper does a full document load, which would
	// re-run the whole extension setup instead of the in-page navigation path that re-adds the button.
	test("transcript button is re-added after in-page (SPA) navigation back to watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "openTranscriptButton.button.enabled");
		await setOption(page, "openTranscriptButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
		await spaNavigateToHome(page);
		await expectFeatureButtonToBeFalsy(page, "yte-feature-openTranscriptButton-button");
		await page.goBack();
		await page.waitForURL((url) => url.pathname === "/watch", { timeout: 30_000 });
		await expect(page.locator("html[yte-ready]")).toBeAttached();
		await waitForYoutubePlayerReady(page, watch);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
		// The button has to work again, not just exist: a stale listener left behind by the navigation would
		// still satisfy an attachment-only assertion.
		expect(await isTranscriptPanelExpanded(page)).toBe(false);
		await clickFeatureButton(page, watch, "yte-feature-openTranscriptButton-button", left);
		await expect.poll(async () => isTranscriptPanelExpanded(page), { timeout: 10000 }).toBe(true);
	});

	test.describe("button placement", () => {
		test("should render button in feature menu", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "openTranscriptButton.button.placement", "feature_menu");
			await enableFeature(page, "openTranscriptButton.button.enabled");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-openTranscriptButton-menuitem");
		});
	});
});
