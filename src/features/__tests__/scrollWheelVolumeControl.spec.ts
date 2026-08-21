import { test } from "playwright.config";

import { metadata } from "@/src/features/scrollWheelVolumeControl/index.metadata";
import { volume } from "@/src/utils/_tests/constants";
import { adjustWithScrollWheel } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
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
});
