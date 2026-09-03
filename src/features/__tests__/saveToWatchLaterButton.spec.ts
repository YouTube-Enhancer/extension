import { expect, test } from "playwright.config";

import type { YtButtonViewModelElement } from "@/src/utils/dom/nativeComponents";

import { metadata } from "@/src/features/saveToWatchLaterButton/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

const BUTTON_SELECTOR = ".yte-save-to-watch-later-button";
const ACTIONS_ROW_BUTTON_SELECTOR = `ytd-watch-metadata ytd-menu-renderer ${BUTTON_SELECTOR}`;
const { home, watch } = pageTypeRecord;

test.describe("saveToWatchLaterButton", () => {
	for (const pageType of testPages) {
		test(`save button should appear when enabled on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
		});

		test(`save button should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
			await disableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR)).not.toBeAttached();
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
		});
	}

	// getFixture is deterministic, so the old per-page-type test navigated to the URL it was already on. Only
	// watch has a genuine in-page navigation, and it is also the only page with the actions-row button.
	test(`save button should persist after in-page navigation on ${watch}`, async ({ page }) => {
		test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
		await navigateToPageType(page, watch);
		await enableFeature(page, "saveToWatchLaterButton.enabled");
		await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
		await spaNavigateToRelatedVideo(page);
		await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
		// onNavigate removes the stale actions-row button before rebuilding it, so the next video gets exactly one.
		await expect.poll(async () => page.locator(ACTIONS_ROW_BUTTON_SELECTOR).count(), { timeout: 10000 }).toBe(1);
	});

	// The load-time path branches only on `onWatchPage`; subscriptions only repeats the home page-type interpolation.
	for (const pageType of [home, watch] as const) {
		test(`save button should persist after full page reload on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
			await page.reload();
			await navigateToPageType(page, pageType);
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
		});
	}

	test(`save button should be removed when navigating in-page to a non-target page`, async ({ page }) => {
		test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
		await navigateToPageType(page, home);
		await enableFeature(page, "saveToWatchLaterButton.enabled");
		await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
		// A cold load of a non-target page cannot fail: the feature only observes containers that page never
		// renders. Clicking through to a channel page makes the page gate run the removal instead.
		const channelLink = page.locator('ytd-rich-grid-renderer a[href^="/@"]').first();
		await expect(channelLink).toBeAttached({ timeout: 15000 });
		await channelLink.evaluate((el) => el.scrollIntoView({ block: "center" }));
		await channelLink.click();
		await page.waitForURL((url) => url.pathname.startsWith("/@"), { timeout: 30000 });
		await expect(page.locator("html[yte-ready]")).toBeAttached();
		await expectToStay(async () => page.locator(BUTTON_SELECTOR).count(), 0, { page });
	});

	test.describe("watch page actions row", () => {
		test("renders a native toggle button in the actions row", async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, watch);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			const actionsRowButton = page.locator(ACTIONS_ROW_BUTTON_SELECTOR);
			await expect(actionsRowButton).toBeAttached({ timeout: 10000 });
			// The button is built from YouTube's own component, so the props we set have to survive its render.
			const iconName = await actionsRowButton.evaluate((el) => (el as YtButtonViewModelElement).rawProps?.data.iconName);
			expect(iconName).toBe("WATCH_LATER");
			await expect(actionsRowButton.locator("button")).toHaveAccessibleName("Save to Watch Later", { timeout: 10000 });
		});
	});
});
