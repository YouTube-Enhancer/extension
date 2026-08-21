import { test } from "playwright.config";

import { metadata } from "@/src/features/scrollWheelSpeedControl/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { adjustWithScrollWheel } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

// Speed control always requires a modifier key; start at 1.0 so both increase (→1.25) and decrease (→0.75) are in range
const { home } = pageTypeRecord;
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
});
