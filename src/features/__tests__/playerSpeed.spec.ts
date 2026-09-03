import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { metadata } from "@/src/features/playerSpeed/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { getCurrentSpeed } from "@/src/utils/_tests/player";
import { readStoredState } from "@/src/utils/_tests/storage";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
// No code branches on the speed value (resolveEffectiveSpeed forwards it unchanged), so one speed per page is enough.
const speed = 2;
const { home, live, watch } = pageTypeRecord;

/** Reads the channel id the feature resolves for the loaded video, so channelSpeeds can be keyed on it. */
async function readCurrentChannelId(page: Page): Promise<Nullable<string>> {
	return page.evaluate(async () => {
		const player = document.querySelector("div#movie_player") as unknown as Nullable<YouTubePlayerDiv>;
		const playerResponse = player?.getPlayerResponse?.() as undefined | { videoDetails?: { channelId?: string } };
		if (playerResponse?.videoDetails?.channelId) return playerResponse.videoDetails.channelId;
		const videoData = (await player?.getVideoData?.()) as undefined | { channel_id?: string };
		return videoData?.channel_id ?? null;
	});
}
/**
 * Reads the rate off the media element rather than the player API, because a manual change written straight
 * onto the video (the event the feature listens for) is not guaranteed to reach the player's own bookkeeping.
 */
async function readVideoPlaybackRate(page: Page): Promise<Nullable<number>> {
	return page.evaluate(() => document.querySelector<HTMLVideoElement>("video.html5-main-video")?.playbackRate ?? null);
}

