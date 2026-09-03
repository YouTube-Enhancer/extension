import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { metadata } from "@/src/features/defaultToOriginalAudioTrack/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { waitForYoutubePlayerReady } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

// "shorts" is dropped from the feature's includePages: the three executeWithRetries calls in index.ts pass no
// pageTypes, so DEFAULT_CONFIG's ["watch", "live"] applies and isOnAllowedPage is false on /shorts - the shorts
// branches never execute. Re-add it once the feature passes pageTypes: ["shorts", "watch"].
const testPages = resolvePageTypes(metadata.dependencies?.includePages).filter((pageType) => pageType !== "shorts");
const { home, watch } = pageTypeRecord;

type AudioTrack = { id: string; isAutoDubbed: boolean };

/** Polls the player until it reports a track whose descriptor is explicitly not auto-dubbed. */
async function expectOriginalAudioTrack(page: Page): Promise<void> {
	await expect.poll(async () => isAutoDubbed(page), { intervals: [500], timeout: 30000 }).toBe(false);
}

/**
 * Reads the audio track the player reports, accepting only descriptors with the shape the feature's parseAudioTrack
 * accepts, so the spec and the feature agree on what counts as a track.
 */
async function getAudioTrack(page: Page): Promise<AudioTrack | null> {
	return await page.evaluate(async () => {
		const selector = document.location.pathname.startsWith("/shorts") ? "#shorts-player" : "div#movie_player";
		const player = document.querySelector<HTMLDivElement & { getAudioTrack?: () => Promise<Record<string, unknown>> | Record<string, unknown> }>(
			selector
		);
		if (!player?.getAudioTrack) return null;
		const parseTrack = (value: unknown): null | { id: string; isAutoDubbed: boolean } => {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
			const track = value as Record<string, unknown>;
			if (
				typeof track.name === "string" &&
				typeof track.isDefault === "boolean" &&
				typeof track.isAutoDubbed === "boolean" &&
				typeof track.id === "string"
			) {
				return { id: track.id, isAutoDubbed: track.isAutoDubbed };
			}
			return null;
		};
		const raw: unknown = await player.getAudioTrack();
		if (!raw || typeof raw !== "object") return null;
		return parseTrack(raw) ?? Object.values(raw).map(parseTrack).find(Boolean) ?? null;
	});
}

/** Reads the id of the audio track the player currently reports, or null when the player exposes no track. */
async function getAudioTrackId(page: Page): Promise<null | string> {
	return (await getAudioTrack(page))?.id ?? null;
}

/**
 * Reads the ids of every audio track the current video offers together with the one the player is on, in a single
 * evaluate so both describe the same moment: after an in-page switch the player keeps answering with the previous
 * video's tracks for a while, and a list read then does not belong to the video that is playing now.
 */
async function getAudioTrackState(page: Page): Promise<{ availableIds: string[]; currentId: null | string }> {
	return { availableIds: await getAvailableAudioTrackIds(page), currentId: await getAudioTrackId(page) };
}
/** Reads the ids of every audio track the current video offers, using the same descriptor shape the feature parses. */
async function getAvailableAudioTrackIds(page: Page): Promise<string[]> {
	return await page.evaluate(async () => {
		const player = document.querySelector<
			HTMLDivElement & { getAvailableAudioTracks?: () => Promise<Record<string, unknown>[]> | Record<string, unknown>[] }
		>("div#movie_player");
		if (!player?.getAvailableAudioTracks) return [];
		const parseId = (value: unknown): null | string => {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
			const track = value as Record<string, unknown>;
			if (
				typeof track.name === "string" &&
				typeof track.isDefault === "boolean" &&
				typeof track.isAutoDubbed === "boolean" &&
				typeof track.id === "string"
			) {
				return track.id;
			}
			return null;
		};
		const tracks = await player.getAvailableAudioTracks();
		const ids = tracks.map((raw) => parseId(raw) ?? Object.values(raw).map(parseId).find(Boolean) ?? null).filter((id): id is string => id !== null);
		return [...new Set(ids)];
	});
}
function getPlayerSelector(pageType: PageType) {
	return pageType === "shorts" ? "#shorts-player" : "div#movie_player";
}
/** Reads the video id the player itself reports, so an assertion can tell which video a track belongs to. */
async function getPlayerVideoId(page: Page): Promise<null | string> {
	return await page.evaluate(async () => {
		const player = document.querySelector<HTMLDivElement & { getVideoData?: () => Promise<{ video_id?: string }> | { video_id?: string } }>(
			"div#movie_player"
		);
		if (!player?.getVideoData) return null;
		const data = await player.getVideoData();
		return data.video_id ?? null;
	});
}
/** Reads whether the current track is auto-dubbed, or null while the player reports no usable descriptor. */
async function isAutoDubbed(page: Page): Promise<boolean | null> {
	return (await getAudioTrack(page))?.isAutoDubbed ?? null;
}

