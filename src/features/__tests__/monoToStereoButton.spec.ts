import type { Page } from "@playwright/test";

import { metadata } from "@/src/features/monoToStereoButton/index.metadata";
import {
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeTruthy,
	expectToggleButtonState,
	expectToStay
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickOpenFeatureMenuItem } from "@/src/utils/_tests/dom";
import {
	clickFeatureButton,
	clickFeatureMenuItem,
	disableFeature,
	enableFeature,
	setOption
} from "@/src/utils/_tests/features";
import { toggleFullscreen } from "@/src/utils/_tests/fullscreen";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";
import {
	expect,
	test,
	verifyNavigationPersistence,
	verifyNonTargetSilence,
	verifyReEnableCycle,
	verifyReloadPersistence
} from "@/tests/harness";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { left, right } = placementRecord;
const { watch } = pageTypeRecord;
// Outside the feature menu the button is labelled from the toggle strings, not from the generic feature label.
const onTitle = /Stereo Output$/;
const offTitle = /^Original Audio$/;

async function isMonoEnabled(page: Page): Promise<boolean> {
	return await page.evaluate(() => !!window.engine?.monoEnabled);
}

test.describe("monoToStereoButton", () => {
	const assertOn = (page: Page) =>
		expectFeatureButtonToBeTruthy(page, "yte-feature-monoToStereoButton-button");
	const assertOff = (page: Page) =>
		expectFeatureButtonToBeFalsy(page, "yte-feature-monoToStereoButton-button");
	// This feature's switch lives at `<featureId>.button.enabled`, not the `<featureId>.enabled` the
	// battery defaults to, so both legs of the cycle come from here.
	const enable = (page: Page) => enableFeature(page, "monoToStereoButton.button.enabled");
	const disable = (page: Page) => disableFeature(page, "monoToStereoButton.button.enabled");
	const subject = { assertOff, assertOn, disable, enable };
	/** The enable sequence for the lifecycle cases: they also pin the placement the button is observed at. */
	const enablePlaced = async (page: Page) => {
		await enable(page);
		await setOption(page, "monoToStereoButton.button.placement", right);
	};

	for (const pageType of testPages) {
		test(`audio should switch to stereo on click on ${pageType}`, async ({ page }) => {
			// The channel splitter reads channel 0 whatever the source is, so a mono source is not required on
			// live; the shared capability check still verifies the fixture video plays there.
			await navigateToPageType(page, pageType, ["monoAudio"]);
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
		await verifyReEnableCycle(page, watch, "monoToStereoButton", {
			...subject,
			enable: enablePlaced,
			requirements: ["monoAudio"]
		});
	});

	test(`button should persist after full page reload`, async ({ page }) => {
		await verifyReloadPersistence(page, testPages[0], "monoToStereoButton", {
			...subject,
			enable: enablePlaced,
			requirements: ["monoAudio"]
		});
	});

	// Neither the button lifecycle nor the toggle branches on live vs VOD, and the live fixture costs
	// up to 120 s, so the navigation case runs on watch only.
	test(`button should re-appear after navigation on ${watch}`, async ({ page }) => {
		// A genuine in-page navigation to another video: the button lives inside the player, which the
		// navigation rebuilds, so the placement pass has to put it back without a fresh document load.
		await verifyNavigationPersistence(
			page,
			watch,
			"monoToStereoButton",
			{ ...subject, enable: enablePlaced, requirements: ["monoAudio"] },
			(navPage) => spaNavigateToRelatedVideo(navPage)
		);
	});

	test(`applies live changes to the button placement while enabled on ${watch}`, async ({
		page
	}) => {
		// Placement attaches to the player controls without a mono source, so the fixture needs no audio capability.
		await navigateToPageType(page, watch);
		// The shipped default placement is the left side of the player controls.
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-monoToStereoButton-button", left);
		// A placement change while the button is up has to relocate it without a reload.
		await setOption(page, "monoToStereoButton.button.placement", right);
		await expectFeatureButtonToBeIn(page, "yte-feature-monoToStereoButton-button", right);
	});

	test(`should not create mono to stereo button on non-target page`, async ({ page }) => {
		await verifyNonTargetSilence(page, nonTargetPage!, "monoToStereoButton", subject);
	});

	// The label swap is the only bespoke UI this feature owns and the only proof that the listener's
	// isMonoStereoEnabled() branch ran; aria-checked on its own is set by the generic toggle listener.
	test(`button title and aria-checked should follow the toggle on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["monoAudio"]);
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await setOption(page, "monoToStereoButton.button.placement", right);
		await expectToggleButtonState(page, "yte-feature-monoToStereoButton-button", false, {
			title: offTitle
		});
		await clickFeatureButton(page, watch, "yte-feature-monoToStereoButton-button", right);
		await expect.poll(async () => await isMonoEnabled(page)).toBeTruthy();
		await expectToggleButtonState(page, "yte-feature-monoToStereoButton-button", true, {
			title: onTitle
		});
		await clickFeatureButton(page, watch, "yte-feature-monoToStereoButton-button", right);
		await expect.poll(async () => await isMonoEnabled(page)).toBeFalsy();
		await expectToggleButtonState(page, "yte-feature-monoToStereoButton-button", false, {
			title: offTitle
		});
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

	test(`re-enabling the button while the conversion is active should restore the on state on ${watch}`, async ({
		page
	}) => {
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
		await expectToggleButtonState(page, "yte-feature-monoToStereoButton-button", true, {
			title: onTitle
		});
		expect(await isMonoEnabled(page)).toBe(true);
	});

	test(`toggle state and title should survive fullscreen relocation on ${watch}`, async ({
		page
	}) => {
		await navigateToPageType(page, watch, ["monoAudio"]);
		await setOption(page, "monoToStereoButton.button.placement", left);
		await setOption(page, "monoToStereoButton.button.fullscreenPlacement", right);
		await enableFeature(page, "monoToStereoButton.button.enabled");
		await expectFeatureButtonToBeIn(page, "yte-feature-monoToStereoButton-button", left);
		await clickFeatureButton(page, watch, "yte-feature-monoToStereoButton-button", left);
		await expect.poll(async () => await isMonoEnabled(page)).toBeTruthy();
		await expectToggleButtonState(page, "yte-feature-monoToStereoButton-button", true, {
			title: onTitle
		});
		await toggleFullscreen(page, true);
		await expectFeatureButtonToBeIn(page, "yte-feature-monoToStereoButton-button", right);
		// The conversion is untouched by the relocation, so the rebuilt button has to keep reporting the on state.
		expect(await isMonoEnabled(page)).toBe(true);
		await expectToggleButtonState(page, "yte-feature-monoToStereoButton-button", true, {
			title: onTitle
		});
		await toggleFullscreen(page, false);
	});
});
