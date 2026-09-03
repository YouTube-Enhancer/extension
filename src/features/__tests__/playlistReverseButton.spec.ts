import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { WatchFlexyElement } from "@/src/features/playlistReverseButton/utils";
import type { Nullable } from "@/src/types";
import type { FixtureCapabilities } from "@/src/utils/_tests/navigation";

import { metadata } from "@/src/features/playlistReverseButton/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage } from "@/src/utils/_tests/navigation";
import { waitForYoutubePlayerReady } from "@/src/utils/_tests/player";
import { readStoredOptions, readStoredState } from "@/src/utils/_tests/storage";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const playlistRequirements: FixtureCapabilities[] = ["playlistLength", "playlistManagementButtons"];
const { below } = placementRecord;
const { playlist, watch } = pageTypeRecord;

async function getPlaylistOrder(page: Parameters<typeof navigateToPageType>[0]): Promise<string[]> {
	return await page.evaluate(() => {
		const items = document.querySelectorAll<HTMLAnchorElement>("ytd-playlist-panel-video-renderer a#thumbnail");
		if (items.length > 0) {
			return Array.from(items).map((a) => {
				const url = new URL(a.href);
				return url.searchParams.get("v") ?? "";
			});
		}
		const playlistId = new URLSearchParams(window.location.search).get("list");
		if (!playlistId) return [];
		const fallbackItems = document.querySelectorAll<HTMLAnchorElement>(`#playlist a[href*="list=${playlistId}"]`);
		return Array.from(fallbackItems).map((a) => {
			const url = new URL(a.href);
			return url.searchParams.get("v") ?? "";
		});
	});
}

async function getPlaylistPageOrder(page: Parameters<typeof navigateToPageType>[0]): Promise<string[]> {
	return await page.evaluate(() => {
		const items = document.querySelectorAll<HTMLAnchorElement>("ytd-playlist-video-renderer a#thumbnail");
		return Array.from(items).map((a) => {
			const url = new URL(a.href);
			return url.searchParams.get("v") ?? "";
		});
	});
}

/** Reads the video id and panel position of the item YouTube currently marks as playing. */
async function getSelectedPanelPosition(page: Page): Promise<Nullable<{ index: number; total: number; videoId: string }>> {
	return await page.evaluate(() => {
		const items = Array.from(document.querySelectorAll<HTMLElement>("ytd-playlist-panel-video-renderer"));
		const index = items.findIndex((item) => item.hasAttribute("selected"));
		if (index === -1) return null;
		const anchor = items[index].querySelector<HTMLAnchorElement>("a#thumbnail");
		if (!anchor) return null;
		const videoId = new URL(anchor.href).searchParams.get("v");
		if (!videoId) return null;
		return { index, total: items.length, videoId };
	});
}

async function readIsReversedState(page: Page): Promise<boolean | undefined> {
	const storedState = await readStoredState(page);
	return (storedState.playlistReverseButton as undefined | { isReversed: boolean })?.isReversed;
}

/**
 * Reads the watch page playlist data the feature reverses. `firstIndex`/`lastIndex` are the playlist positions of
 * the first and last loaded panel items, which is how the feature itself recognises an already reversed panel.
 */
async function readWatchPlaylistState(page: Page): Promise<
	Nullable<{
		currentIndex: number;
		firstIndex: number;
		lastIndex: number;
		length: number;
		localCurrentIndex: number;
		totalVideos: number;
	}>
> {
	return await page.evaluate(() => {
		const watchFlexy = document.querySelector<WatchFlexyElement>("ytd-watch-flexy, ytd-watch-grid");
		const playlistData = watchFlexy?.data?.contents?.twoColumnWatchNextResults?.playlist?.playlist;
		if (!playlistData?.contents.length) return null;
		const { contents, currentIndex, localCurrentIndex, totalVideos } = playlistData;
		const positionOf = (item: (typeof contents)[number]) => item.playlistPanelVideoRenderer?.navigationEndpoint?.watchEndpoint?.index ?? -1;
		const first = contents.at(0);
		const last = contents.at(-1);
		if (!first || !last) return null;
		return {
			currentIndex,
			firstIndex: positionOf(first),
			lastIndex: positionOf(last),
			length: contents.length,
			localCurrentIndex,
			totalVideos
		};
	});
}

