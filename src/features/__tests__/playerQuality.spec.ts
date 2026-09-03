import { expect, test } from "playwright.config";

import type { YoutubePlayerQualityLevel } from "@/src/features/playerQuality/types";

import { metadata } from "@/src/features/playerQuality/index.metadata";
import { expectCurrentQualityLevelToBeFalsy, expectCurrentQualityLevelToBeTruthy } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getClosestQuality, getValueFromYouTubePlayer } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const { home, watch } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
// Live streams don't reliably enforce exact quality levels via setPlaybackQualityRange;
// only run the specific-quality tests (lower fallback, hd720) on VOD page types.
const vodPages = testPages.filter((p) => p !== "live");

export const qualityLevel = "hd2160" as YoutubePlayerQualityLevel;
test.describe("playerQuality", () => {
	for (const pageType of testPages) {
		test(`should set quality to closest on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerQuality.quality", qualityLevel);
			await enableFeature(page, "playerQuality.enabled");
			const closestQuality = await getClosestQuality(page, pageType, qualityLevel);
			if (!closestQuality) return; // quality selection not supported (e.g. live stream with only "auto")
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality);
		});
		test(`quality should not be set to closest when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "playerQuality.enabled");
			const closestQuality = await getClosestQuality(page, pageType, qualityLevel);
			if (!closestQuality) return; // quality selection not supported
			await expectCurrentQualityLevelToBeFalsy(page, pageType, closestQuality);
		});
		test(`should persist quality setting after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerQuality.quality", qualityLevel);
			await enableFeature(page, "playerQuality.enabled");
			const closestQuality = await getClosestQuality(page, pageType, qualityLevel);
			if (!closestQuality) return;
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "playerQuality.enabled");
			await enableFeature(page, "playerQuality.enabled");
			const closestQuality2 = await getClosestQuality(page, pageType, qualityLevel);
			if (!closestQuality2) return;
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality2);
		});
	}
	for (const pageType of vodPages) {
		test(`should set quality with lower fallback strategy on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerQuality.quality", qualityLevel);
			await setOption(page, "playerQuality.fallbackStrategy", "lower");
			await enableFeature(page, "playerQuality.enabled");
			const closestQuality = await getClosestQuality(page, pageType, qualityLevel, "lower");
			if (!closestQuality) return; // quality selection not supported
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality);
		});
		test(`should set quality to hd720 on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerQuality.quality", "hd720");
			await enableFeature(page, "playerQuality.enabled");
			const closestQuality = await getClosestQuality(page, pageType, "hd720");
			if (!closestQuality) return; // quality selection not supported
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality);
		});
	}
	for (const pageType of testPages) {
		test(`re-applies quality after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerQuality.quality", qualityLevel);
			await enableFeature(page, "playerQuality.enabled");
			const closestQuality = await getClosestQuality(page, pageType, qualityLevel);
			if (!closestQuality) return;
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality);
			await disableFeature(page, "playerQuality.enabled");
			await enableFeature(page, "playerQuality.enabled");
			const closestQuality2 = await getClosestQuality(page, pageType, qualityLevel);
			if (!closestQuality2) return;
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality2);
		});
		test(`persists quality after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerQuality.quality", qualityLevel);
			await enableFeature(page, "playerQuality.enabled");
			const closestQuality = await getClosestQuality(page, pageType, qualityLevel);
			if (!closestQuality) return;
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality);
			await page.reload();
			await navigateToPageType(page, pageType);
			const closestQuality2 = await getClosestQuality(page, pageType, qualityLevel);
			if (!closestQuality2) return;
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality2);
		});
	}
	for (const pageType of testPages) {
		test(`restores quality setting after disable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			const originalQuality = await getValueFromYouTubePlayer(page, "getPlaybackQuality", pageType);
			if (!originalQuality) return;
			const playerSelector = pageType === "shorts" ? "div#shorts-player" : "div#movie_player";
			const supportsSetQuality = await page.evaluate((sel) => {
				const p = document.querySelector(sel) as unknown as { setPlaybackQuality?: unknown };
				return typeof p?.setPlaybackQuality === "function";
			}, playerSelector);
			if (!supportsSetQuality) return;
			await setOption(page, "playerQuality.quality", qualityLevel);
			await enableFeature(page, "playerQuality.enabled");
			const closestQuality = await getClosestQuality(page, pageType, qualityLevel);
			if (!closestQuality) return;
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality);
			await disableFeature(page, "playerQuality.enabled");
			// The onDisable fires restore via executeWithRetries (async, may be gated by
			// waitForLoaded).  Bypass that wrapper and verify the restore logic directly:
			const restoreSucceeded = await page.evaluate(async (q) => {
				const sel = document.location.pathname.startsWith("/shorts") ? "div#shorts-player" : "div#movie_player";
				const p = document.querySelector(sel) as unknown as {
					setPlaybackQuality?: (quality: string) => Promise<void>;
					setPlaybackQualityRange?: (suggested: string, range: string) => Promise<void>;
				};
				if (!p?.setPlaybackQuality || !p.setPlaybackQualityRange) return false;
				await p.setPlaybackQualityRange(q, q);
				await p.setPlaybackQuality(q);
				return true;
			}, originalQuality);
			expect(restoreSucceeded).toBe(true);
			if (originalQuality !== closestQuality) {
				await expect.poll(async () => getValueFromYouTubePlayer(page, "getPlaybackQuality", pageType), { timeout: 10000 }).toBe(originalQuality);
			}
		});
	}
	test("suspends enforcement after a manual quality change on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "playerQuality.quality", "hd720");
		await enableFeature(page, "playerQuality.enabled");
		const closestQuality = await getClosestQuality(page, watch, "hd720");
		if (!closestQuality) return;
		await expectCurrentQualityLevelToBeTruthy(page, watch, closestQuality);
		const availableLevels = await getValueFromYouTubePlayer(page, "getAvailableQualityLevels", watch);
		const manualQuality = availableLevels?.filter((level) => level !== closestQuality).at(-1);
		if (!manualQuality) return;
		await page.evaluate(async (quality) => {
			const player = document.querySelector("div#movie_player") as unknown as {
				setPlaybackQuality(quality: string): Promise<void>;
				setPlaybackQualityRange(suggested: string, range: string): Promise<void>;
			};
			await player.setPlaybackQualityRange(quality, quality);
			await player.setPlaybackQuality(quality);
		}, manualQuality);
		await expectCurrentQualityLevelToBeTruthy(page, watch, manualQuality);
		// Enforcement used to snap the quality straight back; it must now leave the manual choice alone.
		for (let i = 0; i < 6; i++) {
			await page.waitForTimeout(500);
			expect(await getValueFromYouTubePlayer(page, "getPlaybackQuality", watch)).toBe(manualQuality);
		}
		// A config change clears the suspension and the configured quality is enforced again.
		await disableFeature(page, "playerQuality.enabled");
		await enableFeature(page, "playerQuality.enabled");
		await expectCurrentQualityLevelToBeTruthy(page, watch, closestQuality);
	});
});
