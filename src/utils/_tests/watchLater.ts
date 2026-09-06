import { expect, type Page } from "@playwright/test";

import type { YouTubePlayerDiv } from "@/src/types";
import type { YtButtonViewModelElement } from "@/src/utils/dom/nativeComponents";

import { enableFeature } from "@/src/utils/_tests/features";
import { navigateToPage, waitForExtensionReady } from "@/src/utils/_tests/navigation";

/** The class the saveToWatchLaterButton feature puts on every button it renders (buttons.ts). */
export const WATCH_LATER_BUTTON_CLASS = "yte-save-to-watch-later-button";
export const WATCH_LATER_BUTTON_SELECTOR = `.${WATCH_LATER_BUTTON_CLASS}`;
/** The native toggle the feature adds to the actions row of a watch page, the one surface that reads membership. */
export const WATCH_LATER_ACTIONS_ROW_BUTTON_SELECTOR = `ytd-watch-metadata ytd-menu-renderer ${WATCH_LATER_BUTTON_SELECTOR}`;
// The saved/unsaved state is carried by the icon the feature puts on the native button.
export const WATCH_LATER_SAVED_ICON = "CHECK_CIRCLE_THICK";
export const WATCH_LATER_UNSAVED_ICON = "WATCH_LATER";

/**
 * Makes sure the video is in the signed-in account's Watch Later, through the extension's own actions-row toggle
 * on the video's watch page, and leaves the page there. A membership read can trail an edit, so the icon is
 * settled before and after the click.
 */
export async function ensureInWatchLater(page: Page, videoId: string): Promise<void> {
	await navigateToPage(page, `https://www.youtube.com/watch?v=${videoId}`);
	await waitForExtensionReady(page);
	await enableFeature(page, "saveToWatchLaterButton.enabled");
	await expect(page.locator(WATCH_LATER_ACTIONS_ROW_BUTTON_SELECTOR)).toBeAttached({ timeout: 20000 });
	if ((await settleActionsRowIcon(page)) === WATCH_LATER_SAVED_ICON) return;
	const saveRequest = page.waitForResponse((response) => response.url().includes("/youtubei/v1/browse/edit_playlist"), { timeout: 20000 });
	await page.locator(`${WATCH_LATER_ACTIONS_ROW_BUTTON_SELECTOR} button`).first().click();
	expect((await saveRequest).ok()).toBe(true);
	expect(await settleActionsRowIcon(page)).toBe(WATCH_LATER_SAVED_ICON);
}

/** Reads the icon name of the feature's actions-row toggle, which is how the button carries its saved state. */
export async function readActionsRowIcon(page: Page): Promise<null | string> {
	return page.evaluate((selector) => {
		const host = document.querySelector<YtButtonViewModelElement>(selector);
		// The component exposes its data through a getter; the feature's function also carries the properties.
		const data: unknown = host?.rawProps?.data;
		const resolved = (typeof data === "function" ? (data as () => unknown)() : data) as null | Record<string, unknown> | undefined;
		const iconName: unknown = resolved?.iconName;
		return typeof iconName === "string" ? iconName : null;
	}, WATCH_LATER_ACTIONS_ROW_BUTTON_SELECTOR);
}

/** Waits for the actions-row icon to hold still for ten samples, since the membership read can flip it late. */
export async function settleActionsRowIcon(page: Page): Promise<string> {
	let lastIcon: null | string = null;
	let stableSamples = 0;
	await expect
		.poll(
			async () => {
				const icon = await readActionsRowIcon(page);
				stableSamples = icon !== null && icon === lastIcon ? stableSamples + 1 : 0;
				lastIcon = icon;
				return stableSamples;
			},
			{ intervals: [500], timeout: 30000 }
		)
		.toBeGreaterThanOrEqual(10);
	expect(lastIcon).not.toBeNull();
	return lastIcon!;
}

/**
 * Plays the watch page's video to its end, muted and at `rate`, so YouTube records it as fully watched. The
 * rate and mute are re-applied on every sample: a pre-roll ad or the player's own reset can undo them, and the
 * end is only counted once the player holds the page's video with no ad showing.
 */
export async function watchToTheEnd(
	page: Page,
	videoId: string,
	{ rate = 4, timeout = 90_000 }: { rate?: number; timeout?: number } = {}
): Promise<void> {
	await expect
		.poll(
			async () =>
				page.evaluate(
					async ({ rate, videoId }) => {
						const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
						const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
						if (!player || !video) return "no player";
						const data = await player.getVideoData();
						if (data.video_id !== videoId || player.classList.contains("ad-showing")) return "not the video yet";
						video.muted = true;
						if (video.playbackRate !== rate) video.playbackRate = rate;
						if (video.paused && !video.ended) await video.play().catch(() => {});
						return video.ended || (video.duration > 0 && video.currentTime >= video.duration - 0.25) ?
								"ended"
							:	`at ${Math.round(video.currentTime)}s`;
					},
					{ rate, videoId }
				),
			{ intervals: [1000], timeout }
		)
		.toBe("ended");
	// The player reports the final position on its own schedule; give it a moment before the page is left.
	await page.waitForTimeout(2000);
}
