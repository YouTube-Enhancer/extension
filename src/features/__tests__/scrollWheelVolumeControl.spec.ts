import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/scrollWheelVolumeControl/index.metadata";
import { pageTypeRecord, volume } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { adjustWithScrollWheel, dispatchWheelNotches, getCurrentVolume, setVolume, waitForScrollWheelVolumeControl } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const { home, watch } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const modifierKeys = ["altKey", "ctrlKey", "shiftKey"] as const;

test.describe("scrollWheelVolumeControl", () => {
	for (const pageType of testPages) {
		test(`should increase volume on ${pageType}`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Volume", direction: "up", initialValue: volume, page, pageType, steps: 5 });
		});
		test(`should decrease volume on ${pageType}`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Volume", direction: "down", initialValue: volume, page, pageType, steps: 5 });
		});
		test(`should persist volume control after navigation on ${pageType}`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Volume", direction: "up", initialValue: volume, page, pageType, steps: 5 });
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "scrollWheelVolumeControl.enabled");
			await adjustWithScrollWheel({ controlType: "Volume", direction: "up", initialValue: volume, page, pageType, steps: 5 });
		});
		test(`re-applies volume control after disable then re-enable on ${pageType}`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Volume", direction: "up", initialValue: volume, page, pageType, steps: 5 });
			await disableFeature(page, "scrollWheelVolumeControl.enabled");
			await adjustWithScrollWheel({ controlType: "Volume", direction: "up", initialValue: volume, page, pageType, steps: 5 });
		});
	}
	for (const modifierKey of modifierKeys) {
		for (const withRightClick of [false, true] as const) {
			const suffix = withRightClick ? " and holding 'Right' click" : "";
			test(`should increase volume when holding '${
				modifierKey === "altKey" ? "Alt"
				: modifierKey === "ctrlKey" ? "Ctrl"
				: "Shift"
			}' modifier key${suffix}`, async ({ page }) => {
				await adjustWithScrollWheel({
					controlType: "Volume",
					direction: "up",
					initialValue: volume,
					modifierKey,
					page,
					steps: 5,
					withModifierKey: true,
					withRightClick
				});
			});
			test(`should decrease volume when holding '${
				modifierKey === "altKey" ? "Alt"
				: modifierKey === "ctrlKey" ? "Ctrl"
				: "Shift"
			}' modifier key${suffix}`, async ({ page }) => {
				await adjustWithScrollWheel({
					controlType: "Volume",
					direction: "down",
					initialValue: volume,
					modifierKey,
					page,
					steps: 5,
					withModifierKey: true,
					withRightClick
				});
			});
		}
	}
	test("should increase volume when holding 'Right' click", async ({ page }) => {
		await adjustWithScrollWheel({ controlType: "Volume", direction: "up", initialValue: volume, page, steps: 5, withRightClick: true });
	});
	test("should decrease volume when holding 'Right' click", async ({ page }) => {
		await adjustWithScrollWheel({ controlType: "Volume", direction: "down", initialValue: volume, page, steps: 5, withRightClick: true });
	});
	test.describe("stepper", () => {
		const steps = 5;
		async function enableVolumeControl(page: Page) {
			await navigateToPageType(page, watch);
			await setOption(page, "scrollWheelVolumeControl.steps", steps);
			await enableFeature(page, "scrollWheelVolumeControl.enabled");
			await waitForScrollWheelVolumeControl(page, true);
			await setVolume(page, volume, watch);
			await expect.poll(async () => getCurrentVolume(page, watch)).toBe(volume);
		}
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
		test("stops adjusting volume once disabled on watch", async ({ page }) => {
			await enableVolumeControl(page);
			await dispatchWheelNotches(page, watch, "up");
			await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(volume + steps);
			await disableFeature(page, "scrollWheelVolumeControl.enabled");
			await waitForScrollWheelVolumeControl(page, false);
			await dispatchWheelNotches(page, watch, "up");
			await page.waitForTimeout(1000);
			expect(await getCurrentVolume(page, watch)).toBe(volume + steps);
		});
	});
});
