import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/scrollWheelSpeedControl/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, volume } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import {
	adjustWithScrollWheel,
	dispatchWheelNotches,
	getCurrentSpeed,
	getCurrentVolume,
	setValueOnYouTubePlayer,
	setVolume,
	waitForScrollWheelControl
} from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

// Speed control always requires a modifier key; start at 1.0 so both increase (→1.25) and decrease (→0.75) are in range
const { home, watch } = pageTypeRecord;
const speed = 1.0;
const steps = 0.25;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
// "altKey" is the helper's default modifier, so the Alt cases are already covered by the per-page tests below.
const modifierKeys = ["ctrlKey", "shiftKey"] as const;
const OSD_SELECTOR = "canvas#yte-osd";

async function enableSpeedControl(page: Page, initialSpeed: number) {
	await navigateToPageType(page, watch);
	await setOption(page, "scrollWheelSpeedControl.steps", steps);
	await setOption(page, "scrollWheelSpeedControl.modifierKey", "altKey");
	await enableFeature(page, "scrollWheelSpeedControl.enabled");
	await waitForScrollWheelControl(page, "speed", true);
	await setValueOnYouTubePlayer(page, watch, "setPlaybackRate", initialSpeed);
	await expect.poll(async () => getCurrentSpeed(page, watch)).toBe(initialSpeed);
}
/** Reads the alpha channel of the on-screen display canvas and reports whether it painted anything at all. */
async function hasPaintedPixels(page: Page) {
	return page.evaluate((selector) => {
		const canvas = document.querySelector<HTMLCanvasElement>(selector);
		if (!canvas) return null;
		const context = canvas.getContext("2d");
		if (!context) return null;
		const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
		for (let index = 3; index < data.length; index += 4) {
			if (data[index] !== 0) return true;
		}
		return false;
	}, OSD_SELECTOR);
}

