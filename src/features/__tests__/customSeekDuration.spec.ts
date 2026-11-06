import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

// import { OSD_ACCUMULATION_TIMEOUT } from "@/src/features/customSeekDuration/index";
import { metadata } from "@/src/features/customSeekDuration/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import {
	disableFeature,
	enableFeature,
	expectFeatureSilentOnNonTargetPage,
	setOption
} from "@/src/utils/_tests/features";
import {
	navigateToPageType,
	spaNavigateBack,
	spaNavigateToHome,
	spaNavigateToRelatedVideo
} from "@/src/utils/_tests/navigation";
import {
	getLastOSDText,
	OSD_SELECTOR,
	readOnScreenDisplayState,
	setupOSDTextCapture
} from "@/src/utils/_tests/osd";
import { freezeAndGetTime } from "@/src/utils/_tests/player";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const VIDEO_SELECTOR = "video.html5-main-video";
const PLAYER_SELECTOR = "div#movie_player";
const DEFAULT_SEEK_TIME = 20;
const DEFAULT_JUMP_BY = 15;
const DEFAULT_EXPECTED_TIME = DEFAULT_SEEK_TIME + DEFAULT_JUMP_BY;
const OSD_ACCUMULATION_TIMEOUT = 800;
// Page type constants
const { home, watch } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies) ?? home;

async function dispatchKeyAndGetDefaultPrevented(page: Page, key: string): Promise<boolean> {
	await page.evaluate(() => {
		const win = window as typeof window & {
			__defaultPrevented?: boolean;
		};
		win.__defaultPrevented = undefined;
		win.addEventListener(
			"keydown",
			(event) => {
				win.__defaultPrevented = event.defaultPrevented;
			},
			{ once: true } // Listen in bubble phase - runs after feature's document capture listener
		);
	});
	await page.keyboard.press(key);
	return page.evaluate((pressedKey) => {
		const win = window as typeof window & {
			__defaultPrevented?: boolean;
		};
		if (win.__defaultPrevented === undefined) {
			throw new Error(`No keydown event observed for ${pressedKey}`);
		}
		return win.__defaultPrevented;
	}, key);
}

async function dispatchSeekKeys(page: Page, key: string, repeatCount = 1): Promise<void> {
	for (let i = 0; i < repeatCount; i++) {
		await page.keyboard.press(key);
	}
}

// Helper to verify seek functionality works
async function expectSeekWorks(page: Page): Promise<void> {
	await setVideoTimeAndPause(page, DEFAULT_SEEK_TIME);
	await dispatchSeekKeys(page, "ArrowRight");
	await expectVideoTime(page, DEFAULT_EXPECTED_TIME);
	await expect.poll(async () => getLastOSDText(page)).toBe(`+${DEFAULT_JUMP_BY}s`);
}

async function expectVideoTime(page: Page, expectedTime: number): Promise<void> {
	await expect.poll(async () => getVideoTime(page)).toBe(expectedTime);
}

async function getAllOSDTexts(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const win = window as unknown as { __capturedOSDTexts?: string[] };
		return win.__capturedOSDTexts ?? [];
	});
}
async function getVideoTime(page: Page): Promise<number> {
	return page.evaluate((selector) => {
		const video = document.querySelector<HTMLVideoElement>(selector);
		return video ? Math.round(video.currentTime) : 0;
	}, VIDEO_SELECTOR);
}

async function resetOSDCapture(page: Page): Promise<void> {
	await page.evaluate(() => {
		const win = window as unknown as { __capturedOSDTexts?: string[] };
		if (win.__capturedOSDTexts) {
			win.__capturedOSDTexts = [];
		}
	});
}

async function settle(page: Page): Promise<void> {
	await page.evaluate(() => {
		return new Promise<void>((resolve) => {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => resolve());
			});
		});
	});
}

// Setup helper for seek tests
async function setupSeekTest(page: Page, pageType: PageType, jumpBy: number): Promise<void> {
	await navigateToPageType(page, pageType);
	await setOption(page, "customSeekDuration.jumpBy", jumpBy);
	await enableFeature(page, "customSeekDuration.enabled");
	await setupOSDTextCapture(page);
	await freezeAndGetTime(page, pageType);
}

