import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

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
expect(testPages.length).toBeGreaterThan(0);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies) ?? home;

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

				await dispatchSeekKeys(page, "ArrowRight", 10);
				await settle(page);

				expect(await getVideoTime(page)).toBe(Math.round(duration));
				expect(await getLastOSDText(page)).toBe("+5s");
			});

			test(`OSD displayed total and actual seek position stay strictly coupled near video start on ${pageType}`, async ({
				page
			}) => {
				await setupSeekTest(page, pageType, 60);

				await setVideoTimeAndPause(page, 4);
				await freezeAndGetTime(page, pageType);

				await dispatchSeekKeys(page, "ArrowLeft");
				await settle(page);

				await expectVideoTime(page, 0);
				await expect.poll(async () => getLastOSDText(page)).toBe("-4s");

				await dispatchSeekKeys(page, "ArrowLeft", 10);
				await settle(page);

				expect(await getLastOSDText(page)).toBe("-4s");
			});
		}
	});

	test.describe("Accumulation behavior", () => {
		for (const pageType of testPages) {
			test(`holding arrow key accumulates actual seek displacement and OSD in lockstep on ${pageType}`, async ({
				page
			}) => {
				const JUMP = 10,
					PRESSES = 3,
					START = 20;
				await setupSeekTest(page, pageType, JUMP);

				await setVideoTimeAndPause(page, START);
				await freezeAndGetTime(page, pageType);

				await dispatchSeekKeys(page, "ArrowRight", PRESSES);
				await settle(page);

				await expectVideoTime(page, START + JUMP * PRESSES);
				await expect.poll(async () => getLastOSDText(page)).toBe(`+${JUMP * PRESSES}s`);
				const canvasCount = await page.evaluate(
					() => document.querySelectorAll(".yt-spec-extension-osd").length
				);
				expect(canvasCount).toBe(1);
			});

			test(`direction flip immediately resets OSD accumulation on ${pageType}`, async ({
				page
			}) => {
				await setupSeekTest(page, pageType, 10);

				await setVideoTimeAndPause(page, 50);
				await freezeAndGetTime(page, pageType);

				await dispatchSeekKeys(page, "ArrowRight");
				await settle(page);
				let osdState = (await readOnScreenDisplayState(page)) as null | {
					placement: string;
					text: string;
				};
				if (!osdState) throw new Error("OSD state was not captured");
				expect(osdState.text).toBe("+10s");
				expect(osdState.placement).toBe("center_right");

				await resetOSDCapture(page);
				await dispatchSeekKeys(page, "ArrowLeft");
				await settle(page);
				osdState = (await readOnScreenDisplayState(page)) as null | {
					placement: string;
					text: string;
				};
				if (!osdState) throw new Error("OSD state was not captured");
				expect(osdState.text).toBe("-10s");
				expect(osdState.placement).toBe("center_left");
			});

			test(`accumulation resets after OSD inactivity timeout on ${pageType}`, async ({ page }) => {
				await setupSeekTest(page, pageType, 10);

				await setVideoTimeAndPause(page, 50);
				await freezeAndGetTime(page, pageType);

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

			test(`tiny jumpBy=5 accumulates correctly on repeated hold on ${pageType}`, async ({
				page
			}) => {
				const JUMP = 5,
					PRESSES = 10,
					START = 20;
				await setupSeekTest(page, pageType, JUMP);

				await setVideoTimeAndPause(page, START);
				await freezeAndGetTime(page, pageType);

				for (let i = 0; i < PRESSES; i++) {
					await page.keyboard.down("ArrowRight");
				}
				await page.keyboard.up("ArrowRight");
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
				await setupSeekTest(page, pageType, 5);

				await page.evaluate((selector) => {
					const video = document.querySelector<HTMLVideoElement>(selector);
					if (video) {
						Object.defineProperty(video, "duration", {
							configurable: true,
							get: () => Infinity
						});
					}
				}, VIDEO_SELECTOR);

				await dispatchSeekKeys(page, "ArrowRight");
				await settle(page);
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

test.describe("Feature lifecycle & State management", () => {
	test(`changing jumpBy while feature is enabled works without reload`, async ({ page }) => {
		await setupSeekTest(page, watch, DEFAULT_JUMP_BY);

		// Initial jumpBy = 10
		await setOption(page, "customSeekDuration.jumpBy", 10);
		await setVideoTimeAndPause(page, 50);
		await dispatchSeekKeys(page, "ArrowRight");
		await settle(page);
		let currentTime = await page.evaluate(() => {
			const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
			return video?.currentTime ?? -1;
		});
		expect(Math.round(currentTime)).toBe(60);
		expect(await getLastOSDText(page)).toBe("+10s");

		// Update jumpBy to 30 without reloading
		await setOption(page, "customSeekDuration.jumpBy", 30);
		await resetOSDCapture(page);
		await dispatchSeekKeys(page, "ArrowRight");
		await settle(page);
		currentTime = await page.evaluate(() => {
			const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
			return video?.currentTime ?? -1;
		});
		expect(Math.round(currentTime)).toBe(90);
		expect(await getLastOSDText(page)).toBe("+30s");

		// Update jumpBy to 5
		await setOption(page, "customSeekDuration.jumpBy", 5);
		await resetOSDCapture(page);
		await dispatchSeekKeys(page, "ArrowLeft");
		await settle(page);
		currentTime = await page.evaluate(() => {
			const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
			return video?.currentTime ?? -1;
		});
		expect(Math.round(currentTime)).toBe(85);
		expect(await getLastOSDText(page)).toBe("-5s");
	});

	test(`re-applies after disable then re-enable on ${watch}`, async ({ page }) => {
		await setupSeekTest(page, watch, DEFAULT_JUMP_BY);

		await page.evaluate(() => {
			const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
			if (video) video.currentTime = 20;
		});

		await dispatchSeekKeys(page, "ArrowRight");
		await expect.poll(async () => getLastOSDText(page)).toBe("+15s");

		await disableFeature(page, "customSeekDuration.enabled");
		await setupOSDTextCapture(page);
		await dispatchSeekKeys(page, "ArrowRight");
		await settle(page);
		expect(await getLastOSDText(page)).toBeNull();

		await enableFeature(page, "customSeekDuration.enabled");
		await setupOSDTextCapture(page);
		await dispatchSeekKeys(page, "ArrowRight");
		await expect.poll(async () => getLastOSDText(page)).toBe("+15s");
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
		await dispatchSeekKeys(page, "ArrowRight");
		await settle(page);
		expect(await getLastOSDText(page)).toBeNull();

		await spaNavigateBack(page, watch);
		await setupOSDTextCapture(page);
		await freezeAndGetTime(page, watch);
		await expectSeekWorks(page);
	});

	test(`enabling on ${nonTargetPage}, a non-target page, raises no errors`, async ({ page }) => {
		await expectFeatureSilentOnNonTargetPage(page, "customSeekDuration.enabled", nonTargetPage);
	});
});

test.describe("Seek events interactions check with yt elements", () => {
	// Fixture assumption documented at the top of this test suite
	// All tests assume a non-live YouTube video with duration > 100s to support all seek scenarios

	test(`arrow keys inside search box/comment field do not trigger seeking`, async ({ page }) => {
		await setupSeekTest(page, watch, 10);
		await setVideoTimeAndPause(page, 50);

		// Create and focus a mock input element (simulating YouTube's search/comment fields)
		await page.evaluate(() => {
			const searchInput = document.createElement("input");
			searchInput.id = "mock-search-input";
			searchInput.type = "text";
			document.body.appendChild(searchInput);
			searchInput.focus();
		});

		// Dispatch arrow keys while input is focused
		await dispatchSeekKeys(page, "ArrowRight");
		await dispatchSeekKeys(page, "ArrowLeft");
		await settle(page);

		// Verify video time didn't change and no OSD was shown
		expect(await getVideoTime(page)).toBe(50);
		expect(await getLastOSDText(page)).toBeNull();

		// Cleanup
		await page.evaluate(() => {
			document.getElementById("mock-search-input")?.remove();
		});
	});

	test("verify custom seek triggers when progress-bar is focused", async ({ page }) => {
		await setupSeekTest(page, watch, DEFAULT_JUMP_BY);
		await setVideoTimeAndPause(page, 50);
		await page.getByRole("slider", { name: "Seek slider" }).focus();

		// Now, perform the actions directly instead of using the helper
		await dispatchSeekKeys(page, "ArrowRight");

		// And verify the results based on the initial state
		await expectVideoTime(page, 50 + DEFAULT_JUMP_BY);
		await expect.poll(async () => getLastOSDText(page)).toBe(`+${DEFAULT_JUMP_BY}s`);
	});

	//TODO: Shift , Alt , Ctrl do modify the playback time in various ways.
	// Alt, Shift bypass due to early exit utilze the native seek behavior and modify video.currentTime (5s or 10s based on playback speed)
	// Ctrl also modifies, but is dependent on wheere (timestamps) the video's Sections/Chapters are defined. e.g.(Intro, Today's sponsor)
	// Meta does not modify the playback time behavior

	// test(`modifier keys (Shift/Ctrl/Alt) + arrow are passed through without seeking`, async ({
	// 	page
	// }) => {

	// 	await setupSeekTest(page, watch, DEFAULT_JUMP_BY);
	// 	await setVideoTimeAndPause(page, 60);

	// 	// Test all modifier combinations
	// 	const modifiers = ["Shift", "Control", "Alt", "Meta"];

	// 	for (const modifier of modifiers) {
	// 		await resetOSDCapture(page);
	// 		await dispatchSeekKeys(page, `${modifier}+ArrowRight`, 1);
	// 		await settle(page);
	// 	}

	// 	// Verify video time didn't change and no OSD was shown after any modifier key press
	// 	const currentTime = await page.evaluate(() => {
	// 		const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
	// 		return video?.currentTime ?? -1;
	// 	});
	// 	expect(Math.round(currentTime)).toBe(60);
	// 	expect(await getLastOSDText(page)).toBeNull();
	// });
});
