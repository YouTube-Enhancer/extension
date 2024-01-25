import { adjustWithScrollWheel, disableFeature, enableFeature, navigateToOptionsPage, test, volume } from "../../../playwright.config";

test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});

test("should enable scroll wheel volume control", async ({ page }) => {
	await enableFeature(page, "enable_scroll_wheel_volume_control");
});
test("should disable scroll wheel volume control", async ({ page }) => {
	await disableFeature(page, "enable_scroll_wheel_volume_control");
});
test("should enable scroll wheel volume control modifier key", async ({ page }) => {
	await enableFeature(page, "enable_scroll_wheel_volume_control_hold_modifier_key");
});
test("should disable scroll wheel volume control modifier key", async ({ page }) => {
	await disableFeature(page, "enable_scroll_wheel_volume_control_hold_modifier_key");
});
test("should enable scroll wheel volume control hold right click", async ({ page }) => {
	await enableFeature(page, "enable_scroll_wheel_volume_control_hold_right_click");
});
test("should disable scroll wheel volume control hold right click", async ({ page }) => {
	await disableFeature(page, "enable_scroll_wheel_volume_control_hold_right_click");
});
test("should increase volume", async ({ page }) => {
	await adjustWithScrollWheel({ controlType: "volume", direction: "up", page, value: volume });
});
test("should decrease volume", async ({ page }) => {
	await adjustWithScrollWheel({ controlType: "volume", direction: "down", page, value: volume });
});
test("should increase volume when holding 'Alt' modifier key", async ({ page }) => {
	await adjustWithScrollWheel({ controlType: "volume", direction: "up", modifierKey: "altKey", page, value: volume, withModifierKey: true });
});
test("should decrease volume when holding 'Alt' modifier key", async ({ page }) => {
	await adjustWithScrollWheel({ controlType: "volume", direction: "down", modifierKey: "altKey", page, value: volume, withModifierKey: true });
});
test("should increase volume when holding 'Ctrl' modifier key", async ({ page }) => {
	await adjustWithScrollWheel({ controlType: "volume", direction: "up", modifierKey: "ctrlKey", page, value: volume, withModifierKey: true });
});
test("should decrease volume when holding 'Ctrl' modifier key", async ({ page }) => {
	await adjustWithScrollWheel({ controlType: "volume", direction: "down", modifierKey: "ctrlKey", page, value: volume, withModifierKey: true });
});
test("should increase volume when holding 'Shift' modifier key", async ({ page }) => {
	await adjustWithScrollWheel({ controlType: "volume", direction: "up", modifierKey: "shiftKey", page, value: volume, withModifierKey: true });
});
test("should decrease volume when holding 'Shift' modifier key", async ({ page }) => {
	await adjustWithScrollWheel({ controlType: "volume", direction: "down", modifierKey: "shiftKey", page, value: volume, withModifierKey: true });
});
test("should increase volume when holding 'Right' click", async ({ page }) => {
	await adjustWithScrollWheel({ controlType: "volume", direction: "up", page, value: volume, withRightClick: true });
});
test("should decrease volume when holding 'Right' click", async ({ page }) => {
	await adjustWithScrollWheel({ controlType: "volume", direction: "down", page, value: volume, withRightClick: true });
});
test("should increase volume when holding 'Alt' modifier key and holding 'Right' click", async ({ page }) => {
	await adjustWithScrollWheel({
		controlType: "volume",
		direction: "up",
		modifierKey: "altKey",
		page,
		value: volume,
		withModifierKey: true,
		withRightClick: true
	});
});
test("should decrease volume when holding 'Alt' modifier key and holding 'Right' click", async ({ page }) => {
	await adjustWithScrollWheel({
		controlType: "volume",
		direction: "down",
		modifierKey: "altKey",
		page,
		value: volume,
		withModifierKey: true,
		withRightClick: true
	});
});
test("should increase volume when holding 'Ctrl' modifier key and holding 'Right' click", async ({ page }) => {
	await adjustWithScrollWheel({
		controlType: "volume",
		direction: "up",
		modifierKey: "ctrlKey",
		page,
		value: volume,
		withModifierKey: true,
		withRightClick: true
	});
});
test("should decrease volume when holding 'Ctrl' modifier key and holding 'Right' click", async ({ page }) => {
	await adjustWithScrollWheel({
		controlType: "volume",
		direction: "down",
		modifierKey: "ctrlKey",
		page,
		value: volume,
		withModifierKey: true,
		withRightClick: true
	});
});
test("should increase volume when holding 'Shift' modifier key and holding 'Right' click", async ({ page }) => {
	await adjustWithScrollWheel({
		controlType: "volume",
		direction: "up",
		modifierKey: "shiftKey",
		page,
		value: volume,
		withModifierKey: true,
		withRightClick: true
	});
});
test("should decrease volume when holding 'Shift' modifier key and holding 'Right' click", async ({ page }) => {
	await adjustWithScrollWheel({
		controlType: "volume",
		direction: "down",
		modifierKey: "shiftKey",
		page,
		value: volume,
		withModifierKey: true,
		withRightClick: true
	});
});