/**
 * Clicks another video in the watch page playlist panel. That is a genuine in-page navigation which keeps the
 * playlist attached, so the feature's onNavigate hook runs instead of a fresh document load.
 */
async function spaNavigateToOtherPlaylistVideo(page: Page): Promise<void> {
	const videoId = new URL(page.url()).searchParams.get("v");
	const link = page.locator(`ytd-playlist-panel-video-renderer a#thumbnail:not([href*="v=${videoId}"])`).first();
	await expect(link).toBeAttached({ timeout: 15_000 });
	await link.evaluate((element) => element.scrollIntoView({ block: "center" }));
	await link.click();
	await page.waitForURL((url) => url.searchParams.get("v") !== videoId, { timeout: 30_000 });
	await expect(page.locator("html[yte-ready]")).toBeAttached();
	await waitForYoutubePlayerReady(page, "watch");
}

test.describe("playlistReverseButton", () => {
	for (const pageType of testPages) {
		if (pageType === "watch") {
			test(`reverse button should be present when enabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect(page.locator("#yte-playlist-reverse-button")).toBeAttached({ timeout: 10000 });
				await expect(page.locator("#yte-playlist-reverse-button-container")).toBeAttached({ timeout: 5000 });
			});
			test(`should reverse playlist order on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistOrder(page);
				expect(before.length).toBeGreaterThan(1);
				await button.click();
				// Compare the whole array: a rotation, a swap or a partial reversal must not pass as a reversal.
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual([...before].reverse());
			});
			test(`should maintain reversed order after disable then re-enable on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistOrder(page);
				expect(before.length).toBeGreaterThan(1);
				const reversed = [...before].reverse();
				await button.click();
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual(reversed);
				await disableFeature(page, "playlistReverseButton.enabled");
				await expect(button).not.toBeAttached();
				await expect(page.locator("#yte-playlist-reverse-button-container")).not.toBeAttached();
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual(before);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual(reversed);
			});
			test(`should persist reversed order after full page reload on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistOrder(page);
				expect(before.length).toBeGreaterThan(1);
				const reversed = [...before].reverse();
				await button.click();
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual(reversed);
				await reloadPage(page, pageType);
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 15000 }).toEqual(reversed);
			});
		} else {
			test(`reverse button should be present when enabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect(page.locator("#yte-playlist-reverse-button")).toBeAttached({ timeout: 10000 });
			});
			test(`should reverse playlist order on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistPageOrder(page);
				expect(before.length).toBeGreaterThan(1);
				await button.click();
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 10000 }).toEqual([...before].reverse());
				await expect
					.poll(
						async () => {
							const storedState = await readStoredState(page);
							return (storedState.playlistReverseButton as undefined | { isReversed: boolean })?.isReversed;
						},
						{ timeout: 10000 }
					)
					.toBe(true);
			});
			test(`should maintain reversed order after disable then re-enable on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistPageOrder(page);
				expect(before.length).toBeGreaterThan(1);
				const reversed = [...before].reverse();
				await button.click();
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 10000 }).toEqual(reversed);
				await disableFeature(page, "playlistReverseButton.enabled");
				await expect(button).not.toBeAttached();
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 10000 }).toEqual(before);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 10000 }).toEqual(reversed);
			});
			test(`should persist reversed order after full page reload on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistPageOrder(page);
				expect(before.length).toBeGreaterThan(1);
				const reversed = [...before].reverse();
				await button.click();
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 10000 }).toEqual(reversed);
				await reloadPage(page, pageType);
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 15000 }).toEqual(reversed);
			});
		}
	}

	test(`reversed order survives an in-page navigation to another playlist video on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["playlistLength"]);
		await enableFeature(page, "playlistReverseButton.enabled");
		const button = page.locator("#yte-playlist-reverse-button");
		await expect(button).toBeAttached({ timeout: 10000 });
		const before = await getPlaylistOrder(page);
		expect(before.length).toBeGreaterThan(1);
		await button.click();
		await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual([...before].reverse());
		const videoIdBefore = new URL(page.url()).searchParams.get("v");
		await spaNavigateToOtherPlaylistVideo(page);
		expect(new URL(page.url()).searchParams.get("v")).not.toBe(videoIdBefore);
		// YouTube reloads the panel for the new video and the loaded window can shift, so the surviving reversal is
		// read from the playlist data (the first loaded item sits after the last one) instead of from the DOM order.
		await expect
			.poll(
				async () => {
					const state = await readWatchPlaylistState(page);
					if (!state) return null;
					const { firstIndex, lastIndex } = state;
					return firstIndex > lastIndex;
				},
				{ timeout: 20000 }
			)
			.toBe(true);
		await expect(button).toBeAttached({ timeout: 15000 });
		await expect.poll(async () => readIsReversedState(page), { timeout: 10000 }).toBe(true);
	});

	test(`reverse button is not injected on a ${watch} page without a playlist`, async ({ page }) => {
		await navigateToPageType(page, watch, ["timestamps"]);
		expect(new URL(page.url()).searchParams.get("list")).toBeNull();
		await enableFeature(page, "playlistReverseButton.enabled");
		const {
			playlistReverseButton: { enabled }
		} = await readStoredOptions(page);
		expect(enabled).toBe(true);
		// Setup waits up to 5 s for the playlist panel and then polls another 3 s for playlist data before giving up.
		await expectToStay(async () => page.locator("#yte-playlist-reverse-button").count(), 0, { durationMs: 10_000, page });
	});

	test(`clicking the reverse button twice restores the original order on ${playlist}`, async ({ page }) => {
		await navigateToPageType(page, playlist, playlistRequirements);
		await enableFeature(page, "playlistReverseButton.enabled");
		const button = page.locator("#yte-playlist-reverse-button");
		await expect(button).toBeAttached({ timeout: 10000 });
		const before = await getPlaylistPageOrder(page);
		expect(before.length).toBeGreaterThan(1);
		await button.click();
		await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 10000 }).toEqual([...before].reverse());
		await expect.poll(async () => readIsReversedState(page), { timeout: 10000 }).toBe(true);
		await button.click();
		await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 10000 }).toEqual(before);
		await expect.poll(async () => readIsReversedState(page), { timeout: 10000 }).toBe(false);
	});

	test(`reverse button is placed inside the playlist panel action row on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["playlistLength"]);
		await enableFeature(page, "playlistReverseButton.enabled");
		await expect(page.locator("#yte-playlist-reverse-button")).toBeAttached({ timeout: 10000 });
		await expect
			.poll(
				async () =>
					page.evaluate(() => {
						const button = document.getElementById("yte-playlist-reverse-button");
						if (!button) return null;
						const startActions = document.querySelector(
							"#page-manager > ytd-watch-flexy #playlist #start-actions, #page-manager > ytd-watch-grid #playlist #start-actions"
						);
						return { containerId: button.parentElement?.id ?? null, inStartActions: startActions?.contains(button) ?? false };
					}),
				{ timeout: 10000 }
			)
			.toEqual({ containerId: "yte-playlist-reverse-button-container", inStartActions: true });
	});

	test(`reverse button is placed inside the playlist header action row on ${playlist}`, async ({ page }) => {
		await navigateToPageType(page, playlist, playlistRequirements);
		await enableFeature(page, "playlistReverseButton.enabled");
		await expect(page.locator("#yte-playlist-reverse-button")).toBeAttached({ timeout: 10000 });
		await expect
			.poll(
				async () =>
					page.evaluate(() => {
						const button = document.getElementById("yte-playlist-reverse-button");
						if (!button) return null;
						const actionRow = button.closest(".ytFlexibleActionsViewModelActionRow, yt-flexible-actions-view-model");
						const header = button.closest("ytd-playlist-header-renderer, yt-page-header-renderer, yt-page-header-view-model");
						return {
							containerId: button.parentElement?.id ?? null,
							inHeader: header !== null,
							inVisibleActionRow: actionRow instanceof HTMLElement && actionRow.clientWidth > 0
						};
					}),
				{ timeout: 10000 }
			)
			.toEqual({ containerId: "yte-playlist-reverse-button-container", inHeader: true, inVisibleActionRow: true });
	});

	test(`tooltip label toggles between the normal and reversed strings on ${playlist}`, async ({ page }) => {
		await navigateToPageType(page, playlist, playlistRequirements);
		await enableFeature(page, "playlistReverseButton.enabled");
		const button = page.locator("#yte-playlist-reverse-button");
		await expect(button).toBeAttached({ timeout: 10000 });
		const tooltip = page.locator("#yte-feature-playlistReverseButton-tooltip");
		await expect(button).toHaveAttribute("data-title", "Normal order");
		await button.dispatchEvent("mouseenter");
		await expect(tooltip).toHaveText("Normal order");
		await button.click();
		await expect(button).toHaveAttribute("data-title", "Reversed order");
		// The click handler removes the open tooltip, so it has to be re-opened to read the swapped label.
		await button.dispatchEvent("mouseenter");
		await expect(tooltip).toHaveText("Reversed order");
		await button.click();
		await expect(button).toHaveAttribute("data-title", "Normal order");
		await button.dispatchEvent("mouseenter");
		await expect(tooltip).toHaveText("Normal order");
	});

	test(`a below player feature button is not adopted into the reverse button's container on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["playlistLength"]);
		await enableFeature(page, "playlistReverseButton.enabled");
		await expect(page.locator("#yte-playlist-reverse-button")).toBeAttached({ timeout: 10000 });
		await setOption(page, "loopButton.button.placement", below);
		await enableFeature(page, "loopButton.button.enabled");
		await expect(page.locator("#yte-feature-loopButton-button")).toBeAttached({ timeout: 10000 });
		await expect(page.locator("div#primary-inner > div#yte-button-container > #yte-feature-loopButton-button")).toBeAttached({ timeout: 10000 });
		expect(
			await page.evaluate(() => {
				const loopButton = document.getElementById("yte-feature-loopButton-button");
				const reverseButton = document.getElementById("yte-playlist-reverse-button");
				if (!loopButton || !reverseButton) return null;
				return {
					inPlaylistPanel: loopButton.closest("#playlist") !== null,
					sharesReverseContainer: loopButton.parentElement === reverseButton.parentElement
				};
			})
		).toEqual({ inPlaylistPanel: false, sharesReverseContainer: false });
	});

	test(`reversing keeps the playing video selected at the mirrored panel position on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["playlistLength"]);
		await enableFeature(page, "playlistReverseButton.enabled");
		const button = page.locator("#yte-playlist-reverse-button");
		await expect(button).toBeAttached({ timeout: 10000 });
		const before = await getPlaylistOrder(page);
		expect(before.length).toBeGreaterThan(1);
		await expect.poll(async () => getSelectedPanelPosition(page), { timeout: 15000 }).not.toBeNull();
		const selectedBefore = await getSelectedPanelPosition(page);
		const stateBefore = await readWatchPlaylistState(page);
		expect(selectedBefore).not.toBeNull();
		expect(stateBefore).not.toBeNull();
		await button.click();
		await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual([...before].reverse());
		await expect
			.poll(async () => getSelectedPanelPosition(page), { timeout: 15000 })
			.toEqual({
				index: selectedBefore!.total - 1 - selectedBefore!.index,
				total: selectedBefore!.total,
				videoId: selectedBefore!.videoId
			});
		// localCurrentIndex is what the panel and the next/previous buttons read, so it has to be mirrored too.
		await expect
			.poll(async () => (await readWatchPlaylistState(page))?.localCurrentIndex, { timeout: 10000 })
			.toBe(stateBefore!.length - 1 - stateBefore!.localCurrentIndex);
	});
});