test.describe("playerSpeed", () => {
	for (const pageType of testPages) {
		test(`should set playback speed to ${speed} on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerSpeed.speed", speed);
			await enableFeature(page, "playerSpeed.enabled");
			await expect.poll(async () => getCurrentSpeed(page, pageType), { timeout: pageType === "shorts" ? 15000 : 5000 }).toBe(speed);
		});
		test(`should persist playback speed after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerSpeed.speed", 2);
			await enableFeature(page, "playerSpeed.enabled");
			await expect.poll(async () => getCurrentSpeed(page, pageType), { timeout: pageType === "shorts" ? 15000 : 5000 }).toBe(2);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			// No disable/enable round trip: the assertion has to measure the navigation path, not a fresh onEnable.
			await expect
				.poll(() => getCurrentSpeed(page, pageType), {
					intervals: [200],
					timeout: 15000
				})
				.toBe(2);
			if (pageType === watch) {
				// A genuine in-document navigation is the only path that reaches onNavigate.
				await spaNavigateToRelatedVideo(page);
				await expect
					.poll(() => getCurrentSpeed(page, watch), {
						intervals: [200],
						timeout: 15000
					})
					.toBe(2);
			}
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerSpeed.speed", 2);
			await enableFeature(page, "playerSpeed.enabled");
			await expect.poll(async () => getCurrentSpeed(page, pageType), { timeout: pageType === "shorts" ? 15000 : 5000 }).toBe(2);
			await disableFeature(page, "playerSpeed.enabled");
			await expect.poll(async () => getCurrentSpeed(page, pageType), { timeout: 5000 }).toBe(1);
			await enableFeature(page, "playerSpeed.enabled");
			await expect.poll(async () => getCurrentSpeed(page, pageType), { timeout: pageType === "shorts" ? 15000 : 5000 }).toBe(2);
		});
		test(`persists speed after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerSpeed.speed", 2);
			await enableFeature(page, "playerSpeed.enabled");
			await expect.poll(async () => getCurrentSpeed(page, pageType), { timeout: pageType === "shorts" ? 15000 : 5000 }).toBe(2);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expect.poll(async () => getCurrentSpeed(page, pageType), { timeout: 15000 }).toBe(2);
		});
	}

	test(`applies the channel-specific speed from channelSpeeds instead of the global speed on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		const channelId = await readCurrentChannelId(page);
		expect(channelId).toBeTruthy();
		const channelSpeed = 1.5;
		await setOption(page, "playerSpeed.speed", speed);
		await setOption(page, "playerSpeed.channelSpeeds", `${channelId}:${channelSpeed}`);
		await enableFeature(page, "playerSpeed.enabled");
		// The per-channel entry has to win over the global speed, which is deliberately a different value.
		await expect.poll(async () => getCurrentSpeed(page, watch), { timeout: 15000 }).toBe(channelSpeed);
		await disableFeature(page, "playerSpeed.enabled");
		// An entry for some other channel must leave the global speed in charge.
		await setOption(page, "playerSpeed.channelSpeeds", `UCnotTheChannelOfThisVid:${channelSpeed}`);
		await enableFeature(page, "playerSpeed.enabled");
		await expect.poll(async () => getCurrentSpeed(page, watch), { timeout: 15000 }).toBe(speed);
	});
	test(`a manual speed change is not reverted while playerSpeed is enabled on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "playerSpeed.speed", speed);
		await enableFeature(page, "playerSpeed.enabled");
		await expect.poll(async () => readVideoPlaybackRate(page), { timeout: 15000 }).toBe(speed);
		const manualSpeed = 1.25;
		// A rate the extension never wrote is recorded as a manual override, which suspends enforcement.
		await page.evaluate((rate) => {
			const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
			if (video) video.playbackRate = rate;
		}, manualSpeed);
		await expectToStay(async () => readVideoPlaybackRate(page), manualSpeed, { durationMs: 5000, page });
		// onDisable restores the speed the user last chose - the default 1 would mean the change was never recorded.
		await disableFeature(page, "playerSpeed.enabled");
		await expect.poll(async () => readVideoPlaybackRate(page), { timeout: 15000 }).toBe(manualSpeed);
	});
	test(`changing playerSpeed.speed while the feature is enabled applies immediately on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "playerSpeed.speed", speed);
		await enableFeature(page, "playerSpeed.enabled");
		await expect.poll(async () => getCurrentSpeed(page, watch), { timeout: 15000 }).toBe(speed);
		// onConfigChange is the path the options page uses; enabling first is what makes this reach it.
		await setOption(page, "playerSpeed.speed", 1.5);
		await expect.poll(async () => getCurrentSpeed(page, watch), { timeout: 15000 }).toBe(1.5);
	});
	test(`should not change playback speed on a live stream on ${live}`, async ({ page }) => {
		await navigateToPageType(page, live);
		await setOption(page, "playerSpeed.speed", speed);
		await enableFeature(page, "playerSpeed.enabled");
		// live sits outside includePages and makePlayerSpeedTask additionally bails on live video data, so the
		// rate has to stay untouched for the whole settle window.
		await expectToStay(async () => getCurrentSpeed(page, live), 1, { page });
	});

	test.describe("state persistence", () => {
		test("playerSpeed state is stored in extension storage", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "playerSpeed.speed", 2);
			await enableFeature(page, "playerSpeed.enabled");
			await expect.poll(() => getCurrentSpeed(page, watch), { timeout: 5000 }).toBe(2);

			await page.locator("div#movie_player").hover();
			await page.locator(".ytp-settings-button").click();
			await expect(page.locator(settingsPanelMenuSelector)).toBeVisible();
			await page.evaluate(() => {
				const speedItem = Array.from(document.querySelectorAll<HTMLDivElement>(".ytp-menuitem")).find((item) =>
					item.querySelector(".ytp-menuitem-label")?.textContent?.toLowerCase().includes("speed")
				);
				speedItem?.click();
			});
			// The panel the feature observes to record the speed; waiting for it replaces the fixed sleeps.
			await expect(page.locator(".ytp-variable-speed-panel-content")).toBeVisible();
			// The state write travels content script -> background -> storage, so it has to be polled for.
			await expect.poll(async () => (await readStoredState(page)).playerSpeed).toMatchObject({ playbackSpeed: 2 });
		});
	});
});
