import { test } from "playwright.config";

import { adjustWithScrollWheel } from "@/src/utils/_tests/player";

export const speed = 0.25;
const testPages = ["watch", "shorts"] as const;
const modifierKeys = ["altKey", "ctrlKey", "shiftKey"] as const;

test.describe("scrollWheelSpeedControl", () => {
	for (const pageType of testPages) {
		test(`should increase speed on ${pageType}`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Speed", direction: "up", page, pageType, value: speed });
		});
		test(`should decrease speed on ${pageType}`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Speed", direction: "down", page, pageType, value: speed });
		});
	}
	for (const modifierKey of modifierKeys) {
		test(`should increase speed when holding '${
			modifierKey === "altKey" ? "Alt"
			: modifierKey === "ctrlKey" ? "Ctrl"
			: "Shift"
		}' modifier key`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Speed", direction: "up", modifierKey, page, value: speed, withModifierKey: true });
		});
		test(`should decrease speed when holding '${
			modifierKey === "altKey" ? "Alt"
			: modifierKey === "ctrlKey" ? "Ctrl"
			: "Shift"
		}' modifier key`, async ({ page }) => {
			await adjustWithScrollWheel({ controlType: "Speed", direction: "down", modifierKey, page, value: speed, withModifierKey: true });
		});
	}
});