async function setupSeekTestWithDurationCheck(
	page: Page,
	pageType: PageType,
	jumpBy: number,
	minDuration: number
): Promise<void> {
	await setupSeekTest(page, pageType, jumpBy);

	const duration = await page.evaluate((selector) => {
		const video = document.querySelector<HTMLVideoElement>(selector);
		if (!video) return 0;

		// If metadata isn't loaded, wait for it
		if (video.readyState < 1) {
			// HAVE_METADATA
			return new Promise<number>((resolve) => {
				video.addEventListener("loadedmetadata", () => resolve(video.duration), { once: true });
			});
		}

		// Otherwise, return the duration directly
		return video.duration;
	}, VIDEO_SELECTOR);

	if (duration < minDuration) {
		throw new Error(
			`Test requires video duration > ${minDuration}s, but it was ${Math.round(duration)}s.`
		);
	}
}
/**
 * Sets the video time to the specified number of seconds and pauses the video.
 * @param page The page object.
 * @param seconds The number of seconds to set the video time to.
 */
async function setVideoTimeAndPause(page: Page, seconds: number): Promise<void> {
	await page.evaluate(
		async ({ playerSelector, seekTime, videoSelector }) => {
			const video = document.querySelector<HTMLVideoElement>(videoSelector);
			video?.pause();
			const player = document.querySelector<
				HTMLElement & { seekTo?: (s: number, a: boolean) => Promise<void> | void }
			>(playerSelector);
			if (player?.seekTo) {
				await player.seekTo(seekTime, true);
				return;
			}
			if (video) {
				if (video.readyState < 1) {
					return new Promise<void>((resolve) => {
						video.addEventListener(
							"loadedmetadata",
							() => {
								video.currentTime = seekTime;
								resolve();
							},
							{ once: true }
						);
					});
				}
				video.currentTime = seekTime;
			}
		},
		{ playerSelector: PLAYER_SELECTOR, seekTime: seconds, videoSelector: VIDEO_SELECTOR }
	);
	await page.waitForFunction(
		({ seekTime, videoSelector }) => {
			const video = document.querySelector<HTMLVideoElement>(videoSelector);
			return video !== null && !video.seeking && Math.abs(video.currentTime - seekTime) < 0.25;
		},
		{ seekTime: seconds, videoSelector: VIDEO_SELECTOR }
	);
}

