import type { PageType } from "@/src/features/_registry/types";
import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { waitForElement } from "@/src/utils/dom/wait";

import { isSupportedYouTubeHostname } from "./constants";

let cachedPageType: Nullable<PageType> = null;

/**
 * Synchronous page classification from the URL alone.
 *
 * A `/watch` URL is classified as `"watch"` here even when the stream is live; live is refined
 * later from the player so registry init and first buttons are not blocked on player readiness.
 */
export function classifyPageTypeFromUrl(href: string = window.location.href): Nullable<PageType> {
	try {
		if (typeof window === "undefined" || typeof document === "undefined") return null;
		if (!isSupportedYouTubeHostname(window.location.hostname)) return null;
		const [first, second] = extractSectionsFromYouTubeURL(href);
		if (first === undefined) {
			return window.location.pathname === "/" ? "home" : null;
		}
		if (first === "results") return "search";
		if (first === "playlist") return "playlist";
		if (first === "shorts") return "shorts";
		if (first === "live") return "live";
		if (first === "feed" && second === "subscriptions") return "subscriptions";
		if (first?.startsWith("@")) {
			if (second === undefined || second === "featured") return "channel_home";
			if (second === "videos") return "channel_videos";
			// The registry and the features that gate on them know these two pages; without this they were never detected.
			if (second === "posts") return "channel_posts";
			if (second === "streams") return "channel_streams";
		}
		if (first === "watch") return "watch";
		return null;
	} catch {
		return null;
	}
}

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

export function isChannelHomePage() {
	const [firstSection, secondSection] = extractSectionsFromYouTubeURL(window.location.href);
	return (
		(firstSection !== undefined && firstSection.startsWith("@") && secondSection === undefined) ||
		(firstSection !== undefined && firstSection.startsWith("@") && secondSection === "featured")
	);
}

export function isChannelVideosPage() {
	const [firstSection, secondSection] = extractSectionsFromYouTubeURL(window.location.href);
	return firstSection !== undefined && firstSection.startsWith("@") && secondSection === "videos";
}

export function isHomePage() {
	const [firstSection] = extractSectionsFromYouTubeURL(window.location.href);
	return firstSection === undefined;
}

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

export function isShortsPage() {
	const [firstSection] = extractSectionsFromYouTubeURL(window.location.href);
	return firstSection === "shorts";
}

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
 */
export async function refinePageTypeFromPlayer(): Promise<Nullable<PageType>> {
	const current = getCurrentPageType();
	if (current !== "watch") return current;
	try {
		const player = await waitForElement<YouTubePlayerDiv>("div#movie_player");
		if (!player || typeof player.getVideoData !== "function") return "watch";
		/**
		 * After a single-page navigation the player can still report the previous video, so wait
		 * until its video id matches the URL before trusting the live flag. Budget is shorter than
		 * the old cold-load poll: classification no longer blocks on this refine.
		 */
		const urlVideoId = new URLSearchParams(window.location.search).get("v");
		let playerData = await player.getVideoData();
		for (
			let attempt = 0;
			attempt < 12 && urlVideoId && playerData?.video_id !== urlVideoId;
			attempt++
		) {
			await new Promise((resolve) => setTimeout(resolve, 200));
			playerData = await player.getVideoData();
		}
		if (playerData?.isLive && (!urlVideoId || playerData.video_id === urlVideoId)) {
			cachedPageType = "live";
			return "live";
		}
		return "watch";
	} catch {
		return "watch";
	}
}

export function setPageType(pageType: PageType): void {
	cachedPageType = pageType;
}
