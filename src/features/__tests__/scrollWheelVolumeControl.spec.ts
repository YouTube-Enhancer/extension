import { test } from "playwright.config";

import { volume } from "@/src/utils/_tests/constants";
import { adjustWithScrollWheel } from "@/src/utils/_tests/player";

const testPages = ["watch", "live", "shorts"] as const;
const modifierKeys = ["altKey", "ctrlKey", "shiftKey"] as const;

test.describe("scrollWheelVolumeControl", () => {
	for (const pageType of testPages) {
		test(`should increase volume on ${pageType}`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Volume", direction: "up", page, pageType, value: volume });
		});
		test(`should decrease volume on ${pageType}`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Volume", direction: "down", page, pageType, value: volume });
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
					modifierKey,
					page,
					value: volume,
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
					modifierKey,
					page,
					value: volume,
					withModifierKey: true,
					withRightClick
				});
			});
		}
	}
	test("should increase volume when holding 'Right' click", async ({ page }) => {
		await adjustWithScrollWheel({ controlType: "Volume", direction: "up", page, value: volume, withRightClick: true });
	});
	test("should decrease volume when holding 'Right' click", async ({ page }) => {
		await adjustWithScrollWheel({ controlType: "Volume", direction: "down", page, value: volume, withRightClick: true });
	});
});
