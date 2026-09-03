import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { FeatureMenuItemId } from "@/src/types";

import { metadata } from "@/src/features/miniPlayerButton/index.metadata";
import {
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeTruthy,
	expectToggleButtonState
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, clickFeatureMenuItem, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { toggleFullscreen } from "@/src/utils/_tests/fullscreen";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const { below, left, right } = placementRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home, watch } = pageTypeRecord;
const onTitle = /^Mini Player on$/;
const offTitle = /^Mini Player off$/;

/**
 * Clicks a feature menu item that is already showing. The feature menu's default open type is "click", so
 * re-running clickFeatureMenuItem would press the menu button again and toggle the menu shut before the item
 * could be clicked.
 */
async function clickOpenFeatureMenuItem(page: Page, id: FeatureMenuItemId): Promise<void> {
	await page.evaluate((itemId) => document.getElementById(itemId)?.click(), id);
}

test.describe("miniPlayerButton", () => {
	for (const pageType of testPages) {
		test(`mini player button should be present on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await setOption(page, "miniPlayerButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
		});
		test(`clicking mini player button again should deactivate mini player on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await setOption(page, "miniPlayerButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-miniPlayerButton-button", right);
			await expect(page.locator("html")).toHaveClass(/yte-mini-player-active/, { timeout: 10000 });
			await clickFeatureButton(page, pageType, "yte-feature-miniPlayerButton-button", right);
			await expect(page.locator("html")).not.toHaveClass(/yte-mini-player-active/, { timeout: 10000 });
		});
	}

	// The button lifecycle below has no live-specific branch and the live fixture costs up to 120 s, so it runs on watch only.
	test(`mini player button should persist after navigation on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "miniPlayerButton.button.enabled");
		await setOption(page, "miniPlayerButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
	});

	test(`mini player button should re-appear after disable then re-enable on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "miniPlayerButton.button.enabled");
		await setOption(page, "miniPlayerButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
		await disableFeature(page, "miniPlayerButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-miniPlayerButton-button");
		await enableFeature(page, "miniPlayerButton.button.enabled");
		await setOption(page, "miniPlayerButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
	});

	test(`mini player button should persist after full page reload`, async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await enableFeature(page, "miniPlayerButton.button.enabled");
		await setOption(page, "miniPlayerButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
	});

	test(`should not create mini player button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "miniPlayerButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-miniPlayerButton-button");
	});

	// navigateToPageType is a document load, so this cannot observe cleanup across an in-page navigation; it pins
	// the includePages gate on a fresh load while the feature is already enabled (the sibling miniPlayer sentinel
	// test covers the same parity case).
	test(`mini player button should not be present after navigating from ${watch} to ${nonTargetPage}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "miniPlayerButton.button.enabled");
		await setOption(page, "miniPlayerButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
		await navigateToPageType(page, nonTargetPage!);
		await expectFeatureButtonToBeFalsy(page, "yte-feature-miniPlayerButton-button");
	});

	// aria-checked is flipped by the generic toggle listener, so only the title proves the feature's own
	// yte-mini-player-state handler ran and re-labelled the button.
	test(`mini player button title should follow the toggle state on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "miniPlayerButton.button.enabled");
		await setOption(page, "miniPlayerButton.button.placement", right);
		await expectToggleButtonState(page, "yte-feature-miniPlayerButton-button", false, { title: offTitle });
		await clickFeatureButton(page, watch, "yte-feature-miniPlayerButton-button", right);
		await expect(page.locator("html")).toHaveClass(/yte-mini-player-active/, { timeout: 10000 });
		await expectToggleButtonState(page, "yte-feature-miniPlayerButton-button", true, { title: onTitle });
		await clickFeatureButton(page, watch, "yte-feature-miniPlayerButton-button", right);
		await expect(page.locator("html")).not.toHaveClass(/yte-mini-player-active/, { timeout: 10000 });
		await expectToggleButtonState(page, "yte-feature-miniPlayerButton-button", false, { title: offTitle });
	});

	test(`clicking the mini player feature menu item should toggle the mini player on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "miniPlayerButton.button.placement", "feature_menu");
		await enableFeature(page, "miniPlayerButton.button.enabled");
		await expectFeatureMenuItemToBeTruthy(page, "yte-feature-miniPlayerButton-menuitem");
		const menuItem = page.locator("#yte-feature-miniPlayerButton-menuitem");
		await expect(menuItem).toHaveAttribute("aria-checked", "false");
		await clickFeatureMenuItem(page, watch, "yte-feature-miniPlayerButton-menuitem");
		await expect(page.locator("html")).toHaveClass(/yte-mini-player-active/, { timeout: 10000 });
		await expect(menuItem).toHaveAttribute("aria-checked", "true");
		// The menu item moved into the overlay together with the player, so the second toggle is dispatched on the
		// item itself rather than by re-opening the menu.
		await clickOpenFeatureMenuItem(page, "yte-feature-miniPlayerButton-menuitem");
		await expect(page.locator("html")).not.toHaveClass(/yte-mini-player-active/, { timeout: 10000 });
		await expect(menuItem).toHaveAttribute("aria-checked", "false");
	});

	test(`mini player button should stay checked when its placement changes while the mini player is active on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "miniPlayerButton.button.enabled");
		await setOption(page, "miniPlayerButton.button.placement", right);
		await clickFeatureButton(page, watch, "yte-feature-miniPlayerButton-button", right);
		await expect(page.locator("html")).toHaveClass(/yte-mini-player-active/, { timeout: 10000 });
		await expectToggleButtonState(page, "yte-feature-miniPlayerButton-button", true, { title: onTitle });
		// A placement change removes and re-adds the button, and add() re-seeds the checked state and the label
		// from isMiniPlayerActive(), so the rebuilt button has to keep reporting the mini player as on.
		await setOption(page, "miniPlayerButton.button.placement", left);
		await expectFeatureButtonToBeIn(page, "yte-feature-miniPlayerButton-button", left);
		await expect(page.locator("html")).toHaveClass(/yte-mini-player-active/);
		await expectToggleButtonState(page, "yte-feature-miniPlayerButton-button", true, { title: onTitle });
	});

	test(`closing the overlay with its close button should uncheck the mini player button on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "miniPlayerButton.button.enabled");
		// below_player keeps the button outside the player element the overlay steals, so it stays observable.
		await setOption(page, "miniPlayerButton.button.placement", below);
		await clickFeatureButton(page, watch, "yte-feature-miniPlayerButton-button", below);
		await expect(page.locator("html")).toHaveClass(/yte-mini-player-active/, { timeout: 10000 });
		await expectToggleButtonState(page, "yte-feature-miniPlayerButton-button", true, { title: onTitle });
		await page.locator("#yte-mini-player-close").click();
		await expect(page.locator("html")).not.toHaveClass(/yte-mini-player-active/, { timeout: 10000 });
		await expectToggleButtonState(page, "yte-feature-miniPlayerButton-button", false, { title: offTitle });
	});

	test.describe("button placement", () => {
		// Deliberately no placement setOption: this feature overrides the shared button defaults (feature_menu /
		// same) with below_player / player_controls_right, and only an untouched config proves those defaults ship.
		test(`should use its own default placement and fullscreen placement on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-miniPlayerButton-button", below);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-miniPlayerButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-miniPlayerButton-button", below);
		});

		// player_controls_right attachment is already asserted by clickFeatureButton in the deactivate test.
		test(`should render button in ${left}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "miniPlayerButton.button.placement", left);
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-miniPlayerButton-button");
			await expectFeatureButtonToBeIn(page, "yte-feature-miniPlayerButton-button", left);
		});

		test("should render button in feature menu", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "miniPlayerButton.button.placement", "feature_menu");
			await enableFeature(page, "miniPlayerButton.button.enabled");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-miniPlayerButton-menuitem");
		});
	});
});
