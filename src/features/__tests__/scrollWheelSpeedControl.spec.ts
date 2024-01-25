import { adjustWithScrollWheel, disableFeature, enableFeature, navigateToOptionsPage, speed, test } from "../../../playwright.config";

test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});

test("should enable scroll wheel speed control", async ({ page }) => {
	await enableFeature(page, "enable_scroll_wheel_speed_control");
});
test("should disable scroll wheel speed control", async ({ page }) => {
	await disableFeature(page, "enable_scroll_wheel_speed_control");
});
test("should increase speed when holding 'Alt' modifier key", async ({ page }) => {
	await adjustWithScrollWheel({ controlType: "speed", direction: "up", modifierKey: "altKey", page, value: speed, withModifierKey: true });
});
test("should decrease speed when holding 'Alt' modifier key", async ({ page }) => {
	await adjustWithScrollWheel({ controlType: "speed", direction: "down", modifierKey: "altKey", page, value: speed, withModifierKey: true });
});
test("should increase speed when holding 'Ctrl' modifier key", async ({ page }) => {
	await adjustWithScrollWheel({ controlType: "speed", direction: "up", modifierKey: "ctrlKey", page, value: speed, withModifierKey: true });
});
test("should decrease speed when holding 'Ctrl' modifier key", async ({ page }) => {
	await adjustWithScrollWheel({ controlType: "speed", direction: "down", modifierKey: "ctrlKey", page, value: speed, withModifierKey: true });
});
test("should increase speed when holding 'Shift' modifier key", async ({ page }) => {
	await adjustWithScrollWheel({ controlType: "speed", direction: "up", modifierKey: "shiftKey", page, value: speed, withModifierKey: true });
});
test("should decrease speed when holding 'Shift' modifier key", async ({ page }) => {
	await adjustWithScrollWheel({ controlType: "speed", direction: "down", modifierKey: "shiftKey", page, value: speed, withModifierKey: true });
});
