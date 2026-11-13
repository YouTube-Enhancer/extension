import type { Page } from "@playwright/test";

import type { PageType } from "@/src/features/_registry/types";

import {
	CHIP_BAR_VIEW_MODEL_HEADER_SELECTOR,
	PLAYLIST_ITEM_SELECTOR
} from "@/src/features/playlistManagementButtons/constants";
import { hasAmbientModeMenuItem } from "@/src/utils/_tests/ambient";
import { ensurePlayerControlsVisible } from "@/src/utils/_tests/pageSetup";
import { ensureCaptionsState, getCaptionsState } from "@/src/utils/_tests/player";
import { PLAYLIST_PAGE_HEADER_SELECTORS } from "@/src/utils/dom/selectors";
import { expect, test } from "@/tests/harness";

export const fixtureCapabilities = [
	"ambientMode",
	"autoPlay",
	"captions",
	// Top comments that carry timestamp links (a mix with its tracklist in the comments).
	"commentTimestamps",
	"dubbedAudio",
	"endScreenCards",
	"playlistManagementButtons",
	// A chip bar above legacy rows, the only host the remove-all button has: Watch Later, today.
	"playlistChipBar",
	"playlistLength",
	"timestamps",
	"videoHistory",
	"monoAudio"
] as const;

export type FixtureCapabilities = (typeof fixtureCapabilities)[number];

/**
 * What a fixture page must demonstrate for a spec's requirement to mean anything. Returns null when the page
 * demonstrates the capability, or the reason it does not. A tag whose page rotted becomes a named skip at
 * navigation instead of a confusing assertion deep inside a feature spec.
 */
type CapabilityCheck = (page: Page, pageType: PageType) => Promise<null | string>;

/** Live-hunt adapter: a stream only counts when it demonstrates every requirement; false moves the hunt on. */
export async function meetsFixtureCapabilities(
	page: Page,
	pageType: PageType,
	requirements: FixtureCapabilities[] = []
): Promise<boolean> {
	for (const capability of requirements) {
		if ((await runCheck(page, pageType, capability)) !== null) return false;
	}
	return true;
}

/** Static adapter: after navigation every requested capability must be demonstrated, or the test skips by name. */
export async function verifyFixtureCapabilities(
	page: Page,
	pageType: PageType,
	requirements: FixtureCapabilities[] = []
): Promise<void> {
	for (const capability of requirements) {
		const reason = await runCheck(page, pageType, capability);
		if (reason !== null) {
			test.skip(
				true,
				`the ${pageType} fixture at ${page.url()} does not offer "${capability}": ${reason}`
			);
		}
	}
}