test.describe("scrollWheelSpeedControl", () => {
	for (const pageType of testPages) {
		test(`should increase speed on ${pageType}`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Speed", direction: "up", initialValue: speed, page, pageType, steps, withModifierKey: true });
		});
		test(`should decrease speed on ${pageType}`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Speed", direction: "down", initialValue: speed, page, pageType, steps, withModifierKey: true });
		});
		test(`should persist scroll wheel speed control after navigation on ${pageType}`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Speed", direction: "up", initialValue: speed, page, pageType, steps: 0.25, withModifierKey: true });
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			// Asserted in place: adjustWithScrollWheel would navigate again and re-enable the feature, which
			// would hide a listener that never re-attached after the navigation.
			await waitForScrollWheelControl(page, "speed", true);
			await setValueOnYouTubePlayer(page, pageType, "setPlaybackRate", speed);
			await expect.poll(async () => getCurrentSpeed(page, pageType)).toBe(speed);
			await dispatchWheelNotches(page, pageType, "up", 1, { altKey: true });
			await expect.poll(async () => getCurrentSpeed(page, pageType), { timeout: 5000 }).toBe(speed + steps);
		});
	}
	// The disable/re-enable transition has no shorts branch, and re-enabling on shorts is already exercised by the
	// increase/decrease tests above, so this case runs on watch only.
	test(`re-applies speed control after disable then re-enable on ${watch}`, async ({ page }) => {
		await adjustWithScrollWheel({ controlType: "Speed", direction: "up", initialValue: speed, page, pageType: watch, steps, withModifierKey: true });
		await disableFeature(page, "scrollWheelSpeedControl.enabled");
		await adjustWithScrollWheel({ controlType: "Speed", direction: "up", initialValue: speed, page, pageType: watch, steps, withModifierKey: true });
	});
	// The modifier gate is a single boolean lookup on the wheel event and the direction is decided independently by
	// the stepper sign, so only the increase direction is exercised per modifier.
	for (const modifierKey of modifierKeys) {
		test(`should increase speed when holding '${modifierKey === "ctrlKey" ? "Ctrl" : "Shift"}' modifier key`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Speed", direction: "up", initialValue: speed, modifierKey, page, steps, withModifierKey: true });
		});
	}
	test(`does not change the speed when scrolling without the configured modifier key on ${watch}`, async ({ page }) => {
		await enableSpeedControl(page, speed);
		// The speed control never claims a bare wheel; without the gate it would hijack page scrolling.
		await dispatchWheelNotches(page, watch, "up", 1);
		await expectToStay(async () => getCurrentSpeed(page, watch), speed, { page });
		// A modifier other than the configured one is rejected as well.
		await dispatchWheelNotches(page, watch, "up", 1, { shiftKey: true });
		await expectToStay(async () => getCurrentSpeed(page, watch), speed, { page });
		// Control: the configured modifier still steps the speed, so the windows above measure the gate and
		// not a wheel event that never reached the listener.
		await dispatchWheelNotches(page, watch, "up", 1, { altKey: true });
		await expect.poll(async () => getCurrentSpeed(page, watch), { timeout: 5000 }).toBe(speed + steps);
	});
	test(`shows the on-screen display when the speed changes on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		// The display options are read from the snapshot the control fetches when it attaches, so they have
		// to be written before the feature is enabled.
		await setOption(page, "onScreenDisplay.type", "text");
		await setOption(page, "onScreenDisplay.position", "top_left");
		await setOption(page, "onScreenDisplay.hideTime", 10000);
		await enableSpeedControl(page, speed);
		await expect(page.locator(OSD_SELECTOR)).not.toBeAttached();
		await dispatchWheelNotches(page, watch, "up", 1, { altKey: true });
		await expect.poll(async () => getCurrentSpeed(page, watch), { timeout: 5000 }).toBe(speed + steps);
		await expect(page.locator(OSD_SELECTOR)).toBeVisible({ timeout: 10000 });
		// An empty canvas would satisfy attachment; the new speed has to have been drawn on it.
		await expect.poll(async () => hasPaintedPixels(page), { timeout: 5000 }).toBe(true);
	});
	test(`speed control takes the wheel event when the volume control is also enabled on ${watch}`, async ({ page }) => {
		await enableSpeedControl(page, speed);
		await setOption(page, "scrollWheelVolumeControl.steps", 5);
		await enableFeature(page, "scrollWheelVolumeControl.enabled");
		await waitForScrollWheelControl(page, "volume", true);
		await setVolume(page, volume, watch);
		await expect.poll(async () => getCurrentVolume(page, watch)).toBe(volume);
		await dispatchWheelNotches(page, watch, "up", 1, { altKey: true });
		await expect.poll(async () => getCurrentSpeed(page, watch), { timeout: 5000 }).toBe(speed + steps);
		// The volume control has no modifier requirement of its own here, so only the precedence rule keeps
		// the same notch from moving the volume as well.
		await expectToStay(async () => getCurrentVolume(page, watch), volume, { page });
	});
	test.describe("stepper", () => {
		// YouTube's player API only reports rates up to 2x, so start low enough for a five-notch burst to stay in range.
		const burstStartSpeed = 0.5;
		test("applies every notch of a rapid wheel burst on watch", async ({ page }) => {
			await enableSpeedControl(page, burstStartSpeed);
			await dispatchWheelNotches(page, watch, "up", 5, { altKey: true });
			await expect.poll(async () => getCurrentSpeed(page, watch), { timeout: 5000 }).toBe(burstStartSpeed + 5 * steps);
		});
		test("applies an updated step size without reloading on watch", async ({ page }) => {
			await enableSpeedControl(page, speed);
			await dispatchWheelNotches(page, watch, "up", 1, { altKey: true });
			await expect.poll(async () => getCurrentSpeed(page, watch), { timeout: 5000 }).toBe(speed + steps);
			// The step size is read from the live config on every apply, so a new value has to take effect
			// without reloading the page.
			await setOption(page, "scrollWheelSpeedControl.steps", steps * 2);
			await setValueOnYouTubePlayer(page, watch, "setPlaybackRate", speed);
			await expect.poll(async () => getCurrentSpeed(page, watch)).toBe(speed);
			await dispatchWheelNotches(page, watch, "up", 1, { altKey: true });
			await expect.poll(async () => getCurrentSpeed(page, watch), { timeout: 5000 }).toBe(speed + steps * 2);
		});
		test("stops adjusting speed once disabled on watch", async ({ page }) => {
			await enableSpeedControl(page, speed);
			await dispatchWheelNotches(page, watch, "up", 1, { altKey: true });
			await expect.poll(async () => getCurrentSpeed(page, watch), { timeout: 5000 }).toBe(speed + steps);
			await disableFeature(page, "scrollWheelSpeedControl.enabled");
			await waitForScrollWheelControl(page, "speed", false);
			await dispatchWheelNotches(page, watch, "up", 1, { altKey: true });
			await expectToStay(async () => getCurrentSpeed(page, watch), speed + steps, { page });
		});
	});
});
