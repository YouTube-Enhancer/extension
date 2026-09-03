import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { YoutubePlayerQualityLevel } from "@/src/features/playerQuality/types";
import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { metadata } from "@/src/features/playerQuality/index.metadata";
import { youtubePlayerQualityLabels, youtubePlayerQualityLevels } from "@/src/features/playerQuality/types";
import { expectCurrentQualityLevelToBeTruthy, expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { getClosestQuality, getValueFromYouTubePlayer } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { lookupItag } from "@/src/utils/player/itagDb";
const { watch } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);

export const qualityLevel = "hd2160" as YoutubePlayerQualityLevel;
// Pinned so the expectation the helper computes and the strategy the feature runs with cannot drift apart.
const fallbackStrategy = "lower";
type QualityFormat = { formatId: number; isPremium: boolean; quality: string };

/**
 * Clicks the entry of YouTube's own settings menu whose label starts with `labelPrefix`. Scoped to YouTube's
 * settings popup because the extension renders its own `.ytp-menuitem` rows inside `#yte-feature-menu`.
 */
async function clickPlayerMenuItem(page: Page, labelPrefix: string): Promise<boolean> {
	return page.evaluate(
		({ prefix, root }) => {
			const menu = document.querySelector(root);
			if (!menu) return false;
			const item = Array.from(menu.querySelectorAll<HTMLDivElement>(".ytp-menuitem")).find((el) =>
				el.querySelector(".ytp-menuitem-label")?.textContent?.trim().toLowerCase().startsWith(prefix.toLowerCase())
			);
			item?.click();
			return !!item;
		},
		{ prefix: labelPrefix, root: settingsPanelMenuSelector }
	);
}
/**
 * Keeps the video muted and playing from now on, across in-page navigations too.
 *
 * A script may only start muted playback, and a player that never started reports a playback quality of
 * "unknown" - which is not a level the feature can enforce anything against, so it would keep retrying until
 * its budget ran out and never record what it applied.
 */
