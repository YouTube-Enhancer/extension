import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/scrollWheelSpeedControl/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { adjustWithScrollWheel, dispatchWheelNotches, getCurrentSpeed, setValueOnYouTubePlayer } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

// Speed control always requires a modifier key; start at 1.0 so both increase (→1.25) and decrease (→0.75) are in range
const { home, watch } = pageTypeRecord;
const speed = 1.0;
const steps = 0.25;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const modifierKeys = ["altKey", "ctrlKey", "shiftKey"] as const;

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
			await disableFeature(page, "scrollWheelSpeedControl.enabled");
			await adjustWithScrollWheel({ controlType: "Speed", direction: "up", initialValue: speed, page, pageType, steps: 0.25, withModifierKey: true });
		});
		test(`re-applies speed control after disable then re-enable on ${pageType}`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Speed", direction: "up", initialValue: speed, page, pageType, steps, withModifierKey: true });
			await disableFeature(page, "scrollWheelSpeedControl.enabled");
			await adjustWithScrollWheel({ controlType: "Speed", direction: "up", initialValue: speed, page, pageType, steps, withModifierKey: true });
		});
	}
	for (const modifierKey of modifierKeys) {
		test(`should increase speed when holding '${
			modifierKey === "altKey" ? "Alt"
			: modifierKey === "ctrlKey" ? "Ctrl"
			: "Shift"
		}' modifier key`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Speed", direction: "up", initialValue: speed, modifierKey, page, steps, withModifierKey: true });
		});
		test(`should decrease speed when holding '${
			modifierKey === "altKey" ? "Alt"
			: modifierKey === "ctrlKey" ? "Ctrl"
			: "Shift"
		}' modifier key`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Speed", direction: "down", initialValue: speed, modifierKey, page, steps, withModifierKey: true });
		});
	}
	test.describe("stepper", () => {
		async function enableSpeedControl(page: Page) {
			await navigateToPageType(page, watch);
			await setOption(page, "scrollWheelSpeedControl.steps", steps);
			await setOption(page, "scrollWheelSpeedControl.modifierKey", "altKey");
			await enableFeature(page, "scrollWheelSpeedControl.enabled");
			// The speed control leaves no DOM marker, so give it a moment to attach its listeners.
			await page.waitForTimeout(1000);
			await setValueOnYouTubePlayer(page, watch, "setPlaybackRate", speed);
			await expect.poll(async () => getCurrentSpeed(page, watch)).toBe(speed);
		}
		test("applies every notch of a rapid wheel burst on watch", async ({ page }) => {
			await enableSpeedControl(page);
			await dispatchWheelNotches(page, watch, "up", 5, { altKey: true });
			await expect.poll(async () => getCurrentSpeed(page, watch), { timeout: 5000 }).toBe(speed + 5 * steps);
		});
		test("stops adjusting speed once disabled on watch", async ({ page }) => {
			await enableSpeedControl(page);
			await dispatchWheelNotches(page, watch, "up", 1, { altKey: true });
			await expect.poll(async () => getCurrentSpeed(page, watch), { timeout: 5000 }).toBe(speed + steps);
			await disableFeature(page, "scrollWheelSpeedControl.enabled");
			await page.waitForTimeout(1000);
			await dispatchWheelNotches(page, watch, "up", 1, { altKey: true });
			await page.waitForTimeout(1000);
			expect(await getCurrentSpeed(page, watch)).toBe(speed + steps);
		});
	});
});
