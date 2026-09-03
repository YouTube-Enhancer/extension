import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { metadata } from "@/src/features/scrollWheelVolumeControl/index.metadata";
import { expectBodyWithClass, expectBodyWithoutClass, expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord, volume } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import {
	adjustWithScrollWheel,
	dispatchWheelNotches,
	getCurrentSpeed,
	getCurrentVolume,
	setValueOnYouTubePlayer,
	setVolume,
	waitForScrollWheelControl,
	waitForScrollWheelVolumeControl,
	WHEEL_DELTA_PER_NOTCH
} from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const { home, watch } = pageTypeRecord;
const { right } = placementRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const modifierKeys = ["altKey", "ctrlKey", "shiftKey"] as const;
const steps = 5;
// Added by onWheel while a right-click scroll is in progress; the CSS keyed on it hides YouTube's own menu.
const CONTEXT_MENU_CLASS = "yte-context-menu-visible";
const SETTINGS_MENU_SELECTOR = ".ytp-settings-menu:not(#yte-feature-menu)";
const VOLUME_BOOST_BUTTON_ID = "yte-feature-volumeBoostButton-button";

/** Dispatches a bubbling mouse event on the player container and reports whether a handler cancelled it. */
async function dispatchMouseEventOnPlayer(page: Page, type: string): Promise<boolean> {
	return page.evaluate((type) => {
		const player = document.querySelector("div#movie_player");
		if (!player) throw new Error("Player container not found");
		return !player.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
	}, type);
}
/**
 * Dispatches one wheel notch on an element inside the player, so the control's listener receives the event
 * with that element as its target rather than the player container.
 */
