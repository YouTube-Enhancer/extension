import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/playbackSpeedBoostGesture/index.metadata";
import { youtubePlayerMaxSpeed } from "@/src/types";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setFeatureValue } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const { home, shorts, watch } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies) ?? home;

const VIDEO_SELECTOR = "video.html5-main-video";
const osdSelector = "canvas#yte-osd";
// One speed step per 10px of horizontal displacement; ten segments at the default 0.25 step is +2.5x.
const DEFAULT_STEP_BOOST = 2.5;
const {
	defaults: { speed: DEFAULT_STEP }
} = metadata;

async function expectRate(page: Page, expected: number): Promise<void> {
	// Speed writes ride a serialized queue in the feature, so the value lands a tick or two after the
	// last mouse event; polling is required, a synchronous read would race it.
	await expect.poll(() => readRate(page), { timeout: 10000 }).toBe(expected);
}

/**
 * Resolves where to press for a gesture. Shorts stacks several video elements in the DOM, so the press
 * must land on the one actually on screen; the feature itself reads the first video in DOM order via
 * querySelector, which is what readRate checks, so both sides stay on the same element by construction.
 */
async function pressPointOnVideo(page: Page): Promise<{ x: number; y: number }> {
	const box = await page.evaluate((selector) => {
		const videos = Array.from(document.querySelectorAll<HTMLVideoElement>(selector));
		for (const video of videos) {
			const rect = video.getBoundingClientRect();
			const { bottom, height, left, top, width } = rect;
			if (height > 0 && width > 0 && bottom > 0 && top < window.innerHeight)
				return { height, left, top, width };
		}
		return null;
	}, VIDEO_SELECTOR);
	if (!box) throw new Error("no video element is visible in the viewport");
	const { height, left, top, width } = box;
	// Biased above the vertical middle: the bottom strip of the player is the controls chrome, which
	// the gesture deliberately ignores.
	return { x: left + width / 2, y: top + height * 0.35 };
}

/**
 * Reads the on-screen display canvas: its inline position plus how many pixels were actually painted.
 * The painted count is what proves the speed display was drawn, since an empty canvas is still appended.
 */
async function readOnScreenDisplayState(
	page: Page
): Promise<null | { left: string; painted: number; top: string }> {
	return page.evaluate((selector) => {
		const canvas = document.querySelector<HTMLCanvasElement>(selector);
		if (!canvas) return null;
		const context = canvas.getContext("2d");
		if (!context) return null;
		const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
		let painted = 0;
		for (let index = 3; index < data.length; index += 4) {
			if (data[index] > 0) painted++;
		}
		const {
			style: { left, top }
		} = canvas;
		return { left, painted, top };
	}, osdSelector);
}

async function readPaused(page: Page): Promise<boolean> {
	return await page.evaluate(
		(selector) => document.querySelector<HTMLVideoElement>(selector)?.paused ?? true,
		VIDEO_SELECTOR
	);
}

async function readRate(page: Page): Promise<number> {
	return await page.evaluate((selector) => {
		const video = document.querySelector<HTMLVideoElement>(selector);
		if (!video) return Number.NaN;
		const { playbackRate } = video;
		return playbackRate;
	}, VIDEO_SELECTOR);
}