async function keepPlaybackRunning(page: Page): Promise<void> {
	await page.evaluate(() => {
		const resume = () => {
			const video = document.querySelector<HTMLVideoElement>(".html5-main-video");
			if (!video) return;
			video.muted = true;
			if (!video.paused) return;
			void video.play().catch(() => {});
			// After a skipped ad the element alone does not always resume; the player API does.
			const player = document.querySelector("div#movie_player") as unknown as null | { mute?: () => void; playVideo?: () => void };
			player?.mute?.();
			player?.playVideo?.();
		};
		resume();
		window.setInterval(resume, 250);
	});
}
/** The frame rate of the format the player is actually streaming, as recorded in the itag database. */
async function readAppliedFps(page: Page): Promise<Nullable<number>> {
	const formatId = await page.evaluate(() => {
		const player = document.querySelector("div#movie_player") as unknown as Nullable<YouTubePlayerDiv>;
		return player?.getVideoStats?.()?.fmt ?? null;
	});
	if (formatId === null) return null;
	return lookupItag(formatId)?.fps ?? null;
}
async function readQualityFormats(page: Page): Promise<Nullable<QualityFormat[]>> {
	return page.evaluate(() => {
		const player = document.querySelector("div#movie_player") as unknown as Nullable<YouTubePlayerDiv>;
		if (!player?.getAvailableQualityData) return null;
		return player.getAvailableQualityData().map(({ formatId, paygatedQualityDetails, quality }) => ({
			formatId,
			isPremium: !!paygatedQualityDetails,
			quality
		}));
	});
}
/** Finds a quality the player offers at more than one frame rate, which is the only case fpsPreference decides. */
function resolveFpsCandidate(formats: QualityFormat[]) {
	const byQuality = new Map<string, number[]>();
	for (const { formatId, quality } of formats) {
		byQuality.set(quality, [...(byQuality.get(quality) ?? []), lookupItag(formatId)?.fps ?? 30]);
	}
	for (const [quality, frameRates] of byQuality) {
		const highestFps = Math.max(...frameRates);
		const lowestFps = Math.min(...frameRates);
		if (highestFps !== lowestFps) return { highestFps, lowestFps, quality: quality as YoutubePlayerQualityLevel };
	}
	return null;
}
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
		// The two calls YouTube makes when a quality is picked from its own menu. They only change what the
		// player has been *asked* to play: getPlaybackQuality() keeps reporting the enforced level until the
		// switch has buffered, and that buffering re-runs enforcement, so this is the case that used to be lost.
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
		await expectToStay(async () => getValueFromYouTubePlayer(page, "getPlaybackQuality", watch), manualQuality, { durationMs: 5000, page });
		// A config change clears the suspension and the configured quality is enforced again.
		await disableFeature(page, "playerQuality.enabled");
		await enableFeature(page, "playerQuality.enabled");
		await expectCurrentQualityLevelToBeTruthy(page, watch, closestQuality);
	});
	test(`applies the configured fps preference when several formats share a quality on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		const formats = await readQualityFormats(page);
		if (!formats) return; // the player exposes no per-format data
		const candidate = resolveFpsCandidate(formats);
		if (!candidate) return; // no quality is offered at more than one frame rate on this video
		await setOption(page, "playerQuality.quality", candidate.quality);
		await setOption(page, "playerQuality.fallbackStrategy", fallbackStrategy);
		await setOption(page, "playerQuality.fpsPreference", "higher");
		await enableFeature(page, "playerQuality.enabled");
		await expectCurrentQualityLevelToBeTruthy(page, watch, candidate.quality);
		// getVideoStats().fmt is the format the player actually streams, so it distinguishes two formats that
		// report the same quality level - which getPlaybackQuality() cannot.
		await expect.poll(async () => readAppliedFps(page), { timeout: 15000 }).toBe(candidate.highestFps);
		// playerQuality has no onConfigChange, so the opposite preference needs a fresh enable to be applied.
		await disableFeature(page, "playerQuality.enabled");
		await setOption(page, "playerQuality.fpsPreference", "lower");
		await enableFeature(page, "playerQuality.enabled");
		await expectCurrentQualityLevelToBeTruthy(page, watch, candidate.quality);
		await expect.poll(async () => readAppliedFps(page), { timeout: 15000 }).toBe(candidate.lowestFps);
	});
	test(`prefers a premium format when preferPremium is enabled on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		const formats = await readQualityFormats(page);
		if (!formats) return;
		// Premium formats only exist for paying accounts, so the case is unreachable on an anonymous profile.
		const premium = formats.find(({ isPremium }) => isPremium);
		if (!premium) return;
		if (!formats.some(({ isPremium, quality }) => quality === premium.quality && !isPremium)) return;
		await setOption(page, "playerQuality.quality", premium.quality as YoutubePlayerQualityLevel);
		await setOption(page, "playerQuality.fallbackStrategy", fallbackStrategy);
		await setOption(page, "playerQuality.preferPremium", true);
		await enableFeature(page, "playerQuality.enabled");
		await expect
			.poll(
				async () =>
					page.evaluate(() => {
						const player = document.querySelector("div#movie_player") as unknown as Nullable<YouTubePlayerDiv>;
						return player?.getVideoStats?.()?.fmt ?? null;
					}),
				{ timeout: 15000 }
			)
			.toBe(premium.formatId);
	});
	test(`re-applies quality after an in-page navigation to another video on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "playerQuality.quality", qualityLevel);
		await setOption(page, "playerQuality.fallbackStrategy", fallbackStrategy);
		await enableFeature(page, "playerQuality.enabled");
		const closestQuality = await getClosestQuality(page, watch, qualityLevel, fallbackStrategy);
		if (!closestQuality) return;
		await expectCurrentQualityLevelToBeTruthy(page, watch, closestQuality);
		// The apply path records the enforced level on the player; clearing it first means the marker can only
		// come back if onNavigate ran a fresh apply task rather than the enable that happened before.
		await expect(page.locator(`div#movie_player[data-default-quality="${closestQuality}"]`)).toBeAttached({ timeout: 15000 });
		await page.evaluate(() => document.querySelector("div#movie_player")?.removeAttribute("data-default-quality"));
		// Armed before the switch so the next video starts the moment it exists: the retry loop onNavigate begins
		// has a fixed budget, and a player still reporting "unknown" when it expires never gets its level applied.
		await keepPlaybackRunning(page);
		// A genuine in-document navigation is the only path that reaches onNavigate.
		await spaNavigateToRelatedVideo(page);
		const closestQualityAfterNavigation = await getClosestQuality(page, watch, qualityLevel, fallbackStrategy);
		if (!closestQualityAfterNavigation) return;
		// The marker is the direct evidence that onNavigate ran a fresh apply, and it appears as soon as the
		// level has been requested rather than once the player has finished switching to it.
		await expect(page.locator(`div#movie_player[data-default-quality="${closestQualityAfterNavigation}"]`)).toBeAttached({ timeout: 30000 });
		// Streaming the requested level takes longer than requesting it, so this waits longer than the shared
		// quality assertion does.
		await expect
			.poll(async () => getValueFromYouTubePlayer(page, "getPlaybackQuality", watch), { timeout: 30000 })
			.toBe(closestQualityAfterNavigation);
	});
	test(`suspends enforcement when quality is changed from the player settings menu on ${watch}`, async ({ page }) => {
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
		const { [youtubePlayerQualityLevels.indexOf(manualQuality)]: manualLabel } = youtubePlayerQualityLabels;
		// Going through YouTube's own menu is what makes the switch observable: it changes the streamed format,
		// which is the signal hasForeignQuality() reads first.
		await page.locator("div#movie_player").hover();
		await page.locator(".ytp-settings-button").click();
		await expect(page.locator(settingsPanelMenuSelector)).toBeVisible();
		expect(await clickPlayerMenuItem(page, "quality")).toBe(true);
		// `.ytp-panel-menu` alone matches YouTube's main panel, YouTube's quality panel and the extension's own
		// `#yte-panel-menu`, so the quality panel has to be addressed through YouTube's settings popup.
		await expect(page.locator(`${settingsPanelMenuSelector} .ytp-quality-menu`)).toBeVisible();
		expect(await clickPlayerMenuItem(page, manualLabel)).toBe(true);
		await expectCurrentQualityLevelToBeTruthy(page, watch, manualQuality);
		// Enforcement must leave the manual choice alone instead of snapping the quality straight back.
		await expectToStay(async () => getValueFromYouTubePlayer(page, "getPlaybackQuality", watch), manualQuality, { durationMs: 5000, page });
		// A config change clears the suspension and the configured quality is enforced again.
		await disableFeature(page, "playerQuality.enabled");
		await enableFeature(page, "playerQuality.enabled");
		await expectCurrentQualityLevelToBeTruthy(page, watch, closestQuality);
	});
});
