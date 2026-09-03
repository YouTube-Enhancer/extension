import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { pageTypeRecord, volume } from "@/src/utils/_tests/constants";
import { enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { dispatchWheelNotches, getCurrentVolume, setVolume, waitForScrollWheelVolumeControl } from "@/src/utils/_tests/player";

const { watch } = pageTypeRecord;
const OSD_SELECTOR = "canvas#yte-osd";

async function readDisplayPosition(page: Page) {
	return page.evaluate((selector) => {
		const canvas = document.querySelector<HTMLCanvasElement>(selector);
		if (!canvas) return null;
		const {
			style: { bottom, left, right, top }
		} = canvas;
		return { bottom, left, right, top };
	}, OSD_SELECTOR);
}
// The on-screen display is driven by the scroll wheel volume control, so every test adjusts the volume to show it.
async function setupVolumeControl(page: Page) {
	await navigateToPageType(page, watch);
	await setOption(page, "onScreenDisplay.type", "text");
	await setOption(page, "onScreenDisplay.position", "top_left");
	await setOption(page, "onScreenDisplay.padding", 0);
	await setOption(page, "onScreenDisplay.hideTime", 5000);
	await setOption(page, "scrollWheelVolumeControl.steps", 5);
	await enableFeature(page, "scrollWheelVolumeControl.enabled");
	await waitForScrollWheelVolumeControl(page, true);
	await setVolume(page, volume, watch);
	await expect.poll(async () => getCurrentVolume(page, watch)).toBe(volume);
}

test.describe("onScreenDisplay", () => {
	test("applies a position change without reloading on watch", async ({ page }) => {
		await setupVolumeControl(page);
		await dispatchWheelNotches(page, watch, "up");
		await expect(page.locator(OSD_SELECTOR)).toBeAttached({ timeout: 5000 });
		await expect.poll(async () => readDisplayPosition(page)).toMatchObject({ bottom: "", left: "0px", right: "", top: "0px" });
		await setOption(page, "onScreenDisplay.position", "bottom_right");
		await dispatchWheelNotches(page, watch, "up");
		await expect
			.poll(async () => readDisplayPosition(page), { timeout: 5000 })
			.toMatchObject({
				bottom: expect.stringMatching(/^\d+(\.\d+)?px$/),
				left: "",
				right: "0px",
				top: ""
			});
	});
	test("applies a hide time change without reloading on watch", async ({ page }) => {
		await setupVolumeControl(page);
		await setOption(page, "onScreenDisplay.hideTime", 1000);
		await dispatchWheelNotches(page, watch, "up");
		await expect(page.locator(OSD_SELECTOR)).toBeAttached({ timeout: 5000 });
		// Must disappear well inside the 5000 ms the setup used, otherwise a regression that ignores hideTime passes.
		await expect(page.locator(OSD_SELECTOR)).not.toBeAttached({ timeout: 2500 });
		await setOption(page, "onScreenDisplay.hideTime", 8000);
		await dispatchWheelNotches(page, watch, "up");
		await expect(page.locator(OSD_SELECTOR)).toBeAttached({ timeout: 5000 });
		await page.waitForTimeout(2000);
		await expect(page.locator(OSD_SELECTOR)).toBeAttached();
	});
});
