import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, volume } from "@/src/utils/_tests/constants";
import { enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { dispatchWheelNotches, getCurrentVolume, setVolume, waitForScrollWheelVolumeControl } from "@/src/utils/_tests/player";

const { shorts, watch } = pageTypeRecord;
const OSD_SELECTOR = "canvas#yte-osd";
/** Long enough that a display survives the option writes and polls of a multi-step test. */
const LONG_HIDE_TIME = 10000;
/** The manager clamps the font size to 48..72 px and adds 15 px, so a "text" canvas is 63..87 px high. */
const TEXT_CANVAS_MIN_HEIGHT = 63;
const TEXT_CANVAS_MAX_HEIGHT = 87;

/** Reads the alpha channel of every pixel and reports whether the display painted anything at all. */
async function hasVisiblePixels(page: Page) {
	return page.evaluate((selector) => {
		const canvas = document.querySelector<HTMLCanvasElement>(selector);
		if (!canvas) return null;
		const context = canvas.getContext("2d");
		if (!context) return null;
		const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
		for (let index = 3; index < data.length; index += 4) {
			if (data[index] !== 0) return true;
		}
		return false;
	}, OSD_SELECTOR);
}

/** Samples the middle of the canvas, which for the "line" type sits inside the filled bar. */
async function readCanvasCenterPixel(page: Page) {
	return page.evaluate((selector) => {
		const canvas = document.querySelector<HTMLCanvasElement>(selector);
		if (!canvas) return null;
		const context = canvas.getContext("2d");
		if (!context) return null;
		const {
			data: [r, g, b, a]
		} = context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1);
		return { a, b, g, r };
	}, OSD_SELECTOR);
}

async function readCanvasSize(page: Page) {
	return page.evaluate((selector) => {
		const canvas = document.querySelector<HTMLCanvasElement>(selector);
		if (!canvas) return null;
		const { height, width } = canvas;
		return { height, width };
	}, OSD_SELECTOR);
}

