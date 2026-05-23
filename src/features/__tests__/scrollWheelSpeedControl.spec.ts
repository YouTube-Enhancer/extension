import { test } from "playwright.config";

import { metadata } from "@/src/features/scrollWheelSpeedControl/index.metadata";
import { adjustWithScrollWheel } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

// Speed control always requires a modifier key; start at 1.0 so both increase (→1.25) and decrease (→0.75) are in range
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
});