test.describe("playbackSpeedBoostGesture", () => {
	for (const pageType of testPages) {
		test(`dragging right boosts the speed and releasing reverts it on ${pageType}`, async ({
			page
		}) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "playbackSpeedBoostGesture.enabled");

			const baseline = await readRate(page);
			// +100px is 10 displacement segments; at the default 0.25 step that is +2.5x.
			const boosted = Number((baseline + 10 * DEFAULT_STEP).toFixed(2));
			expect(boosted - baseline).toBe(DEFAULT_STEP_BOOST);

			const { x, y } = await pressPointOnVideo(page);
			await page.mouse.move(x, y);
			await page.mouse.down();
			await page.mouse.move(x + 100, y, { steps: 10 });
			// The button stays down while asserting: releasing queues the revert to the baseline, which
			// would race (and usually beat) a poll for the boosted value.
			await expectRate(page, boosted);
			await page.mouse.up();
			await expectRate(page, baseline);
		});
		test(`dragging left decays toward the floor speed on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "playbackSpeedBoostGesture.enabled");

			const baseline = await readRate(page);
			// Far more displacement than the floor allows; the speed clamps at the feature's floor
			// (0.25x at the default step) instead of going below it.
			const { x, y } = await pressPointOnVideo(page);
			await page.mouse.move(x, y);
			await page.mouse.down();
			await page.mouse.move(x - 600, y, { steps: 25 });
			await expectRate(page, 0.25);
			await page.mouse.up();
			await expectRate(page, baseline);
		});
	}
	test(`does nothing by default on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);

		const baseline = await readRate(page);
		const { x, y } = await pressPointOnVideo(page);
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + 300, y, { steps: 15 });
		await page.mouse.up();
		await expect.poll(() => readRate(page), { timeout: 2000 }).toBe(baseline);
	});
	test(`does not change speed or show OSD without movement on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "playbackSpeedBoostGesture.enabled");

		const baseline = await readRate(page);
		const { x, y } = await pressPointOnVideo(page);
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.up();

		await expectRate(page, baseline);
		await expect(page.locator(osdSelector)).not.toBeAttached();
	});
	test(`ignores non-left mouse buttons on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "playbackSpeedBoostGesture.enabled");

		const baseline = await readRate(page);
		const { x, y } = await pressPointOnVideo(page);
		await page.mouse.move(x, y);
		await page.mouse.down({ button: "right" });
		await page.mouse.move(x + 300, y, { steps: 15 });
		await page.mouse.up({ button: "right" });

		await expectRate(page, baseline);
		await expect(page.locator(osdSelector)).not.toBeAttached();
	});
	test(`survives a full page reload on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "playbackSpeedBoostGesture.enabled");

		const baseline = await readRate(page);
		const boosted = Number((baseline + 10 * DEFAULT_STEP).toFixed(2));
		const { x, y } = await pressPointOnVideo(page);
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + 100, y, { steps: 10 });
		await expectRate(page, boosted);
		await page.mouse.up();

		await page.reload();
		await navigateToPageType(page, watch);
		await expectRate(page, baseline);
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + 100, y, { steps: 10 });
		await expectRate(page, boosted);
		await page.mouse.up();
	});
	test(`re-applies after disable then re-enable on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "playbackSpeedBoostGesture.enabled");

		const baseline = await readRate(page);
		const boosted = Number((baseline + 10 * DEFAULT_STEP).toFixed(2));
		const { x, y } = await pressPointOnVideo(page);
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + 100, y, { steps: 10 });
		await expectRate(page, boosted);
		await page.mouse.up();
		await expectRate(page, baseline);

		await disableFeature(page, "playbackSpeedBoostGesture.enabled");
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + 300, y, { steps: 15 });
		await page.mouse.up();
		await expect.poll(() => readRate(page), { timeout: 2000 }).toBe(baseline);

		await enableFeature(page, "playbackSpeedBoostGesture.enabled");
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + 100, y, { steps: 10 });
		await expectRate(page, boosted);
		await page.mouse.up();
	});
	test(`suppresses the click that trails a completed drag on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "playbackSpeedBoostGesture.enabled");

		const pausedBefore = await readPaused(page);
		const { x, y } = await pressPointOnVideo(page);
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + 50, y, { steps: 5 });
		await page.mouse.up();
		// The browser fires its own click for that down/up pair; the feature suppresses it so the drag
		// does not also toggle playback.
		await expect.poll(() => readPaused(page), { timeout: 1000 }).toBe(pausedBefore);

		// Once the suppression window has expired a plain click toggles normally, proving the click
		// path itself works and only the trailing click was swallowed.
		await page.waitForTimeout(150);
		await page.mouse.click(x, y);
		await expect.poll(() => readPaused(page), { timeout: 5000 }).toBe(!pausedBefore);
	});
	test(`does not suppress the next click when the drag ends off the player on ${watch}`, async ({
		page
	}) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "playbackSpeedBoostGesture.enabled");

		const pausedBefore = await readPaused(page);
		const { x, y } = await pressPointOnVideo(page);
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + 100, y, { steps: 10 });
		// Release well above the player, so the feature skips the click suppression.
		await page.mouse.move(x, y - 200);
		await page.mouse.up();
		await page.waitForTimeout(300);
		expect(await readPaused(page)).toBe(pausedBefore);

		await page.mouse.click(x, y);
		await expect.poll(() => readPaused(page), { timeout: 5000 }).toBe(!pausedBefore);
	});
	test(`ignores drags that start on the player controls on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "playbackSpeedBoostGesture.enabled");

		const baseline = await readRate(page);
		const box = await page.locator(VIDEO_SELECTOR).boundingBox();
		if (!box) throw new Error("video element has no bounding box");

		// Press inside the controls chrome at the very bottom of the player: excluded surface, so no
		// gesture arms. The drag may seek the video, which is fine; only the speed must not change.
		await page.mouse.move(box.x + box.width / 2, box.y + box.height - 10);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height - 10, { steps: 10 });
		await page.mouse.up();
		await expect.poll(() => readRate(page), { timeout: 2000 }).toBe(baseline);
	});
	test(`speed remains unchanged for strictly vertical drag on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "playbackSpeedBoostGesture.enabled");

		const { x, y } = await pressPointOnVideo(page);
		const baseline = await readRate(page);

		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x, y - 200, { steps: 10 });

		await expectRate(page, Number(baseline.toFixed(2)));
		await page.mouse.up();
	});
	test(`follows live changes to the speed step setting on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "playbackSpeedBoostGesture.enabled");
		await setFeatureValue(page, "playbackSpeedBoostGesture.speed", 0.5);

		const baseline = await readRate(page);
		// +20px is 2 segments; at the new 0.5 step that is +1x, which would be +0.5x at the default.
		const { x, y } = await pressPointOnVideo(page);
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + 20, y, { steps: 5 });
		await expectRate(page, Number((baseline + 2 * 0.5).toFixed(2)));
		await page.mouse.up();
	});
	test(`clamps the boosted speed at the ceiling on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "playbackSpeedBoostGesture.enabled");

		const baseline = await readRate(page);
		const box = await page.locator(VIDEO_SELECTOR).boundingBox();
		if (!box) throw new Error("video element has no bounding box");

		// The press must start on the player, but the drag can travel past its right edge; far enough
		// to blow through the ceiling so the only stable expectation is the clamp itself.
		const y = box.y + box.height * 0.35;
		await page.mouse.move(box.x + 20, y);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width + 500, y, { steps: 25 });
		await expectRate(page, youtubePlayerMaxSpeed);
		await page.mouse.up();
		await expectRate(page, baseline);
	});
	test(`clamps a near-ceiling starting speed without overshooting on ${watch}`, async ({
		page
	}) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "playbackSpeedBoostGesture.enabled");
		await page.evaluate(() => {
			const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
			if (!video) throw new Error("no video element found");
			video.playbackRate = 15.5;
		});

		const baseline = await readRate(page);
		expect(baseline).toBe(15.5);
		const { x, y } = await pressPointOnVideo(page);
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + 100, y, { steps: 10 });
		await expectRate(page, youtubePlayerMaxSpeed);
		await page.mouse.up();
		await expectRate(page, baseline);
	});
	test(`reverts the speed when the window loses focus mid-drag on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "playbackSpeedBoostGesture.enabled");

		const baseline = await readRate(page);
		const { x, y } = await pressPointOnVideo(page);
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + 100, y, { steps: 10 });
		await expectRate(page, Number((baseline + 10 * DEFAULT_STEP).toFixed(2)));

		await page.evaluate(() => window.dispatchEvent(new Event("blur")));
		await expectRate(page, baseline);
		await page.mouse.up();
	});
	// NOTE: This behaviour is depricated and the 2x native boost exits now
	// test(`suppresses YouTube's press-and-hold 2x on ${watch}`, async ({ page }) => {
	// 	await navigateToPageType(page, watch);
	// 	await enableFeature(page, "playbackSpeedBoostGesture.enabled");

	// 	const baseline = await readRate(page);
	// 	// YouTube's native hold-for-2x kicks in after roughly half a second; the feature stops that
	// 	// mousedown in the capture phase, so the rate must stay untouched through the hold. (If the
	// 	// account has the native behavior off this passes vacuously; it still guards our suppression.)
	// 	const { x, y } = await pressPointOnVideo(page);
	// 	await page.mouse.move(x, y);
	// 	await page.mouse.down();
	// 	await page.waitForTimeout(800);
	// 	expect(await readRate(page)).toBe(baseline);
	// 	await page.mouse.up();
	// 	await expect.poll(() => readRate(page), { timeout: 2000 }).toBe(baseline);
	// });
	test(`keeps working after a visit to a non-target page on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "playbackSpeedBoostGesture.enabled");

		// There is no player on the non-target page to observe a gesture against, so the meaningful
		// assertion is the re-arm: leaving and re-entering a target page must not kill the listeners.
		await navigateToPageType(page, nonTargetPage);
		await navigateToPageType(page, watch);

		const baseline = await readRate(page);
		const { x, y } = await pressPointOnVideo(page);
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(x + 100, y, { steps: 10 });
		await expectRate(page, Number((baseline + 10 * DEFAULT_STEP).toFixed(2)));
		await page.mouse.up();
	});

	test.describe("On-Screen Display (OSD)", () => {
		for (const pageType of [watch, shorts]) {
			test(`OSD text is painted during a drag on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "playbackSpeedBoostGesture.enabled");

				await expect(page.locator(osdSelector)).not.toBeAttached();

				const { x, y } = await pressPointOnVideo(page);
				await page.mouse.move(x, y);
				await page.mouse.down();
				await page.mouse.move(x + 100, y, { steps: 10 });

				await expect
					.poll(async () => {
						const state = await readOnScreenDisplayState(page);
						return state?.painted ?? 0;
					})
					.toBeGreaterThan(0);

				await page.mouse.up();
			});
		}

		test(`re-arms the gesture when navigating between watch and shorts`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "playbackSpeedBoostGesture.enabled");

			for (const pageType of [watch, shorts]) {
				await navigateToPageType(page, pageType);
				const baseline = await readRate(page);
				const { x, y } = await pressPointOnVideo(page);
				await page.mouse.move(x, y);
				await page.mouse.down();
				await page.mouse.move(x + 100, y, { steps: 10 });
				await expectRate(page, Number((baseline + 10 * DEFAULT_STEP).toFixed(2)));
				await page.mouse.up();
				await expectRate(page, baseline);
			}
		});
	});
});
