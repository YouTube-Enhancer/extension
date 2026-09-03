import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/scrollWheelVolumeControl/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
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
			await expectToStay(async () => getCurrentVolume(page, watch), volume + steps, { page });
			// Re-enabling has to re-attach on the same document, which is the disabled state's counterpart.
			await enableFeature(page, "scrollWheelVolumeControl.enabled");
			await waitForScrollWheelVolumeControl(page, true);
			await dispatchWheelNotches(page, watch, "up");
			await expect.poll(async () => getCurrentVolume(page, watch), { timeout: 5000 }).toBe(volume + 2 * steps);
		});
	});
});
