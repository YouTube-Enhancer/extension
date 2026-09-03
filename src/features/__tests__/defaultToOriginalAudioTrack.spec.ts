import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { metadata } from "@/src/features/defaultToOriginalAudioTrack/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
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

function getPlayerSelector(pageType: PageType) {
	return pageType === "shorts" ? "#shorts-player" : "div#movie_player";
}

/** Reads whether the current track is auto-dubbed, or null while the player reports no usable descriptor. */
async function isAutoDubbed(page: Page): Promise<boolean | null> {
	return (await getAudioTrack(page))?.isAutoDubbed ?? null;
}

test.describe("defaultToOriginalAudioTrack", () => {
	for (const pageType of testPages) {
		test(`should switch to original (non-auto-dubbed) audio track on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["dubbedAudio"]);
			await enableFeature(page, "defaultToOriginalAudioTrack.enabled");
			await expect(page.locator(getPlayerSelector(pageType))).toBeVisible({ timeout: 10000 });
			await expectOriginalAudioTrack(page);
		});

		test(`should restore original audio track when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["dubbedAudio"]);
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
		// The dubbedAudio fixture starts on an auto-dubbed track; with the feature off it has to stay on it.
		await expect.poll(async () => isAutoDubbed(page), { intervals: [500], timeout: 15000 }).toBe(true);
		await expectToStay(async () => isAutoDubbed(page), true, { durationMs: 3000, intervalMs: 500, page });
	});
});