async function dispatchWheelOverElement(page: Page, selector: string, direction: "down" | "up"): Promise<void> {
	await page.evaluate(
		([selector, deltaY]) => {
			const target = document.querySelector(selector);
			if (!target) throw new Error(`Wheel target ${selector} not found`);
			target.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaMode: 0, deltaY }));
		},
		[selector, direction === "up" ? -WHEEL_DELTA_PER_NOTCH : WHEEL_DELTA_PER_NOTCH] as const
	);
}
async function enableVolumeControl(page: Page, stepSize = steps) {
	await navigateToPageType(page, watch);
	await setOption(page, "scrollWheelVolumeControl.steps", stepSize);
	await enableFeature(page, "scrollWheelVolumeControl.enabled");
	await waitForScrollWheelVolumeControl(page, true);
	await setVolume(page, volume, watch);
	await expect.poll(async () => getCurrentVolume(page, watch)).toBe(volume);
}
async function isPlayerMuted(page: Page): Promise<Nullable<boolean>> {
	return page.evaluate(async () => {
		const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
		if (!player?.isMuted) return null;
		return await player.isMuted();
	});
}
async function mutePlayer(page: Page): Promise<void> {
	await page.evaluate(async () => {
		const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
		if (!player?.mute) return;
		await player.mute();
	});
}
test.describe("scrollWheelVolumeControl", () => {
	for (const pageType of testPages) {
		test(`should increase volume on ${pageType}`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Volume", direction: "up", initialValue: volume, page, pageType, steps: 5 });
		});
	}
	// The only page-specific branch is findPlayerContainer's container lookup, which the increase test above already
	// exercises on every page type; direction and navigation add no page-specific path, so these run on watch only
	// (the live fixture re-crawls the channel and costs up to 120 s per iteration).
	test(`should decrease volume on ${watch}`, async ({ page }) => {
		await adjustWithScrollWheel({ controlType: "Volume", direction: "down", initialValue: volume, page, pageType: watch, steps: 5 });
	});
	test(`should persist volume control after navigation on ${watch}`, async ({ page }) => {
		await adjustWithScrollWheel({ controlType: "Volume", direction: "up", initialValue: volume, page, pageType: watch, steps: 5 });
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch);
		// Asserted in place: adjustWithScrollWheel would navigate again and re-enable the feature, which would
		// hide a listener that never re-attached after the navigation.
		await waitForScrollWheelVolumeControl(page, true);
		await setVolume(page, volume, watch);
		await expect.poll(async () => getCurrentVolume(page, watch)).toBe(volume);
		await dispatchWheelNotches(page, watch, "up");
		await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(volume + 5);
	});
	// The modifier gate is a single boolean lookup on the wheel event and the direction is decided independently by
	// the stepper sign, so only the increase direction is exercised per modifier plus one decrease control below.
	for (const modifierKey of modifierKeys) {
		test(`should increase volume when holding '${
			modifierKey === "altKey" ? "Alt"
			: modifierKey === "ctrlKey" ? "Ctrl"
			: "Shift"
		}' modifier key`, async ({ page }) => {
			await adjustWithScrollWheel({
				controlType: "Volume",
				direction: "up",
				initialValue: volume,
				modifierKey,
				page,
				steps: 5,
				withModifierKey: true
			});
		});
	}
	test("should decrease volume when holding 'Ctrl' modifier key", async ({ page }) => {
		await adjustWithScrollWheel({
			controlType: "Volume",
			direction: "down",
			initialValue: volume,
			modifierKey: "ctrlKey",
			page,
			steps: 5,
			withModifierKey: true
		});
	});
	// onWheel evaluates the modifier gate and the right-click gate as independent conjuncts, so a single combination
	// is enough to prove they compose.
	test("should increase volume when holding 'Alt' modifier key and holding 'Right' click", async ({ page }) => {
		await adjustWithScrollWheel({
			controlType: "Volume",
			direction: "up",
			initialValue: volume,
			modifierKey: "altKey",
			page,
			steps: 5,
			withModifierKey: true,
			withRightClick: true
		});
	});
	test("should increase volume when holding 'Right' click", async ({ page }) => {
		await adjustWithScrollWheel({ controlType: "Volume", direction: "up", initialValue: volume, page, steps: 5, withRightClick: true });
	});
	// The gate cases below run on watch only: onWheel has no page-specific branch and the live fixture costs
	// up to 120 s per iteration.
	test(`ignores a wheel notch with the wrong modifier when 'holdModifierKey' is on on ${watch}`, async ({ page }) => {
		await enableVolumeControl(page);
		await enableFeature(page, "scrollWheelVolumeControl.holdModifierKey");
		await setOption(page, "scrollWheelVolumeControl.modifierKey", "ctrlKey");
		// A modifier other than the configured one has to be rejected...
		await dispatchWheelNotches(page, watch, "up", 1, { altKey: true });
		await expectToStay(async () => getCurrentVolume(page, watch), volume, { page });
		// ...and so does a bare wheel, which is what the option is for.
		await dispatchWheelNotches(page, watch, "up", 1);
		await expectToStay(async () => getCurrentVolume(page, watch), volume, { page });
		// Control: the configured modifier is still accepted, so the windows above measure the gate rather
		// than a wheel event that never reached the listener.
		await dispatchWheelNotches(page, watch, "up", 1, { ctrlKey: true });
		await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(volume + steps);
	});
	test(`does not change the volume when 'holdRightClick' is on and no button is held on ${watch}`, async ({ page }) => {
		await enableVolumeControl(page);
		await enableFeature(page, "scrollWheelVolumeControl.holdRightClick");
		await dispatchWheelNotches(page, watch, "up", 1);
		await expectToStay(async () => getCurrentVolume(page, watch), volume, { page });
		// Control: the same notch with the right button held is accepted.
		await dispatchWheelNotches(page, watch, "up", 1, { buttons: 2 });
		await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(volume + steps);
	});
	test(`suppresses the context menu while right-click scrolling and restores it on ${watch}`, async ({ page }) => {
		await enableVolumeControl(page);
		await enableFeature(page, "scrollWheelVolumeControl.holdRightClick");
		await expectBodyWithoutClass(page, CONTEXT_MENU_CLASS);
		await dispatchWheelNotches(page, watch, "up", 1, { buttons: 2 });
		// The class is what keeps YouTube's context menu off the screen for the duration of the gesture.
		await expectBodyWithClass(page, CONTEXT_MENU_CLASS);
		await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(volume + steps);
		// Releasing the right button ends the gesture and gives the menu back.
		await dispatchMouseEventOnPlayer(page, "mouseup");
		await expectBodyWithoutClass(page, CONTEXT_MENU_CLASS);
		// Re-arm, and this time let the context menu event end it: the native menu is cancelled outright.
		await dispatchWheelNotches(page, watch, "up", 1, { buttons: 2 });
		await expectBodyWithClass(page, CONTEXT_MENU_CLASS);
		expect(await dispatchMouseEventOnPlayer(page, "contextmenu")).toBe(true);
		await expectBodyWithoutClass(page, CONTEXT_MENU_CLASS);
	});
	test(`yields to the speed control when its modifier is held on ${watch}`, async ({ page }) => {
		await enableVolumeControl(page);
		await setOption(page, "scrollWheelSpeedControl.steps", 0.25);
		await setOption(page, "scrollWheelSpeedControl.modifierKey", "altKey");
		await enableFeature(page, "scrollWheelSpeedControl.enabled");
		await waitForScrollWheelControl(page, "speed", true);
		await setValueOnYouTubePlayer(page, watch, "setPlaybackRate", 1);
		await expect.poll(async () => getCurrentSpeed(page, watch)).toBe(1);
		await dispatchWheelNotches(page, watch, "up", 1, { altKey: true });
		// The volume control has no modifier requirement here, so only the precedence rule stops it.
		await expectToStay(async () => getCurrentVolume(page, watch), volume, { page });
		expect(await getCurrentSpeed(page, watch)).toBe(1.25);
		// Without the speed modifier the same notch belongs to the volume control again.
		await dispatchWheelNotches(page, watch, "up", 1);
		await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(volume + steps);
	});
	test(`unmutes the player when the volume is scrolled while muted on ${watch}`, async ({ page }) => {
		await enableVolumeControl(page);
		await mutePlayer(page);
		await expect.poll(async () => isPlayerMuted(page), { timeout: 5000 }).toBe(true);
		await dispatchWheelNotches(page, watch, "up");
		await expect.poll(async () => isPlayerMuted(page), { timeout: 5000 }).toBe(false);
		await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(volume + steps);
	});
	test(`ignores wheel events over the volume boost button on ${watch}`, async ({ page }) => {
		await enableVolumeControl(page);
		await enableFeature(page, "volumeBoost.enabled");
		await setOption(page, "volumeBoost.mode", "per_video");
		await setOption(page, "volumeBoost.button.placement", right);
		await expect(page.locator(`.ytp-right-controls #${VOLUME_BOOST_BUTTON_ID}`)).toBeAttached({ timeout: 10000 });
		// The button lives inside the player, so the notch does reach the control's listener; the button has
		// its own wheel handler and the player volume must be left alone.
		await dispatchWheelOverElement(page, `#${VOLUME_BOOST_BUTTON_ID}`, "up");
		await expectToStay(async () => getCurrentVolume(page, watch), volume, { page });
		// Control: the same notch over the player itself does move the volume.
		await dispatchWheelNotches(page, watch, "up");
		await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(volume + steps);
	});
	test(`ignores wheel events over the YouTube settings panel on ${watch}`, async ({ page }) => {
		await enableVolumeControl(page);
		await page.locator("div#movie_player").hover();
		await page.locator(".ytp-settings-button").evaluate((button: HTMLButtonElement) => button.click());
		const settingsMenu = page.locator(SETTINGS_MENU_SELECTOR);
		await expect(settingsMenu).toBeVisible({ timeout: 10000 });
		// Scrolling inside the open panel has to scroll the panel, not the volume.
		await dispatchWheelOverElement(page, SETTINGS_MENU_SELECTOR, "up");
		await expectToStay(async () => getCurrentVolume(page, watch), volume, { page });
		// Control: the same notch over the player itself does move the volume.
		await dispatchWheelNotches(page, watch, "up");
		await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(volume + steps);
	});
	test(`keeps adjusting the volume after an in-page navigation to another video on ${watch}`, async ({ page }) => {
		test.setTimeout(120_000);
		await enableVolumeControl(page);
		// A genuine in-document navigation, which is the only path that runs onNavigate; YouTube reuses the
		// player element across it, so what this observes is that onNavigate leaves the control attached and
		// still driving the player.
		await spaNavigateToRelatedVideo(page);
		await waitForScrollWheelVolumeControl(page, true);
		await setVolume(page, volume, watch);
		await expect.poll(async () => getCurrentVolume(page, watch)).toBe(volume);
		await dispatchWheelNotches(page, watch, "up");
		await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(volume + steps);
	});
	test.describe("stepper", () => {
		test("applies every notch of a rapid wheel burst on watch", async ({ page }) => {
			await enableVolumeControl(page);
			// Five notches in one burst exceed the per-apply cap, so the stepper has to flush the remainder instead of dropping it.
			await dispatchWheelNotches(page, watch, "up", 5);
			await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(volume + 5 * steps);
		});
		test("applies an updated step size without reloading on watch", async ({ page }) => {
			await enableVolumeControl(page);
			await dispatchWheelNotches(page, watch, "up");
			await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(volume + steps);
			await setOption(page, "scrollWheelVolumeControl.steps", steps * 2);
			// The control snaps the volume to a multiple of the step size, so start the second notch from one.
			await setVolume(page, steps * 4, watch);
			await expect.poll(async () => getCurrentVolume(page, watch)).toBe(steps * 4);
			await dispatchWheelNotches(page, watch, "up");
			await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(steps * 6);
		});
		test("clamps and snaps the volume to a multiple of the step size on watch", async ({ page }) => {
			const stepSize = 7;
			// 10 is not a multiple of 7, so the result has to be snapped up to the next multiple.
			await enableVolumeControl(page, stepSize);
			await dispatchWheelNotches(page, watch, "up");
			await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(21);
			await setVolume(page, 98, watch);
			await expect.poll(async () => getCurrentVolume(page, watch)).toBe(98);
			// Snapping 98 + 7 up to a multiple of 7 gives 105, which has to be clamped to the maximum.
			await dispatchWheelNotches(page, watch, "up");
			await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(100);
		});
		test("stops adjusting volume once disabled on watch", async ({ page }) => {
			await enableVolumeControl(page);
			await dispatchWheelNotches(page, watch, "up");
			await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(volume + steps);
			await disableFeature(page, "scrollWheelVolumeControl.enabled");
			await waitForScrollWheelVolumeControl(page, false);
			await dispatchWheelNotches(page, watch, "up");
			await expectToStay(async () => getCurrentVolume(page, watch), volume + steps, { page });
			// Re-enabling has to re-attach on the same document, which is the disabled state's counterpart.
			await enableFeature(page, "scrollWheelVolumeControl.enabled");
			await waitForScrollWheelVolumeControl(page, true);
			await dispatchWheelNotches(page, watch, "up");
			await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(volume + 2 * steps);
		});
	});
});