const capabilityChecks: Record<FixtureCapabilities, CapabilityCheck> = {
	ambientMode: async (page, pageType) => {
		await ensurePlayerControlsVisible(page, pageType);
		return (await hasAmbientModeMenuItem(page))
			? null
			: "the settings menu has no ambient mode row";
	},
	autoPlay: async (page, pageType) => {
		await ensurePlayerControlsVisible(page, pageType);
		// Attached is the capability; a folded-away toggle (display: none) is the spec's own named skip.
		return (await page.locator(".ytp-autonav-toggle").count()) > 0
			? null
			: "the player has no autoplay toggle";
	},
	captions: async (page, pageType) => {
		await ensurePlayerControlsVisible(page, pageType);
		const state = await getCaptionsState(page);
		// No button means no captions surface at all. A button reporting "off" promises nothing about a
		// track: a live stream lists its auto-generated track only once captions are on, so the one proof
		// is turning them on. A page found with captions off is left that way, so that a feature under
		// test, and not this probe, is what turns them on.
		if (state === null) return "the player has no captions button";
		if (state) return null;
		if (!(await ensureCaptionsState(page, true))) return "the player offers no caption track";
		if (!(await ensureCaptionsState(page, false))) return "captions could not be restored to off";
		return null;
	},
	commentTimestamps: async (page) => {
		// YouTube loads comments when the section scrolls into view.
		await page
			.locator("#comments")
			.evaluate((comments) => comments.scrollIntoView({ block: "start" }))
			.catch(() => {});
		try {
			await expect
				.poll(() => page.locator("ytd-comment-thread-renderer").count(), { timeout: 15_000 })
				.toBeGreaterThan(0);
			await expect
				.poll(() => timestampLinkCount(page, true), { timeout: 10_000 })
				.toBeGreaterThan(0);
			return null;
		} catch {
			return "the top comments carry no timestamp links";
		}
	},
	dubbedAudio: async (page) =>
		await page.evaluate(async () => {
			const selector = document.location.pathname.startsWith("/shorts")
				? "#shorts-player"
				: "div#movie_player";
			const player = document.querySelector<
				HTMLDivElement & {
					getAudioTrack?: () => Promise<Record<string, unknown>> | Record<string, unknown>;
				}
			>(selector);
			if (!player?.getAudioTrack) return "the player exposes no audio track API";
			const parseTrack = (value: unknown): null | { isAutoDubbed: boolean } => {
				if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
				const track = value as Record<string, unknown>;
				if (
					typeof track.name === "string" &&
					typeof track.isDefault === "boolean" &&
					typeof track.isAutoDubbed === "boolean" &&
					typeof track.id === "string"
				) {
					return { isAutoDubbed: track.isAutoDubbed };
				}
				return null;
			};
			const raw: unknown = await player.getAudioTrack();
			if (!raw || typeof raw !== "object") return "the player reports no audio track";
			const track =
				parseTrack(raw) ??
				Object.values(raw)
					.map(parseTrack)
					.find((parsed) => parsed !== null) ??
				null;
			if (!track) return "the audio track descriptor is not one the feature parses";
			// The fixture is a dubbed video: its current track being auto-dubbed is what makes a
			// switch-to-original test meaningful rather than a no-op.
			return track.isAutoDubbed ? null : "the current audio track is not auto-dubbed";
		}),
	endScreenCards: async (page) => {
		const failure = await playerPlaysVideo(page);
		if (failure !== null) return failure;
		const duration = await playerDuration(page);
		// YouTube only renders end screens on videos of at least 25 seconds. The cards themselves render near
		// the end, which the feature spec waits for, so the duration floor is the cheap honest check here.
		return duration >= 25
			? null
			: `the video is ${duration}s, under YouTube's 25s end screen minimum`;
	},
	monoAudio: (page) => playerPlaysVideo(page),
	playlistChipBar: async (page) => {
		// YouTube's chip bar header; regular playlists no longer render it and Watch Later still does.
		try {
			await expect
				.poll(() => page.locator(CHIP_BAR_VIEW_MODEL_HEADER_SELECTOR).count(), { timeout: 10_000 })
				.toBeGreaterThan(0);
			return null;
		} catch {
			return "the playlist header has no chip bar";
		}
	},
	playlistLength: async (page) => {
		const onPlaylist = new URL(page.url()).pathname === "/playlist";
		try {
			if (onPlaylist) {
				// The product lands its UI in the first playlist header with a width and counts the rendered
				// rows, so both are the capability (getHeaderSelectors + getPlaylistItemsFromPlaylistPage).
				await expect
					.poll(
						() =>
							page.evaluate(
								(headers) => {
									const headerHost = Array.from(
										document.querySelectorAll<HTMLElement>(headers.join(","))
									).some((element) => element.clientWidth > 0);
									const list = document.querySelector(
										"ytd-playlist-video-list-renderer div#contents, yt-item-section-renderer div#contents"
									);
									return headerHost && !!list && list.children.length > 0;
								},
								[...PLAYLIST_PAGE_HEADER_SELECTORS]
							),
						{ timeout: 10_000 }
					)
					.toBe(true);
				return null;
			}
			// The watch layout renders the playlist context the feature's count lands in (both layouts).
			await expect
				.poll(
					() =>
						page
							.locator(
								"#page-manager > ytd-watch-flexy #playlist #header-contents, #page-manager > ytd-watch-grid #playlist #header-contents"
							)
							.count(),
					{ timeout: 10_000 }
				)
				.toBeGreaterThan(0);
			return null;
		} catch {
			return onPlaylist
				? "the playlist header shows no video count"
				: "the watch page shows no playlist header";
		}
	},
	playlistManagementButtons: async (page) => {
		// The rows the feature adds buttons to: its own item selector narrowed to rows with a duration overlay.
		try {
			await expect
				.poll(
					() =>
						page
							.locator(`${PLAYLIST_ITEM_SELECTOR}:has(ytd-thumbnail-overlay-time-status-renderer)`)
							.count(),
					{ timeout: 10_000 }
				)
				.toBeGreaterThan(0);
			return null;
		} catch {
			return "the playlist has no items with a duration overlay";
		}
	},
	timestamps: async (page) => {
		await expandDescription(page);
		try {
			await expect
				.poll(() => timestampLinkCount(page, false), { timeout: 10_000 })
				.toBeGreaterThan(0);
			return null;
		} catch {
			return "the description has no timestamp links";
		}
	},
	videoHistory: (page) => playerPlaysVideo(page)
};