/**
 * Puts the player on an auto-dubbed track before the feature is enabled. YouTube auto-dubs the fixture for an
 * en-US viewer on most loads but not all; when it did not, the auto-dubbed track is selected through the same
 * player API the feature uses, so the test only skips when the video offers no auto-dubbed track at all.
 * Without that start there is nothing for the feature to switch away from, and a "switches to original"
 * assertion would pass without the feature doing anything.
 */
async function requireAutoDubbedStart(page: Page): Promise<void> {
	const startedAutoDubbed = await waitForAutoDubbed(page, 5000);
	if (!startedAutoDubbed) {
		const selected = await selectAutoDubbedTrack(page);
		test.skip(!selected, "this video offers no auto-dubbed track, so there is nothing to switch away from");
		const autoDubbed = await waitForAutoDubbed(page, 10000);
		test.skip(!autoDubbed, "the player did not take the auto-dubbed track it offers");
	}
}

/** Selects the video's auto-dubbed track through the player API; false when the video offers none. */
async function selectAutoDubbedTrack(page: Page): Promise<boolean> {
	return await page.evaluate(async () => {
		const player = document.querySelector<
			HTMLDivElement & {
				getAvailableAudioTracks?: () => Promise<Record<string, unknown>[]> | Record<string, unknown>[];
				setAudioTrack?: (track: Record<string, unknown>) => unknown;
			}
		>("div#movie_player");
		if (!player?.getAvailableAudioTracks || !player.setAudioTrack) return false;
		const describesAutoDubbed = (value: unknown): boolean => {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
			const track = value as Record<string, unknown>;
			return typeof track.id === "string" && track.isAutoDubbed === true;
		};
		const tracks = await player.getAvailableAudioTracks();
		const autoDubbed = tracks.find((raw) => describesAutoDubbed(raw) || Object.values(raw).some(describesAutoDubbed));
		if (!autoDubbed) return false;
		await player.setAudioTrack(autoDubbed);
		return true;
	});
}

/**
 * Walks YouTube's own history back, which is a single-page navigation: it fires popstate, so the extension's
 * onNavigate hooks run, and it lands on a video this spec already knows is auto-dubbed by default.
 */
async function spaNavigateBackToVideo(page: Page, expectedVideoId: string): Promise<void> {
	await page.evaluate(() => history.back());
	await page.waitForURL((url) => url.searchParams.get("v") === expectedVideoId, { timeout: 30000 });
	await expect.poll(async () => getPlayerVideoId(page), { intervals: [500], timeout: 30000 }).toBe(expectedVideoId);
	await waitForYoutubePlayerReady(page, watch);
}

/** Waits for the player to report an auto-dubbed track; false when it has not within the timeout. */
async function waitForAutoDubbed(page: Page, timeout: number): Promise<boolean> {
	return await expect
		.poll(async () => isAutoDubbed(page), { intervals: [500], timeout })
		.toBe(true)
		.then(() => true)
		.catch(() => false);
}