async function readDisplayPosition(page: Page) {
	return page.evaluate((selector) => {
		const canvas = document.querySelector<HTMLCanvasElement>(selector);
		if (!canvas) return null;
		const {
			style: { bottom, left, right, top, transform }
		} = canvas;
		return { bottom, left, right, top, transform };
	}, OSD_SELECTOR);
}
// The on-screen display is driven by the scroll wheel volume control, so every test adjusts the volume to show it.
async function setupVolumeControl(page: Page, pageType: PageType = watch) {
	await navigateToPageType(page, pageType);
	await setOption(page, "onScreenDisplay.type", "text");
	await setOption(page, "onScreenDisplay.position", "top_left");
	await setOption(page, "onScreenDisplay.padding", 0);
	await setOption(page, "onScreenDisplay.hideTime", 5000);
	await setOption(page, "scrollWheelVolumeControl.steps", 5);
	await enableFeature(page, "scrollWheelVolumeControl.enabled");
	await waitForScrollWheelVolumeControl(page, true);
	await setVolume(page, volume, pageType);
	await expect.poll(async () => getCurrentVolume(page, pageType)).toBe(volume);
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
	test("applies the display type without reloading on watch", async ({ page }) => {
		await setupVolumeControl(page);
		await setOption(page, "onScreenDisplay.hideTime", LONG_HIDE_TIME);
		// Every arm of the switch sizes the canvas differently, so the geometry is what distinguishes them.
		await dispatchWheelNotches(page, watch, "up");
		await expect(page.locator(OSD_SELECTOR)).toBeAttached({ timeout: 5000 });
		const textSize = await readCanvasSize(page);
		expect(textSize?.height).toBeGreaterThanOrEqual(TEXT_CANVAS_MIN_HEIGHT);
		expect(textSize?.height).toBeLessThanOrEqual(TEXT_CANVAS_MAX_HEIGHT);
		expect(await hasVisiblePixels(page)).toBe(true);

		// A circle is always radius 32.5 + 5 px stroke on each side plus a 20 px margin.
		await setOption(page, "onScreenDisplay.type", "circle");
		await dispatchWheelNotches(page, watch, "up");
		await expect.poll(async () => readCanvasSize(page), { timeout: 5000 }).toEqual({ height: 95, width: 95 });

		// A line is 5 px tall plus a 25 px margin and as wide as the value it reports.
		await setOption(page, "onScreenDisplay.type", "line");
		await dispatchWheelNotches(page, watch, "up");
		await expect.poll(async () => readCanvasSize(page), { timeout: 5000 }).toMatchObject({ height: 30 });
		const currentVolume = await getCurrentVolume(page, watch);
		expect(currentVolume).toBeTruthy();
		expect((await readCanvasSize(page))?.width).toBe(currentVolume! + 25);

		// no_display still creates, positions and appends the canvas - it only never paints on it.
		await setOption(page, "onScreenDisplay.type", "no_display");
		await dispatchWheelNotches(page, watch, "up");
		await expect.poll(async () => readCanvasSize(page), { timeout: 5000 }).toEqual({ height: 150, width: 300 });
		expect(await hasVisiblePixels(page)).toBe(false);
	});
	test("applies the display color and opacity on watch", async ({ page }) => {
		await setupVolumeControl(page);
		await setOption(page, "onScreenDisplay.hideTime", LONG_HIDE_TIME);
		// "line" is a flat fill, so the sampled pixel is the configured colour rather than an antialiased glyph edge.
		await setOption(page, "onScreenDisplay.type", "line");
		await setOption(page, "onScreenDisplay.opacity", 100);
		await setOption(page, "onScreenDisplay.color", "red");
		await dispatchWheelNotches(page, watch, "up");
		await expect(page.locator(OSD_SELECTOR)).toBeAttached({ timeout: 5000 });
		await expect.poll(async () => readCanvasCenterPixel(page), { timeout: 5000 }).toEqual({ a: 255, b: 0, g: 0, r: 255 });

		await setOption(page, "onScreenDisplay.color", "blue");
		await dispatchWheelNotches(page, watch, "up");
		await expect.poll(async () => readCanvasCenterPixel(page), { timeout: 5000 }).toEqual({ a: 255, b: 255, g: 0, r: 0 });

		// displayOpacity feeds globalAlpha, so the identical fill has to land with a lower alpha.
		await setOption(page, "onScreenDisplay.opacity", 25);
		await dispatchWheelNotches(page, watch, "up");
		await expect.poll(async () => (await readCanvasCenterPixel(page))?.a, { timeout: 5000 }).toBeLessThan(200);
		expect((await readCanvasCenterPixel(page))?.a).toBeGreaterThan(0);
	});
	test("offsets the display by the configured padding on watch", async ({ page }) => {
		await setupVolumeControl(page);
		await setOption(page, "onScreenDisplay.hideTime", LONG_HIDE_TIME);
		await setOption(page, "onScreenDisplay.padding", 40);
		await dispatchWheelNotches(page, watch, "up");
		// top_left carries no player-chrome term, so both offsets are exactly the configured padding.
		await expect.poll(async () => readDisplayPosition(page), { timeout: 5000 }).toMatchObject({ bottom: "", left: "40px", right: "", top: "40px" });
		// A padding larger than the player is clamped to the player's largest dimension.
		const playerMaxDimension = await page.evaluate(() => {
			const player = document.querySelector<HTMLElement>("div#movie_player");
			return player ? Math.max(player.clientWidth, player.clientHeight) : null;
		});
		expect(playerMaxDimension).toBeTruthy();
		await setOption(page, "onScreenDisplay.padding", playerMaxDimension! + 5000);
		await dispatchWheelNotches(page, watch, "up");
		await expect
			.poll(async () => readDisplayPosition(page), { timeout: 5000 })
			.toMatchObject({ left: `${playerMaxDimension}px`, top: `${playerMaxDimension}px` });
	});
	test("positions the display in the center and above the player chrome on watch", async ({ page }) => {
		await setupVolumeControl(page);
		await setOption(page, "onScreenDisplay.hideTime", LONG_HIDE_TIME);
		// "center" is the shipped default and the only branch that emits a transform.
		await setOption(page, "onScreenDisplay.position", "center");
		await dispatchWheelNotches(page, watch, "up");
		await expect
			.poll(async () => readDisplayPosition(page), { timeout: 5000 })
			.toMatchObject({ bottom: "", left: "50%", right: "", top: "50%", transform: "translate(-50%, -50%)" });

		// The bottom offsets add the height of the player controls so the display never sits behind them.
		await setOption(page, "onScreenDisplay.position", "bottom_left");
		await dispatchWheelNotches(page, watch, "up");
		const chromeHeight = await page.evaluate(() => {
			const chrome = document.querySelector<HTMLElement>(".ytp-chrome-bottom");
			if (!chrome) return null;
			const { bottom, top } = chrome.getBoundingClientRect();
			return Math.round(bottom - top);
		});
		expect(chromeHeight).toBeGreaterThan(0);
		await expect
			.poll(async () => readDisplayPosition(page), { timeout: 5000 })
			.toMatchObject({ bottom: `${chromeHeight}px`, left: "0px", right: "", top: "" });
	});
	test("offsets a top display below the shorts player's control bar on shorts", async ({ page }) => {
		await setupVolumeControl(page, shorts);
		await setOption(page, "onScreenDisplay.hideTime", LONG_HIDE_TIME);
		// Play, mute, captions, menu and fullscreen sit in a bar over the top of the video, in the reel that holds the
		// player. The bar is part of the layout YouTube serves, so it has to be there; a missing bar is a failure.
		const barHeight = await page.evaluate(() => {
			const bar = document.querySelector("#shorts-player")?.closest("ytd-reel-video-renderer")?.querySelector<HTMLElement>(".player-controls");
			if (!bar) return null;
			const style = getComputedStyle(bar);
			return bar.offsetHeight + parseInt(style.marginTop, 10) + parseInt(style.marginBottom, 10);
		});
		expect(barHeight).toBeGreaterThan(0);
		await dispatchWheelNotches(page, shorts, "up");
		await expect(page.locator(OSD_SELECTOR)).toBeAttached({ timeout: 10000 });
		await expect.poll(async () => readDisplayPosition(page), { timeout: 5000 }).toMatchObject({ left: "0px", top: `${barHeight}px` });
	});
	test("keeps a bottom display clear of the title block when it lies over the video on shorts", async ({ page }) => {
		await setupVolumeControl(page, shorts);
		await setOption(page, "onScreenDisplay.hideTime", LONG_HIDE_TIME);
		await setOption(page, "onScreenDisplay.position", "bottom_left");
		// The title block (channel, title, tags) sits beside the video when the window has the room, and over the
		// bottom of the video when it has not. Beside, it takes nothing from the display's room; over the video the
		// display has to clear it, by the manager's own rule: the block's box without its padding plus a 10 px gap.
		const readTitleBlock = () =>
			page.evaluate(() => {
				const player = document.querySelector<HTMLElement>("#shorts-player");
				const block = player
					?.closest("ytd-reel-video-renderer")
					?.querySelector<HTMLElement>(".ytReelPlayerOverlayViewModelMetadataContainerMetapanel");
				if (!player || !block) return null;
				const blockRect = block.getBoundingClientRect();
				const videoRect = player.getBoundingClientRect();
				const style = getComputedStyle(block);
				const visualHeight =
					block.offsetHeight -
					(parseInt(style.marginTop, 10) + parseInt(style.marginBottom, 10) + parseInt(style.paddingTop, 10) + parseInt(style.paddingBottom, 10)) +
					10;
				return { overlaps: blockRect.right > videoRect.left && blockRect.left < videoRect.right, visualHeight };
			});
		const expectBottomOffset = async (offset: number) => {
			await dispatchWheelNotches(page, shorts, "up");
			await expect(page.locator(OSD_SELECTOR)).toBeAttached({ timeout: 10000 });
			await expect.poll(async () => readDisplayPosition(page), { timeout: 5000 }).toMatchObject({ bottom: `${offset}px`, left: "0px", top: "" });
		};
		const initial = await readTitleBlock();
		expect(initial).not.toBeNull();
		test
			.info()
			.annotations.push({
				description: initial!.overlaps ? "title block over the video at the default size" : "title block beside the video at the default size",
				type: "note"
			});
		await expectBottomOffset(initial!.overlaps ? initial!.visualHeight : 0);
		// A short window puts the block over the video (1280x800 does on this layout); the next display clears it.
		await page.setViewportSize({ height: 800, width: 1280 });
		await expect.poll(async () => (await readTitleBlock())?.overlaps, { timeout: 10000 }).toBe(true);
		const overlaid = (await readTitleBlock())!;
		expect(overlaid.visualHeight).toBeGreaterThan(0);
		await expectBottomOffset(overlaid.visualHeight);
	});
	test("keeps the newest display when a previous display's hide timer fires on watch", async ({ page }) => {
		await setupVolumeControl(page);
		await setOption(page, "onScreenDisplay.hideTime", 3000);
		await dispatchWheelNotches(page, watch, "up");
		await expect(page.locator(OSD_SELECTOR)).toBeAttached({ timeout: 5000 });
		// Tagging the first canvas proves the second display is a fresh element rather than a reused one.
		await page.evaluate((selector) => document.querySelector(selector)?.setAttribute("data-test-generation", "first"), OSD_SELECTOR);
		await expectToStay(async () => page.locator(OSD_SELECTOR).count(), 1, { durationMs: 2000, page });
		await dispatchWheelNotches(page, watch, "up");
		await expect(page.locator(`${OSD_SELECTOR}:not([data-test-generation])`)).toBeAttached({ timeout: 5000 });
		// The first display's removal timer fires during this window and must not take the newest display down.
		await expectToStay(async () => page.locator(OSD_SELECTOR).count(), 1, { durationMs: 2000, page });
		await expect(page.locator(OSD_SELECTOR)).not.toBeAttached({ timeout: 5000 });
	});
});
