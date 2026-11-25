import type { Locator, Page } from "@playwright/test";

import type { PageType } from "@/src/features/_registry/types";

import {
	CHIP_BAR_VIEW_MODEL_HEADER_SELECTOR,
	PLAYLIST_ITEM_SELECTOR
} from "@/src/features/playlistManagementButtons/constants";
import { hasAmbientModeMenuItem, readSettledShortsAmbientState } from "@/src/utils/_tests/ambient";
import { reloadPage } from "@/src/utils/_tests/navigation";
import { ensurePlayerControlsVisible } from "@/src/utils/_tests/pageSetup";
import { ensureCaptionsState, getCaptionsState } from "@/src/utils/_tests/player";
import { PLAYLIST_PAGE_HEADER_SELECTORS } from "@/src/utils/dom/selectors";
import { expect, test } from "@/tests/harness";

export const fixtureCapabilities = [
	"ambientMode",
	"autoPlay",
	"captions",
	// Top comments that carry timestamp links.
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
		if (pageType === "shorts") {
			// Shorts has no ytp settings panel; the row lives in the reel's "more" sheet. false/true
			// means the row exists (the test body establishes ON itself), so only "no row" denies the
			// offer — and the settled read reports that by starving its not-to-null poll: expect.poll
			// raises that starvation instead of resolving null, so it is read as the reason here. The
			// sheet's own container wait fails under a different matcher and still surfaces as a
			// failure, the way ambient.ts means it to.
			let state: boolean | null = null;
			try {
				state = await readSettledShortsAmbientState(page);
			} catch (error) {
				if (!(error instanceof Error) || !error.message.includes("not.toBeNull()")) throw error;
			}
			return state === null ? "the reel's sheet has no ambient mode row" : null;
		}
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
	commentTimestamps: async (page, pageType) => {
		// YouTube loads comments when the section scrolls into view, and a section the page scrolled
		// away from again never loads: the scroll rides every poll attempt instead of being a one-shot
		// before it (a swallowed single scroll used to fail this check on a page that renders the
		// comments fine). The section also has to exist before it can be scrolled — a locator that has
		// not attached yet makes scrollIntoView a silent no-op, which is what let "never loaded" become
		// self-fulfilling on a page whose section renders late — so an attempt waits for #comments to
		// attach, scrolls, and only lets a zero thread count say "never loaded" once the scroll is
		// verified to have taken. A zero count is also unreadable while the section still ranks
		// by "Top comments": a video's Top payload can carry its count and no thread at all
		// (yk4I80XVuk4), so an attempt switches the sort to Newest before the count is polled
		// (probe: threads land within about four seconds of the switch) and reports the
		// switch's own failure — no sort control, no Newest option — as itself rather than as
		// a load failure. One document that fills nothing is a loading problem, not a fixture
		// gap: the attempt is retried on a reloaded document before the load is called
		// impossible.
		const firstAttempt = await loadCommentThreads(page);
		if (firstAttempt !== null) {
			await reloadPage(page, pageType);
			const secondAttempt = await loadCommentThreads(page);
			// The retry's answer is the one that describes the document now on screen.
			if (secondAttempt !== null) return secondAttempt;
		}
		// Splitting the two reasons is what makes the skip honest: "comments never loaded" is a
		// loading problem this check retried, "no timestamp links" is the fixture saying it has
		// none. A shared catch reported the second for the first.
		try {
			await expect
				.poll(() => timestampLinkCount(page, true), { timeout: 20_000 })
				.toBeGreaterThan(0);
			return null;
		} catch {
			return "the top comments carry no timestamp links";
		}
	},
	// What the test gates on is the offer, not the selection: the spec repairs a non-dubbed start
	// itself (requireAutoDubbedStart), so demanding the *current* track be auto-dubbed at this
	// instant skipped eleven tests the fixture could run (probe 2026-11-19: 19 of 20 offered tracks
	// auto-dubbed on watch and shorts while the current track read original in 4/4 reads). The offer
	// also lands a moment after the player reports ready, so it is polled like every sibling check.
	dubbedAudio: async (page) => {
		const readOffer = () =>
			page.evaluate(async () => {
				const selector = document.location.pathname.startsWith("/shorts")
					? "#shorts-player"
					: "div#movie_player";
				const player = document.querySelector<
					HTMLDivElement & {
						getAvailableAudioTracks?: () =>
							| Promise<Record<string, unknown>[]>
							| Record<string, unknown>[];
					}
				>(selector);
				if (!player?.getAvailableAudioTracks) return "no-api" as const;
				const describesAutoDubbed = (value: unknown): boolean => {
					if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
					const track = value as Record<string, unknown>;
					return typeof track.id === "string" && track.isAutoDubbed === true;
				};
				const tracks: unknown = await player.getAvailableAudioTracks();
				if (!Array.isArray(tracks)) return "no-api" as const;
				// The flag nests one level down in some player builds, so the descriptor is matched at
				// the top level or one Object.values hop down - the same shape selectAutoDubbedTrack
				// in defaultToOriginalAudioTrack.spec.ts unwraps.
				const offersAutoDubbed = tracks.some(
					(raw) =>
						describesAutoDubbed(raw) ||
						Object.values((raw ?? {}) as Record<string, unknown>).some(describesAutoDubbed)
				);
				return offersAutoDubbed ? ("offers" as const) : ("none" as const);
			});
		if ((await readOffer()) === "no-api") return "the player exposes no audio track API";
		try {
			await expect
				// Siblings poll 10-30 s; this offer is present at the first sample on a healthy load,
				// so 15 s is insurance against the post-ready timing only.
				.poll(() => readOffer(), { intervals: [1000], timeout: 15_000 })
				.toBe("offers");
			return null;
		} catch {
			// Re-read rather than remember: the last poll sample is what the skip has to speak for.
			return (await readOffer()) === "no-api"
				? "the player exposes no audio track API"
				: "the video offers no auto-dubbed track";
		}
	},
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
				.poll(() => page.locator(CHIP_BAR_VIEW_MODEL_HEADER_SELECTOR).count(), { timeout: 30_000 })
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
					// The spec's own remove-button polls wait 30s for these rows after the same
					// navigation; a shorter capability window turns their tolerated latency into a skip.
					{ timeout: 30_000 }
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

/**
 * One comment-load attempt. The section has to attach before a scroll can find it, the sort has
 * to be Newest before a zero thread count means anything (the default "Top comments" ranking can
 * carry a video's count and no thread at all), the scroll has to land before a zero thread count
 * means anything, and the scroll rides every poll attempt rather than happening once. Returns
 * null once a thread renders, or the honest reason this attempt produced none: a section that
 * never rendered, a section that never offered a sort control, a menu that never offered Newest,
 * a section the scroll never reached, or a section that was reached, switched, and stayed empty.
 */
async function loadCommentThreads(page: Page): Promise<null | string> {
	const comments = page.locator("#comments");
	// Bounded rather than skipped: a section that has not rendered yet makes scrollIntoView a
	// silent no-op, so waiting for the attach is what stops the old self-fulfilling "never loaded".
	try {
		await comments.waitFor({ state: "attached", timeout: 10_000 });
	} catch {
		return "the comments section never rendered";
	}
	// The default "Top comments" ranking can carry a video's count and no thread at all
	// (yk4I80XVuk4: the Top payload held the count, zero commentThreadRenderers), so the sort is
	// switched to Newest before the count means anything — the probe's threads landed within
	// about four seconds of the switch. A section that refuses the switch says that instead of
	// letting the zero masquerade as a load failure.
	const sortFailure = await switchCommentSortToNewest(comments);
	let scrolledIntoView = false;
	try {
		await expect
			.poll(
				async () => {
					scrolledIntoView = (await scrollCommentsIntoView(comments)) || scrolledIntoView;
					return page.locator("ytd-comment-thread-renderer").count();
				},
				{ timeout: 30_000 }
			)
			.toBeGreaterThan(0);
		return null;
	} catch {
		// The scroll is reported, not assumed: a swallowed scroll is what used to turn a page that
		// renders comments fine into "never loaded".
		if (!scrolledIntoView) return "the comments section never scrolled into view";
		// Only a zero that survived the switch may be called a load failure, and it says so; a
		// switch the section never offered reports that instead.
		if (sortFailure !== null) return sortFailure;
		return "the video's comments never loaded even after switching the sort to Newest";
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

/**
 * Scrolls the comments section into view and reports whether the scroll took: the section ended up
 * inside the viewport, or the page actually moved. A scroll that silently did nothing — element
 * gone, zero-sized, or an evaluate on a destroyed context — reports false instead of pretending.
 *
 * scrollIntoView rather than a wheel step: it targets the section itself, so it cannot land in the
 * wrong scroll container (the pointer could be over the side panel or a miniplayer) or stop short
 * of a section thousands of pixels down, and it is the same move the passing timestampPeek spec
 * already proves YouTube's lazy comment load answers.
 */
async function scrollCommentsIntoView(comments: Locator): Promise<boolean> {
	return await comments
		.evaluate((element) => {
			const { scrollY: before } = window;
			element.scrollIntoView({ block: "start" });
			const rect = element.getBoundingClientRect();
			const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
			return inViewport || window.scrollY !== before;
		})
		.catch(() => false);
}

/**
 * Switches the comment section off the default "Top comments" sort and onto Newest — the only
 * sort the probe saw carry threads for a video whose Top payload had the count alone. Returns
 * null once Newest is chosen, or the distinct reason it was not: a sort control the section
 * never showed (the header renders with the section, so a short bound is enough), or a menu that
 * never offered Newest. Both bounds stay short because the switch itself is fast — the probe's
 * threads landed within about four seconds of the click — and this runs twice inside a 120 s test.
 */
async function switchCommentSortToNewest(comments: Locator): Promise<null | string> {
	const page = comments.page();
	const sortControl = comments.getByText(/^Sort by$/).first();
	// The header rides the section into view, so the scroll rides this wait the way it rides the
	// thread poll: the control cannot appear before the page has been shown the section.
	try {
		await expect
			.poll(
				async () => {
					await scrollCommentsIntoView(comments);
					return sortControl.isVisible();
				},
				{ timeout: 5_000 }
			)
			.toBe(true);
		// scrollCommentsIntoView parks #comments at block:"start", i.e. the very top of the
		// viewport, where YouTube's sticky masthead sits on top of the sort control: a force click
		// there is delivered to the masthead and no menu ever opens (measured: elementFromPoint at
		// the label's centre was DIV#container.ytd-masthead and the sort listbox stayed 0 px wide
		// for a full 2 s after the click). The probe's click landed because its nudge left the
		// header mid-screen, so centre the control the same way before clicking it.
		await sortControl.evaluate((element) => element.scrollIntoView({ block: "center" }));
		await sortControl.click({ force: true, timeout: 3_000 });
	} catch {
		return "the comments section never offered a sort control";
	}
	// The probe's exact pick (tri-comments-probe8): the open menu's items matched page-wide —
	// not scoped to #comments, and with no `role="option"` requirement or visibility filter of
	// its own — filtered on an unanchored /newest/i, taking the FIRST of the two shadow matches,
	// force-clicked with the probe's own 8 s bound. The visible wait is the probe's settle before
	// it read the menu, bounded so a menu that never opened fails fast instead of hanging.
	const items = page.locator(
		"tp-yt-paper-listbox tp-yt-paper-item, ytd-menu-popup-renderer tp-yt-paper-item, #contents tp-yt-paper-item"
	);
	const newestOption = items.filter({ hasText: /newest/i }).first();
	try {
		await page.waitForTimeout(1_500);
		await newestOption.waitFor({ state: "visible", timeout: 4_000 });
		await newestOption.click({ force: true, timeout: 8_000 });
	} catch {
		return "the comments sort menu never offered a Newest option";
	}
	return null;
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