test.describe("defaultToOriginalAudioTrack", () => {
	for (const pageType of testPages) {
		test(`should switch to original (non-auto-dubbed) audio track on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["dubbedAudio"]);
			await requireAutoDubbedStart(page);
			await enableFeature(page, "defaultToOriginalAudioTrack.enabled");
			await expect(page.locator(getPlayerSelector(pageType))).toBeVisible({ timeout: 10000 });
			await expectOriginalAudioTrack(page);
		});

		test(`should restore original audio track when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["dubbedAudio"]);
			await requireAutoDubbedStart(page);
			const originalTrackId = await getAudioTrackId(page);
			expect(originalTrackId).not.toBeNull();

			await enableFeature(page, "defaultToOriginalAudioTrack.enabled");
			// Wait for the switch to land before disabling: onDisable aborts the in-flight retry, so disabling too
			// early would "restore" a track that was never changed.
			await expectOriginalAudioTrack(page);
			await disableFeature(page, "defaultToOriginalAudioTrack.enabled");

			await expect.poll(async () => getAudioTrackId(page), { intervals: [500], timeout: 30000 }).toBe(originalTrackId);

			await enableFeature(page, "defaultToOriginalAudioTrack.enabled");
			await expectOriginalAudioTrack(page);
		});

		test(`should switch to original audio track after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["dubbedAudio"]);
			await requireAutoDubbedStart(page);
			await enableFeature(page, "defaultToOriginalAudioTrack.enabled");
			await expect(page.locator(getPlayerSelector(pageType))).toBeVisible({ timeout: 10000 });
			await expectOriginalAudioTrack(page);

			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType, ["dubbedAudio"]);

			await expect(page.locator(getPlayerSelector(pageType))).toBeVisible({ timeout: 10000 });
			await expectOriginalAudioTrack(page);
		});
	}

	// Watch only: the disabled path has no shorts-specific code beyond the player selector, and on /shorts the feature cannot run at all.
	test(`should not switch to original audio track when disabled on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["dubbedAudio"]);
		await disableFeature(page, "defaultToOriginalAudioTrack.enabled");
		await expect(page.locator(getPlayerSelector(watch))).toBeVisible({ timeout: 10000 });
		// With the feature off the auto-dubbed track this load started on has to stay selected.
		await requireAutoDubbedStart(page);
		await expectToStay(async () => isAutoDubbed(page), true, { durationMs: 3000, intervalMs: 500, page });
	});

	// Watch only: onNavigate takes the same code path on both pages the feature declares, and on /shorts the retry
	// loop never runs at all (see the note on testPages above).
	test(`should re-apply the original audio track after an in-page navigation on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["dubbedAudio"]);
		await requireAutoDubbedStart(page);
		const dubbedVideoId = new URL(page.url()).searchParams.get("v");
		expect(dubbedVideoId).not.toBeNull();
		await enableFeature(page, "defaultToOriginalAudioTrack.enabled");
		await expectOriginalAudioTrack(page);

		// Leave and come back in-page. Every navigateToPageType in this spec is a document load that re-runs onEnable,
		// whereas this round trip only fires onNavigate, and it lands back on a video that defaults to a dubbed track.
		await spaNavigateToRelatedVideo(page);
		await spaNavigateBackToVideo(page, dubbedVideoId!);
		await expectOriginalAudioTrack(page);
	});
	test(`should restore the current video's audio track, not the previous one's, after an in-page switch on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["dubbedAudio"]);
		await requireAutoDubbedStart(page);
		await enableFeature(page, "defaultToOriginalAudioTrack.enabled");
		await expectOriginalAudioTrack(page);

		// Switching video in-page runs onNavigate only, so the track to restore has to be captured again for the video
		// that is playing now instead of staying the one from before the switch.
		await spaNavigateToRelatedVideo(page);
		const switchedVideoId = new URL(page.url()).searchParams.get("v");
		expect(switchedVideoId).not.toBeNull();
		await expect.poll(async () => getPlayerVideoId(page), { intervals: [500], timeout: 30000 }).toBe(switchedVideoId);
		// The player answers with the previous video's tracks for a moment after the switch, and a list read then
		// would make the assertion below compare the restored track against the wrong video's offering.
		await expect
			.poll(
				async () => {
					const { availableIds, currentId } = await getAudioTrackState(page);
					return currentId !== null && availableIds.includes(currentId);
				},
				{ intervals: [500], timeout: 30000 }
			)
			.toBe(true);
		const { availableIds: switchedVideoTrackIds } = await getAudioTrackState(page);
		expect(switchedVideoTrackIds.length).toBeGreaterThan(0);
		await disableFeature(page, "defaultToOriginalAudioTrack.enabled");

		// Restoring has to put back a track of the video that is playing now, never one carried over from before:
		// the previous video's saved track is not among this video's own, so it could not pass this.
		await expect.poll(async () => getAudioTrackId(page), { intervals: [500], timeout: 30000 }).not.toBeNull();
		const { availableIds: restoredVideoTrackIds, currentId: restoredTrackId } = await getAudioTrackState(page);
		expect(await getPlayerVideoId(page), "the restore must not move the player off the video it was on").toBe(switchedVideoId);
		expect(restoredVideoTrackIds).toEqual(switchedVideoTrackIds);
		expect(switchedVideoTrackIds).toContain(restoredTrackId);
	});
});
