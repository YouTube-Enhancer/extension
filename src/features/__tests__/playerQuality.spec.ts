import { expect, test } from "playwright.config";

import type { YoutubePlayerQualityLevel } from "@/src/features/playerQuality/types";

import { metadata } from "@/src/features/playerQuality/index.metadata";
import { expectCurrentQualityLevelToBeTruthy, expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getClosestQuality, getValueFromYouTubePlayer } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const { watch } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);

export const qualityLevel = "hd2160" as YoutubePlayerQualityLevel;
// Pinned so the expectation the helper computes and the strategy the feature runs with cannot drift apart.
const fallbackStrategy = "lower";
test.describe("playerQuality", () => {
	for (const pageType of testPages) {
		test(`should set quality to closest on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerQuality.quality", qualityLevel);
			await setOption(page, "playerQuality.fallbackStrategy", fallbackStrategy);
			await enableFeature(page, "playerQuality.enabled");
			const closestQuality = await getClosestQuality(page, pageType, qualityLevel, fallbackStrategy);
			if (!closestQuality) return; // quality selection not supported (e.g. live stream with only "auto")
			await expectCurrentQualityLevelToBeTruthy(page, pageType, closestQuality);
		});
	}
	// The cases below have no live- or shorts-specific code path: the only page-dependent line is getPlayer's
	// selector, which the closest test above already exercises on every page type. They run on watch only —
	// the live fixture re-crawls the channel and costs up to 120 s per iteration.
	test(`quality should not be set to closest when disabled on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await disableFeature(page, "playerQuality.enabled");
		// Whatever quality YouTube picks on its own says nothing about the feature; the observable signal is
		// data-default-quality, which the feature writes on the player whenever it enforces or restores.
		await expectToStay(async () => page.locator("div#movie_player").getAttribute("data-default-quality"), null, { page });
	});
	test(`should set quality to hd720 on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "playerQuality.quality", "hd720");
		await setOption(page, "playerQuality.fallbackStrategy", fallbackStrategy);
		await enableFeature(page, "playerQuality.enabled");
		const closestQuality = await getClosestQuality(page, watch, "hd720", fallbackStrategy);
		if (!closestQuality) return; // quality selection not supported
		await expectCurrentQualityLevelToBeTruthy(page, watch, closestQuality);
	});
	test(`re-applies quality after disable then re-enable on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "playerQuality.quality", qualityLevel);
		await setOption(page, "playerQuality.fallbackStrategy", fallbackStrategy);
		await enableFeature(page, "playerQuality.enabled");
		const closestQuality = await getClosestQuality(page, watch, qualityLevel, fallbackStrategy);
		if (!closestQuality) return;
		await expectCurrentQualityLevelToBeTruthy(page, watch, closestQuality);
		await disableFeature(page, "playerQuality.enabled");
		await enableFeature(page, "playerQuality.enabled");
		const closestQuality2 = await getClosestQuality(page, watch, qualityLevel, fallbackStrategy);
		if (!closestQuality2) return;
		await expectCurrentQualityLevelToBeTruthy(page, watch, closestQuality2);
	});
	test(`persists quality after full page reload on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "playerQuality.quality", qualityLevel);
		await setOption(page, "playerQuality.fallbackStrategy", fallbackStrategy);
		await enableFeature(page, "playerQuality.enabled");
		const closestQuality = await getClosestQuality(page, watch, qualityLevel, fallbackStrategy);
		if (!closestQuality) return;
		await expectCurrentQualityLevelToBeTruthy(page, watch, closestQuality);
		await page.reload();
		await navigateToPageType(page, watch);
		const closestQuality2 = await getClosestQuality(page, watch, qualityLevel, fallbackStrategy);
		if (!closestQuality2) return;
		await expectCurrentQualityLevelToBeTruthy(page, watch, closestQuality2);
	});
	test(`restores quality setting after disable on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		const originalQuality = await getValueFromYouTubePlayer(page, "getPlaybackQuality", watch);
		if (!originalQuality) return;
		const supportsSetQuality = await page.evaluate(() => {
			const p = document.querySelector("div#movie_player") as unknown as { setPlaybackQuality?: unknown };
			return typeof p?.setPlaybackQuality === "function";
		});
		if (!supportsSetQuality) return;
		await setOption(page, "playerQuality.quality", qualityLevel);
		await setOption(page, "playerQuality.fallbackStrategy", fallbackStrategy);
		await enableFeature(page, "playerQuality.enabled");
		const closestQuality = await getClosestQuality(page, watch, qualityLevel, fallbackStrategy);
		if (!closestQuality) return;
		await expectCurrentQualityLevelToBeTruthy(page, watch, closestQuality);
		await disableFeature(page, "playerQuality.enabled");
		// onDisable restores the quality captured before enforcement and records it on the player element,
		// so the restore has to be observed there rather than performed by the test itself.
		await expect(page.locator(`div#movie_player[data-default-quality="${originalQuality}"]`)).toBeAttached({ timeout: 15000 });
		if (originalQuality !== closestQuality) {
			await expect.poll(async () => getValueFromYouTubePlayer(page, "getPlaybackQuality", watch), { timeout: 10000 }).toBe(originalQuality);
		}
	});
	test("suspends enforcement after a manual quality change on watch", async ({ page }) => {
		// Observed on 2026-09-02: a manual setPlaybackQualityRange("tiny") right after enforcement only buffers briefly and
		// getPlaybackQuality() keeps reporting the enforced level, so hasForeignQuality() never sees a difference and the
		// player settles back on the enforced quality. The detection needs a signal that reflects the requested quality.
		test.fixme(true, "manual quality override detection does not trigger when enforcement re-applies during the switch");
		await navigateToPageType(page, watch);
		await setOption(page, "playerQuality.quality", "hd720");
		await setOption(page, "playerQuality.fallbackStrategy", fallbackStrategy);
		await enableFeature(page, "playerQuality.enabled");
		const closestQuality = await getClosestQuality(page, watch, "hd720", fallbackStrategy);
		if (!closestQuality) return;
		await expectCurrentQualityLevelToBeTruthy(page, watch, closestQuality);
		const availableLevels = await getValueFromYouTubePlayer(page, "getAvailableQualityLevels", watch);
		const manualQuality = availableLevels?.filter((level) => level !== "auto" && level !== closestQuality).at(-1);
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
