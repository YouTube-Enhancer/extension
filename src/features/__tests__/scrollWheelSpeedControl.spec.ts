import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/scrollWheelSpeedControl/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import {
	adjustWithScrollWheel,
	dispatchWheelNotches,
	getCurrentSpeed,
	setValueOnYouTubePlayer,
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
	test.describe("stepper", () => {
		// YouTube's player API only reports rates up to 2x, so start low enough for a five-notch burst to stay in range.
		const burstStartSpeed = 0.5;
		async function enableSpeedControl(page: Page, initialSpeed: number) {
			await navigateToPageType(page, watch);
			await setOption(page, "scrollWheelSpeedControl.steps", steps);
			await setOption(page, "scrollWheelSpeedControl.modifierKey", "altKey");
			await enableFeature(page, "scrollWheelSpeedControl.enabled");
			await waitForScrollWheelControl(page, "speed", true);
			await setValueOnYouTubePlayer(page, watch, "setPlaybackRate", initialSpeed);
			await expect.poll(async () => getCurrentSpeed(page, watch)).toBe(initialSpeed);
		}
		test("applies every notch of a rapid wheel burst on watch", async ({ page }) => {
			await enableSpeedControl(page, burstStartSpeed);
			await dispatchWheelNotches(page, watch, "up", 5, { altKey: true });
			await expect.poll(async () => getCurrentSpeed(page, watch), { timeout: 5000 }).toBe(burstStartSpeed + 5 * steps);
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