const checkCache = new WeakMap<Page, Map<string, null | string>>();

async function expandDescription(page: Page): Promise<void> {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			await page.evaluate(() => {
				const moreButton = document.querySelector<HTMLElement>(
					"ytd-video-description-expander #expand, ytd-video-secondary-info-renderer #more, tp-yt-paper-button#more, .ytd-video-secondary-info-renderer #more"
				);
				if (moreButton) moreButton.click();
			});
			break;
		} catch {
			// The context may be mid-navigation; the next attempt follows the settle the caller made.
		}
	}
}

async function playerDuration(page: Page): Promise<number> {
	return await page.evaluate(() => {
		const selector = document.location.pathname.startsWith("/shorts")
			? "#shorts-player"
			: "#movie_player";
		const player = document.querySelector<HTMLDivElement & { getDuration?: () => number }>(
			selector
		);
		return player?.getDuration?.() ?? 0;
	});
}

/*
 * videoHistory and monoAudio select a video rather than a page surface, and neither has a cheap honest proof
 * (history recording deep in the feature's own prompt test; a mono source, per monoToStereoButton's spec, is
 * not required at all). The strongest cheap check is that the fixture video still plays, which is the rot
 * class that would otherwise surface as a timeout fifteen seconds in.
 */
async function playerPlaysVideo(page: Page): Promise<null | string> {
	return await page.evaluate(() => {
		const selector = document.location.pathname.startsWith("/shorts")
			? "#shorts-player"
			: "#movie_player";
		const player = document.querySelector<HTMLDivElement & { getDuration?: () => number }>(
			selector
		);
		if (!player) return "no player element";
		if (player.querySelector(".ytp-error")) return "the player is showing an error";
		return (player.getDuration?.() ?? 0) > 0 ? null : "the player reports no duration";
	});
}

async function runCheck(
	page: Page,
	pageType: PageType,
	capability: FixtureCapabilities
): Promise<null | string> {
	// Cached per page object for the test's lifetime: fixtures do not rot mid-test, and a test that mutates a
	// playlist and renavigates should not have its own doing re-probed.
	const key = `${page.url()}\n${capability}`;
	let forPage = checkCache.get(page);
	if (!forPage) {
		forPage = new Map();
		checkCache.set(page, forPage);
	}
	const cached = forPage.get(key);
	if (cached !== undefined) return cached;
	const reason = await capabilityChecks[capability](page, pageType);
	forPage.set(key, reason);
	return reason;
}

function timestampLinkCount(page: Page, inComment: boolean): Promise<number> {
	return page.evaluate((inCommentScope) => {
		const videoId = new URL(document.location.href).searchParams.get("v");
		if (!videoId) return 0;
		const scope = inCommentScope ? "ytd-comment-thread-renderer" : "#description-inline-expander";
		return document.querySelectorAll(
			`${scope} yt-attributed-string a[href^="/watch?v=${videoId}"][href*="&t="]`
		).length;
	}, inComment);
}
