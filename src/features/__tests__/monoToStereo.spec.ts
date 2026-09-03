import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { FeatureMenuItemId } from "@/src/types";

import { metadata } from "@/src/features/monoToStereo/index.metadata";
import {
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeTruthy,
	expectToggleButtonState,
	expectToStay
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, clickFeatureMenuItem, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { toggleFullscreen } from "@/src/utils/_tests/fullscreen";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { left, right } = placementRecord;
const { watch } = pageTypeRecord;
// Outside the feature menu the button is labelled from the toggle strings, not from the generic feature label.
const onTitle = /Stereo Output$/;
const offTitle = /^Original Audio$/;

/**
 * Clicks a feature menu item that is already showing. The feature menu's default open type is "click", so
 * re-running clickFeatureMenuItem would press the menu button again and toggle the menu shut before the item
 * could be clicked.
 */
async function clickOpenFeatureMenuItem(page: Page, id: FeatureMenuItemId): Promise<void> {
	await page.evaluate((itemId) => document.getElementById(itemId)?.click(), id);
}
async function isMonoEnabled(page: Page): Promise<boolean> {
	return await page.evaluate(() => !!window.engine?.monoEnabled);
}

test.describe("monoToStereoButton", () => {
	for (const pageType of testPages) {
		test(`audio should switch to stereo on click on ${pageType}`, async ({ page }) => {
			// videoMeetsCapabilities has no monoAudio case, so the requirement is silently ignored on live; the
			// channel splitter reads channel 0 whatever the source is, so a mono source is not required there.
			await navigateToPageType(page, pageType, pageType === "live" ? [] : ["monoAudio"]);
			await enableFeature(page, "monoToStereoButton.button.enabled");
			await setOption(page, "monoToStereoButton.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
			const button = page.locator("#yte-feature-monoToStereoButton-button");
			await expect(button).toHaveAttribute("aria-checked", "false");
			await clickFeatureButton(page, pageType, "yte-feature-monoToStereoButton-button", right);
			await expect.poll(async () => await isMonoEnabled(page)).toBeTruthy();
			await expect(button).toHaveAttribute("aria-checked", "true");
		});
	}

	// Neither the toggle nor the button lifecycle branches on live vs VOD, and the live fixture costs up to 120 s.
	test(`audio should toggle back to mono on second click on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["monoAudio"]);
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await setOption(page, "monoToStereoButton.button.placement", right);
		const button = page.locator("#yte-feature-monoToStereoButton-button");
		await clickFeatureButton(page, watch, "yte-feature-monoToStereoButton-button", right);
		await expect.poll(async () => await isMonoEnabled(page)).toBeTruthy();
		await expect(button).toHaveAttribute("aria-checked", "true");
		await clickFeatureButton(page, watch, "yte-feature-monoToStereoButton-button", right);
		await expect.poll(async () => await isMonoEnabled(page)).toBeFalsy();
		await expect(button).toHaveAttribute("aria-checked", "false");
	});

	test(`button should re-appear after disable then re-enable on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["monoAudio"]);
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await setOption(page, "monoToStereoButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
		await disableFeature(page, "monoToStereoButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-monoToStereoButton-button");
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await setOption(page, "monoToStereoButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
	});

	test(`button should persist after full page reload`, async ({ page }) => {
		await navigateToPageType(page, testPages[0], ["monoAudio"]);
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await setOption(page, "monoToStereoButton.button.placement", right);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0], ["monoAudio"]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
	});

	test(`should not create mono to stereo button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-monoToStereoButton-button");
	});

	// The label swap is the only bespoke UI this feature owns and the only proof that the listener's
	// isMonoStereoEnabled() branch ran; aria-checked on its own is set by the generic toggle listener.
	test(`button title and aria-checked should follow the toggle on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["monoAudio"]);
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await setOption(page, "monoToStereoButton.button.placement", right);
		await expectToggleButtonState(page, "yte-feature-monoToStereoButton-button", false, { title: offTitle });
		await clickFeatureButton(page, watch, "yte-feature-monoToStereoButton-button", right);
		await expect.poll(async () => await isMonoEnabled(page)).toBeTruthy();
		await expectToggleButtonState(page, "yte-feature-monoToStereoButton-button", true, { title: onTitle });
		await clickFeatureButton(page, watch, "yte-feature-monoToStereoButton-button", right);
		await expect.poll(async () => await isMonoEnabled(page)).toBeFalsy();
		await expectToggleButtonState(page, "yte-feature-monoToStereoButton-button", false, { title: offTitle });
	});

	test(`feature menu item should toggle mono to stereo on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["monoAudio"]);
		await setOption(page, "monoToStereoButton.button.placement", "feature_menu");
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await expectFeatureMenuItemToBeTruthy(page, "yte-feature-monoToStereoButton-menuitem");
		const menuItem = page.locator("#yte-feature-monoToStereoButton-menuitem");
		await expect(menuItem).toHaveAttribute("aria-checked", "false");
		await clickFeatureMenuItem(page, watch, "yte-feature-monoToStereoButton-menuitem");
		await expect.poll(async () => await isMonoEnabled(page)).toBeTruthy();
		await expect(menuItem).toHaveAttribute("aria-checked", "true");
		// The menu stays open after an item click, so the second toggle is dispatched on the item itself.
		await clickOpenFeatureMenuItem(page, "yte-feature-monoToStereoButton-menuitem");
		await expect.poll(async () => await isMonoEnabled(page)).toBeFalsy();
		await expect(menuItem).toHaveAttribute("aria-checked", "false");
	});

	test(`re-enabling the button while the conversion is active should restore the on state on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["monoAudio"]);
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await setOption(page, "monoToStereoButton.button.placement", right);
		await clickFeatureButton(page, watch, "yte-feature-monoToStereoButton-button", right);
		await expect.poll(async () => await isMonoEnabled(page)).toBeTruthy();
		// remove() deliberately never calls disableMonoToStereo, so the audio stays converted with no UI left.
		await disableFeature(page, "monoToStereoButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-monoToStereoButton-button");
		await expectToStay(async () => await isMonoEnabled(page), true, { page });
		// add() re-seeds initialChecked and the label from isMonoStereoEnabled(), so the button comes back on.
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await setOption(page, "monoToStereoButton.button.placement", right);
		await expectToggleButtonState(page, "yte-feature-monoToStereoButton-button", true, { title: onTitle });
		expect(await isMonoEnabled(page)).toBe(true);
	});

	test(`toggle state and title should survive fullscreen relocation on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["monoAudio"]);
		await setOption(page, "monoToStereoButton.button.placement", left);
		await setOption(page, "monoToStereoButton.button.fullscreenPlacement", right);
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-monoToStereoButton-button", left);
		await clickFeatureButton(page, watch, "yte-feature-monoToStereoButton-button", left);
		await expect.poll(async () => await isMonoEnabled(page)).toBeTruthy();
		await expectToggleButtonState(page, "yte-feature-monoToStereoButton-button", true, { title: onTitle });
		await toggleFullscreen(page, true);
		await expectFeatureButtonToBeIn(page, "yte-feature-monoToStereoButton-button", right);
		// The conversion is untouched by the relocation, so the rebuilt button has to keep reporting the on state.
		expect(await isMonoEnabled(page)).toBe(true);
		await expectToggleButtonState(page, "yte-feature-monoToStereoButton-button", true, { title: onTitle });
		await toggleFullscreen(page, false);
	});
});
