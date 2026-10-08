import type { PageType } from "@/src/features/_registry/types";
import type { Nullable } from "@/src/types";

import { refineLiveFlagFromPlayer } from "@/src/utils/dom/readiness";

import { isSupportedYouTubeHostname } from "./constants";

let cachedPageType: Nullable<PageType> = null;

export function extractSectionsFromYouTubeURL(url: string): string[] {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new Error("Invalid URL");
	}
	if (!isSupportedYouTubeHostname(parsed.hostname)) return [];
	return parsed.pathname.split("/").filter(Boolean);
}

/** Cached page type from URL classification; does not wait on the player. */
export function getCurrentPageType(): Nullable<PageType> {
	if (cachedPageType) return cachedPageType;
	cachedPageType = classifyPageTypeFromUrl();
	return cachedPageType;
}

export function getCurrentVideoId(): Nullable<string> {
	return new URLSearchParams(window.location.search).get("v");
}

export function getLayoutType(): "legacy" | "modern" {
	return isModernYouTubeVideoLayout() ? "modern" : "legacy";
}

export function invalidatePageTypeCache() {
	cachedPageType = null;
}

/** Channel home: `/@name` or `/@name/featured` (also `/c/name`). */
export function isChannelHomePage() {
	const [firstSection, secondSection] = extractSectionsFromYouTubeURL(window.location.href);
	return (
		(firstSection !== undefined && firstSection.startsWith("@") && secondSection === undefined) ||
		(firstSection !== undefined && firstSection.startsWith("@") && secondSection === "featured")
	);
}

/** Channel posts: `/@name/posts`. */
export function isChannelPostsPage() {
	const [firstSection, secondSection] = extractSectionsFromYouTubeURL(window.location.href);
	return firstSection !== undefined && firstSection.startsWith("@") && secondSection === "posts";
}

/** Channel streams: `/@name/streams`. */
export function isChannelStreamsPage() {
	const [firstSection, secondSection] = extractSectionsFromYouTubeURL(window.location.href);
	return firstSection !== undefined && firstSection.startsWith("@") && secondSection === "streams";
}

/** Channel videos: `/@name/videos`. */
export function isChannelVideosPage() {
	const [firstSection, secondSection] = extractSectionsFromYouTubeURL(window.location.href);
	return firstSection !== undefined && firstSection.startsWith("@") && secondSection === "videos";
}

/** Home: `/` with no path sections. */
export function isHomePage() {
	const [firstSection] = extractSectionsFromYouTubeURL(window.location.href);
	return firstSection === undefined;
}

/**
 * Live page. True for `/live/...` URLs and for a cached refine of a `/watch` URL
 * that the player confirmed is live (`refinePageTypeFromPlayer`).
 */
export function isLivePage() {
	if (cachedPageType) return cachedPageType === "live";
	const [firstSection] = extractSectionsFromYouTubeURL(window.location.href);
	return firstSection === "live";
}

export function isModernYouTubeVideoLayout(): boolean {
	return document.querySelector(".ytp-delhi-modern") !== null;
}

export function isNewYouTubeVideoLayout(): boolean {
	const newLayoutElement = document.querySelector("ytd-player.ytd-watch-grid");
	return newLayoutElement !== null;
}

export function isPlaylistPage() {
	const [firstSection] = extractSectionsFromYouTubeURL(window.location.href);
	return firstSection === "playlist";
}

/** Search results: `/results`. */
export function isSearchPage() {
	const [firstSection] = extractSectionsFromYouTubeURL(window.location.href);
	return firstSection === "results";
}

export function isShortsPage() {
	const [firstSection] = extractSectionsFromYouTubeURL(window.location.href);
	return firstSection === "shorts";
}

/** Subscriptions: `/feed/subscriptions`. */
export function isSubscriptionsPage() {
	const [firstSection, secondSection] = extractSectionsFromYouTubeURL(window.location.href);
	return firstSection === "feed" && secondSection === "subscriptions";
}

export function isWatchPage() {
	const [firstSection] = extractSectionsFromYouTubeURL(window.location.href);
	return firstSection === "watch";
}

/**
 * When the cached type is `"watch"`, ask the player whether this video is actually live.
 * Resolves `"live"` or `"watch"`. Leaves other page types unchanged.
 * The player poll lives in readiness (`refineLiveFlagFromPlayer`); this owns the cache write.
 */
export async function refinePageTypeFromPlayer(): Promise<Nullable<PageType>> {
	const current = getCurrentPageType();
	if (current !== "watch") return current;
	const urlVideoId = new URLSearchParams(window.location.search).get("v");
	const isLive = await refineLiveFlagFromPlayer({ urlVideoId });
	if (isLive) {
		cachedPageType = "live";
		return "live";
	}
	return "watch";
}

/**
 * Synchronous page classification from the URL alone.
 *
 * A `/watch` URL is classified as `"watch"` here even when the stream is live; live is refined
 * later from the player so registry init and first buttons are not blocked on player readiness.
 * Uses the `is*Page` helpers so path rules stay in one place.
 */
function classifyPageTypeFromUrl(): Nullable<PageType> {
	try {
		if (typeof window === "undefined" || typeof document === "undefined") return null;
		if (!isSupportedYouTubeHostname(window.location.hostname)) return null;
		if (isHomePage()) {
			return window.location.pathname === "/" ? "home" : null;
		}
		if (isSearchPage()) return "search";
		if (isPlaylistPage()) return "playlist";
		if (isShortsPage()) return "shorts";
		// Path-based /live only; refined live streams stay classified via the cache in isLivePage.
		const [first] = extractSectionsFromYouTubeURL(window.location.href);
		if (first === "live") return "live";
		if (isSubscriptionsPage()) return "subscriptions";
		if (isChannelHomePage()) return "channel_home";
		if (isChannelVideosPage()) return "channel_videos";
		if (isChannelPostsPage()) return "channel_posts";
		if (isChannelStreamsPage()) return "channel_streams";
		if (isWatchPage()) return "watch";
		return null;
	} catch {
		return null;
	}
}