test.describe("Core feature behavior", () => {
	test.describe("Clamping behavior", () => {
		for (const pageType of testPages) {
			test(`OSD displayed total and actual seek position stay strictly coupled near video end on ${pageType}`, async ({
				page
			}) => {
				await setupSeekTest(page, pageType, 60);

				const duration = await page.evaluate((selector) => {
					const video = document.querySelector<HTMLVideoElement>(selector);
					if (!video) return 0;
					if (video.readyState < 1) {
						return new Promise<number>((resolve) => {
							video.addEventListener("loadedmetadata", () => resolve(video.duration), {
								once: true
							});
						});
					}
					return video.duration;
				}, VIDEO_SELECTOR);
				expect(duration).toBeGreaterThan(5);

				await setVideoTimeAndPause(page, Math.max(0, duration - 5));
				await freezeAndGetTime(page, pageType);

				await dispatchSeekKeys(page, "ArrowRight");
				await settle(page);

				await expectVideoTime(page, Math.round(duration));
				await expect.poll(async () => getLastOSDText(page)).toBe("+5s");
				await resetOSDCapture(page);
				await dispatchSeekKeys(page, "ArrowRight", 10);
				await settle(page);

				expect(await getVideoTime(page)).toBe(Math.round(duration));
				await expect.poll(async () => getLastOSDText(page)).toBeNull();
			});

			test(`OSD displayed total and actual seek position stay strictly coupled near video start on ${pageType}`, async ({
				page
			}) => {
				await setupSeekTest(page, pageType, 60);

				await setVideoTimeAndPause(page, 4);

				await dispatchSeekKeys(page, "ArrowLeft");
				await settle(page);

				await expectVideoTime(page, 0);
				await expect.poll(async () => getLastOSDText(page)).toBe("-4s");
				await resetOSDCapture(page);
				await dispatchSeekKeys(page, "ArrowLeft", 10);
				await settle(page);

				await expect.poll(async () => getLastOSDText(page)).toBeNull();
			});
		}
	});

	test.describe("Accumulation behavior", () => {
		for (const pageType of testPages) {
			test(`repeated arrow key presses accumulates actual seek displacement and OSD in lockstep on ${pageType}`, async ({
				page
			}) => {
				const JUMP = 10,
					PRESSES = 3,
					START = 20;
				await setupSeekTest(page, pageType, JUMP);

				await setVideoTimeAndPause(page, START);

				await dispatchSeekKeys(page, "ArrowRight", PRESSES);
				await settle(page);

				await expectVideoTime(page, START + JUMP * PRESSES);
				await expect.poll(async () => getLastOSDText(page)).toBe(`+${JUMP * PRESSES}s`);
				await expect
					.poll(
						() =>
							page.evaluate((selector) => document.querySelectorAll(selector).length, OSD_SELECTOR),
						{ message: "A single OSD canvas should be present after seeking." }
					)
					.toBe(1);

				const osdState = await readOnScreenDisplayState(page);
				expect(osdState).not.toBeNull();
				expect(osdState?.painted).toBeGreaterThan(0);
				expect(osdState?.right).toBeTruthy();
			});

			test(`direction flip immediately resets OSD accumulation on ${pageType}`, async ({
				page
			}) => {
				const JUMP_BY = 10;
				const BASE_TIME = 50;
				const RIGHT_OSD_TEXT = `+${JUMP_BY}s`;
				const LEFT_OSD_TEXT = `-${JUMP_BY}s`;

				await setupSeekTest(page, pageType, JUMP_BY);

				await setVideoTimeAndPause(page, BASE_TIME);

				await dispatchSeekKeys(page, "ArrowRight");
				await settle(page);
				await expect.poll(async () => getLastOSDText(page)).toBe(RIGHT_OSD_TEXT);
				await expect.poll(async () => (await readOnScreenDisplayState(page))?.left).toBe("");

				await resetOSDCapture(page);
				await dispatchSeekKeys(page, "ArrowLeft");
				await settle(page);
				await expect.poll(async () => getLastOSDText(page)).toBe(LEFT_OSD_TEXT);
				const leftOsdState = await readOnScreenDisplayState(page);
				expect(leftOsdState).not.toBeNull();
				expect(leftOsdState?.left).toBeTruthy();
				await expectVideoTime(page, BASE_TIME); // Net change = 0 after +10 and -10 seek
			});

			test(`accumulation resets after OSD inactivity timeout on ${pageType}`, async ({ page }) => {
				await setupSeekTest(page, pageType, 10);

				await setVideoTimeAndPause(page, 50);

				await dispatchSeekKeys(page, "ArrowRight");
				await settle(page);
				await expect.poll(async () => getLastOSDText(page)).toBe("+10s");

				// Use the actual timeout constant from the feature implementation
				await page.waitForTimeout(OSD_ACCUMULATION_TIMEOUT + 100);

				await resetOSDCapture(page);

				await dispatchSeekKeys(page, "ArrowRight");
				await settle(page);
				await expect.poll(async () => getLastOSDText(page)).toBe("+10s");

				const allTexts = await getAllOSDTexts(page);
				expect(allTexts).toEqual(["+10s"]);
			});

			test(`multiple sequential arrow key presses accumulate correctly on ${pageType}`, async ({
				page
			}) => {
				const JUMP = 8, // 8 instead of 5 to differentiate from native seek behavior (5s)
					PRESSES = 10,
					START = 20;
				await setupSeekTest(page, pageType, JUMP);

				await setVideoTimeAndPause(page, START);
				await dispatchSeekKeys(page, "ArrowRight", PRESSES);
				await settle(page);

				await expectVideoTime(page, START + JUMP * PRESSES);
				await expect.poll(async () => getLastOSDText(page)).toBe(`+${JUMP * PRESSES}s`);
			});
		}
	});

	test.describe("Robustness", () => {
		for (const pageType of testPages) {
			test(`infinite duration does not intercept seek or display OSD on ${pageType}`, async ({
				page
			}) => {
				await setupSeekTest(page, pageType, 10);

				await page.evaluate((selector) => {
					const video = document.querySelector<HTMLVideoElement>(selector);
					if (video) {
						Object.defineProperty(video, "duration", {
							configurable: true,
							get: () => Infinity
						});
					}
				}, VIDEO_SELECTOR);

				const BASE_TIME = 20;
				await setVideoTimeAndPause(page, BASE_TIME);
				await dispatchSeekKeys(page, "ArrowRight");
				await settle(page);
				//native seek happens as custom seek early returns for video's with infinte duration
				await expect.poll(async () => await getVideoTime(page)).toBe(BASE_TIME + 5);
				const last = await getLastOSDText(page);
				expect(last).toBeNull();
			});
		}

		test(`does not intercept arrow keys when feature is disabled on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await disableFeature(page, "customSeekDuration.enabled");
			await setupOSDTextCapture(page);
			await freezeAndGetTime(page, watch);

			await dispatchSeekKeys(page, "ArrowRight");
			await settle(page);
			const lastText = await getLastOSDText(page);
			expect(lastText).toBeNull();
		});
	});
});

test.describe("Feature Lifecycle and State Management", () => {
	test(`changing jumpBy while feature is enabled works without reload on ${watch}`, async ({
		page
	}) => {
		await setupSeekTest(page, watch, DEFAULT_JUMP_BY);

		// Modify jumpBy while feature is enabled
		await setOption(page, "customSeekDuration.jumpBy", 10);

		await setVideoTimeAndPause(page, 50);
		await dispatchSeekKeys(page, "ArrowRight");
		await settle(page);
		await expectVideoTime(page, 60);
		await expect.poll(async () => getLastOSDText(page)).toBe("+10s");

		// Update jumpBy to 30 without reloading
		await page.waitForTimeout(OSD_ACCUMULATION_TIMEOUT + 200);
		await setOption(page, "customSeekDuration.jumpBy", 30);
		await resetOSDCapture(page);
		await dispatchSeekKeys(page, "ArrowRight");
		await settle(page);
		await expectVideoTime(page, 90);
		await expect.poll(async () => getLastOSDText(page)).toBe("+30s");

		// Update jumpBy to 5
		await setOption(page, "customSeekDuration.jumpBy", 5);
		await resetOSDCapture(page);
		await dispatchSeekKeys(page, "ArrowLeft");
		await settle(page);
		await expectVideoTime(page, 85);
		await expect.poll(async () => getLastOSDText(page)).toBe("-5s");
	});

	test(`re-applies after disable then re-enable on ${watch}`, async ({ page }) => {
		await setupSeekTest(page, watch, DEFAULT_JUMP_BY);

		await setVideoTimeAndPause(page, DEFAULT_SEEK_TIME);

		await dispatchSeekKeys(page, "ArrowRight");
		await expect.poll(async () => getLastOSDText(page)).toBe("+15s");

		await disableFeature(page, "customSeekDuration.enabled");
		await setupOSDTextCapture(page);
		await setVideoTimeAndPause(page, DEFAULT_SEEK_TIME);
		expect(await dispatchKeyAndGetDefaultPrevented(page, "ArrowRight")).toBe(false);
		await settle(page);
		await expectVideoTime(page, DEFAULT_SEEK_TIME + 5);

		await enableFeature(page, "customSeekDuration.enabled");
		await setupOSDTextCapture(page);
		await setVideoTimeAndPause(page, DEFAULT_SEEK_TIME);
		await dispatchSeekKeys(page, "ArrowRight");
		await expect.poll(async () => getLastOSDText(page)).toBe("+15s");
		await expectVideoTime(page, DEFAULT_EXPECTED_TIME);
	});

	test(`keeps working after SPA in-page navigation to a related video on ${watch}`, async ({
		page
	}) => {
		await setupSeekTest(page, watch, DEFAULT_JUMP_BY);
		await expectSeekWorks(page);

		await spaNavigateToRelatedVideo(page);
		await setupOSDTextCapture(page);
		await freezeAndGetTime(page, watch);
		await expectSeekWorks(page);
	});

	test(`keeps working after a visit to a non-target page on ${watch}`, async ({ page }) => {
		await setupSeekTest(page, watch, DEFAULT_JUMP_BY);

		await navigateToPageType(page, nonTargetPage);
		await navigateToPageType(page, watch);
		await setupOSDTextCapture(page);
		await freezeAndGetTime(page, watch);
		await expectSeekWorks(page);
	});

	test(`removes custom key interception on in-page navigation away from watch and restores it on return on ${watch}`, async ({
		page
	}) => {
		await setupSeekTest(page, watch, DEFAULT_JUMP_BY);
		await setVideoTimeAndPause(page, DEFAULT_SEEK_TIME);
		await freezeAndGetTime(page, watch);
		await dispatchSeekKeys(page, "ArrowRight");
		await settle(page);
		await expect.poll(async () => getLastOSDText(page)).toBe("+15s");

		await spaNavigateToHome(page);
		await setupOSDTextCapture(page);
		expect(await dispatchKeyAndGetDefaultPrevented(page, "ArrowRight")).toBe(false);
		await settle(page);

		await spaNavigateBack(page, watch);
		await setupOSDTextCapture(page);
		await freezeAndGetTime(page, watch);
		await expectSeekWorks(page);
	});

	test(`enabling on ${nonTargetPage}, a non-target page, raises no errors`, async ({ page }) => {
		await expectFeatureSilentOnNonTargetPage(page, "customSeekDuration.enabled", nonTargetPage);
	});

	test(`feature enabled intercepts arrow keys and prevents default on ${watch}`, async ({
		page
	}) => {
		await setupSeekTest(page, watch, DEFAULT_JUMP_BY);
		await setVideoTimeAndPause(page, DEFAULT_SEEK_TIME);
		// Verify that when the feature is enabled, it properly calls preventDefault()
		expect(await dispatchKeyAndGetDefaultPrevented(page, "ArrowRight")).toBe(true);
		await settle(page);
		await expectVideoTime(page, DEFAULT_EXPECTED_TIME);
	});
});

test.describe("Seek event interactions with YouTube elements", () => {
	test(`arrow keys inside text fields do not trigger seeking on ${watch}`, async ({ page }) => {
		await setupSeekTestWithDurationCheck(page, watch, DEFAULT_JUMP_BY, 100);
		await setVideoTimeAndPause(page, 50);

		await page.evaluate(() => {
			const searchInput = document.createElement("input");
			searchInput.id = "mock-search-input";
			searchInput.type = "text";
			document.body.appendChild(searchInput);

			const commentTextarea = document.createElement("textarea");
			commentTextarea.id = "mock-comment-textarea";
			document.body.appendChild(commentTextarea);

			const commentBox = document.createElement("div");
			commentBox.id = "mock-comment-box";
			commentBox.contentEditable = "true";
			document.body.appendChild(commentBox);
		});

		for (const selector of ["#mock-search-input", "#mock-comment-textarea", "#mock-comment-box"]) {
			await page.locator(selector).focus();
			expect(await dispatchKeyAndGetDefaultPrevented(page, "ArrowRight")).toBe(false);
			expect(await dispatchKeyAndGetDefaultPrevented(page, "ArrowLeft")).toBe(false);
			await settle(page);

			expect(await getVideoTime(page)).toBe(50);
		}

		await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
		await resetOSDCapture(page);
		await dispatchSeekKeys(page, "ArrowRight");
		await expectVideoTime(page, 50 + DEFAULT_JUMP_BY);
		await expect.poll(async () => getLastOSDText(page)).toBe(`+${DEFAULT_JUMP_BY}s`);
	});

	test(`verify custom seek triggers when progress-bar is focused on ${watch}`, async ({ page }) => {
		await setupSeekTestWithDurationCheck(page, watch, DEFAULT_JUMP_BY, 100);
		await setVideoTimeAndPause(page, 50);
		await page.focus(".ytp-progress-bar");

		await dispatchSeekKeys(page, "ArrowRight");
		await settle(page);

		// And verify the results based on the initial state
		await expectVideoTime(page, 50 + DEFAULT_JUMP_BY);
		await expect.poll(async () => getLastOSDText(page)).toBe(`+${DEFAULT_JUMP_BY}s`);
	});

	test(`modifier keys (Shift/Ctrl/Alt) + arrow are passed through without custom seeking on ${watch}`, async ({
		page
	}) => {
		await setupSeekTest(page, watch, DEFAULT_JUMP_BY);
		await setupOSDTextCapture(page);

		const baseTime = 20;
		await setVideoTimeAndPause(page, baseTime);

		// Test all modifier combinations
		const modifiers = ["Shift", "Control", "Alt", "Meta"];

		for (const modifier of modifiers) {
			expect(await dispatchKeyAndGetDefaultPrevented(page, `${modifier}+ArrowRight`)).toBe(false);
			await settle(page);
		}

		await setVideoTimeAndPause(page, baseTime);
		await resetOSDCapture(page);
		await dispatchSeekKeys(page, "ArrowRight");
		await expectVideoTime(page, baseTime + DEFAULT_JUMP_BY);
		await expect.poll(async () => getLastOSDText(page)).toBe(`+${DEFAULT_JUMP_BY}s`);
	});
});
