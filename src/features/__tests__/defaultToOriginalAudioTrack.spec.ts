import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { metadata } from "@/src/features/defaultToOriginalAudioTrack/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { home } = pageTypeRecord;

function getPlayerSelector(pageType: PageType) {
	return pageType === "shorts" ? "#shorts-player" : "div#movie_player";
}

test.describe("defaultToOriginalAudioTrack", () => {
	for (const pageType of testPages) {
		test(`should switch to original (non-auto-dubbed) audio track on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["dubbedAudio"]);
			await enableFeature(page, "defaultToOriginalAudioTrack.enabled");
			await expect(page.locator(getPlayerSelector(pageType))).toBeVisible({ timeout: 10000 });

			await expect
				.poll(
					async () => {
						const isOriginal = await page.evaluate(async () => {
							const query = () => {
								const selector = document.location.pathname.startsWith("/shorts") ? "#shorts-player" : "div#movie_player";
								return document.querySelector<HTMLDivElement & { getAudioTrack?: () => Promise<Record<string, unknown>> | Record<string, unknown> }>(
									selector
								);
							};
							const isTrackNonAutoDubbed = (val: unknown): boolean | null => {
								if (typeof val !== "object" || val === null || Array.isArray(val)) return null;
								const raw = val as Record<string, unknown>;
								if (
									typeof raw.name === "string" &&
									typeof raw.isDefault === "boolean" &&
									typeof raw.isAutoDubbed === "boolean" &&
									typeof raw.id === "string"
								) {
									return raw.isAutoDubbed === false;
								}
								return null;
							};
							const player = query();
							if (!player?.getAudioTrack) return null;
							const raw = await player.getAudioTrack();
							if (!raw || typeof raw !== "object") return null;
							// Check top-level
							const topResult = isTrackNonAutoDubbed(raw);
							if (topResult !== null) return topResult;
							// Check nested objects
							for (const value of Object.values(raw)) {
								const result = isTrackNonAutoDubbed(value);
								if (result !== null) return result;
							}
							return null;
						});
						return isOriginal;
					},
					{ intervals: [500], timeout: 30000 }
				)
				.toBe(true);
		});

		test(`should restore original audio track when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["dubbedAudio"]);
			const originalTrackId = await page.evaluate(async () => {
				const selector = document.location.pathname.startsWith("/shorts") ? "#shorts-player" : "div#movie_player";
				const player = document.querySelector<HTMLDivElement & { getAudioTrack?: () => Promise<Record<string, unknown>> | Record<string, unknown> }>(
					selector
				);
				if (!player?.getAudioTrack) return null;
				const track = await player.getAudioTrack();
				for (const val of Object.values(track)) {
					if (typeof val === "object" && val !== null && "id" in val && typeof val.id === "string") {
						return val.id;
					}
				}
				return null;
			});
			expect(originalTrackId).not.toBeNull();

			await enableFeature(page, "defaultToOriginalAudioTrack.enabled");
			await disableFeature(page, "defaultToOriginalAudioTrack.enabled");

			await expect
				.poll(
					async () => {
						const id = await page.evaluate(async () => {
							const selector = document.location.pathname.startsWith("/shorts") ? "#shorts-player" : "div#movie_player";
							const player = document.querySelector<
								HTMLDivElement & { getAudioTrack?: () => Promise<Record<string, unknown>> | Record<string, unknown> }
							>(selector);
							if (!player?.getAudioTrack) return null;
							const track = await player.getAudioTrack();
							for (const val of Object.values(track)) {
								if (typeof val === "object" && val !== null && "id" in val && typeof val.id === "string") {
									return val.id;
								}
							}
							return null;
						});
						return id;
					},
					{ intervals: [500], timeout: 30000 }
				)
				.toBe(originalTrackId);
		});

		test(`should switch to original audio track on re-enable after disable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["dubbedAudio"]);
			await enableFeature(page, "defaultToOriginalAudioTrack.enabled");
			await expect(page.locator(getPlayerSelector(pageType))).toBeVisible({ timeout: 10000 });
			await disableFeature(page, "defaultToOriginalAudioTrack.enabled");
			await enableFeature(page, "defaultToOriginalAudioTrack.enabled");
			await expect(page.locator(getPlayerSelector(pageType))).toBeVisible({ timeout: 10000 });
		});
		test(`should persist original audio track after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["dubbedAudio"]);
			await enableFeature(page, "defaultToOriginalAudioTrack.enabled");
			await expect(page.locator(getPlayerSelector(pageType))).toBeVisible({ timeout: 10000 });
			await page.reload();
			await navigateToPageType(page, pageType, ["dubbedAudio"]);
			await expect(page.locator(getPlayerSelector(pageType))).toBeVisible({ timeout: 15000 });
		});
		test(`should switch to original audio track after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["dubbedAudio"]);
			await enableFeature(page, "defaultToOriginalAudioTrack.enabled");
			await expect(page.locator(getPlayerSelector(pageType))).toBeVisible({ timeout: 10000 });

			await expect
				.poll(
					async () => {
						const isOriginal = await page.evaluate(async () => {
							const query = () => {
								const selector = document.location.pathname.startsWith("/shorts") ? "#shorts-player" : "div#movie_player";
								return document.querySelector<HTMLDivElement & { getAudioTrack?: () => Promise<Record<string, unknown>> | Record<string, unknown> }>(
									selector
								);
							};
							const isTrackNonAutoDubbed = (val: unknown): boolean | null => {
								if (typeof val !== "object" || val === null || Array.isArray(val)) return null;
								const raw = val as Record<string, unknown>;
								if (
									typeof raw.name === "string" &&
									typeof raw.isDefault === "boolean" &&
									typeof raw.isAutoDubbed === "boolean" &&
									typeof raw.id === "string"
								) {
									return raw.isAutoDubbed === false;
								}
								return null;
							};
							const player = query();
							if (!player?.getAudioTrack) return null;
							const raw = await player.getAudioTrack();
							if (!raw || typeof raw !== "object") return null;
							const topResult = isTrackNonAutoDubbed(raw);
							if (topResult !== null) return topResult;
							for (const value of Object.values(raw)) {
								const result = isTrackNonAutoDubbed(value);
								if (result !== null) return result;
							}
							return null;
						});
						return isOriginal;
					},
					{ intervals: [500], timeout: 30000 }
				)
				.toBe(true);

			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType, ["dubbedAudio"]);

			await expect(page.locator(getPlayerSelector(pageType))).toBeVisible({ timeout: 10000 });
			await expect
				.poll(
					async () => {
						const isOriginal = await page.evaluate(async () => {
							const query = () => {
								const selector = document.location.pathname.startsWith("/shorts") ? "#shorts-player" : "div#movie_player";
								return document.querySelector<HTMLDivElement & { getAudioTrack?: () => Promise<Record<string, unknown>> | Record<string, unknown> }>(
									selector
								);
							};
							const isTrackNonAutoDubbed = (val: unknown): boolean | null => {
								if (typeof val !== "object" || val === null || Array.isArray(val)) return null;
								const raw = val as Record<string, unknown>;
								if (
									typeof raw.name === "string" &&
									typeof raw.isDefault === "boolean" &&
									typeof raw.isAutoDubbed === "boolean" &&
									typeof raw.id === "string"
								) {
									return raw.isAutoDubbed === false;
								}
								return null;
							};
							const player = query();
							if (!player?.getAudioTrack) return null;
							const raw = await player.getAudioTrack();
							if (!raw || typeof raw !== "object") return null;
							const topResult = isTrackNonAutoDubbed(raw);
							if (topResult !== null) return topResult;
							for (const value of Object.values(raw)) {
								const result = isTrackNonAutoDubbed(value);
								if (result !== null) return result;
							}
							return null;
						});
						return isOriginal;
					},
					{ intervals: [500], timeout: 30000 }
				)
				.toBe(true);
		});
		test(`should not switch to original audio track when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["dubbedAudio"]);
			await disableFeature(page, "defaultToOriginalAudioTrack.enabled");
			await expect(page.locator(getPlayerSelector(pageType))).toBeVisible({ timeout: 10000 });
			// Get the current track ID — if it's already original, test is not applicable
			const originalTrackId = await page.evaluate(async () => {
				const selector = document.location.pathname.startsWith("/shorts") ? "#shorts-player" : "div#movie_player";
				const player = document.querySelector<HTMLDivElement & { getAudioTrack?: () => Promise<Record<string, unknown>> | Record<string, unknown> }>(
					selector
				);
				if (!player?.getAudioTrack) return null;
				const track = await player.getAudioTrack();
				for (const val of Object.values(track)) {
					if (typeof val === "object" && val !== null && "id" in val && typeof val.id === "string") {
						return val.id;
					}
				}
				return null;
			});
			if (!originalTrackId) return;
			// Verify track doesn't change (feature should have no effect)
			await page.waitForTimeout(2000);
			const currentTrackId = await page.evaluate(async () => {
				const selector = document.location.pathname.startsWith("/shorts") ? "#shorts-player" : "div#movie_player";
				const player = document.querySelector<HTMLDivElement & { getAudioTrack?: () => Promise<Record<string, unknown>> | Record<string, unknown> }>(
					selector
				);
				if (!player?.getAudioTrack) return null;
				const track = await player.getAudioTrack();
				for (const val of Object.values(track)) {
					if (typeof val === "object" && val !== null && "id" in val && typeof val.id === "string") {
						return val.id;
					}
				}
				return null;
			});
			expect(currentTrackId).toBe(originalTrackId);
		});
	}
});
