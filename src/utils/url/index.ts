import type { PageType } from "@/src/features/_registry/types";
import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { waitForElement } from "@/src/utils/dom/wait";

export function extractSectionsFromYouTubeURL(url: string): string[] {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new Error("Invalid URL");
	}
	const hostname = parsed.hostname.toLowerCase();
	const allowedHostnames = new Set(["m.youtube.com", "www.youtube.com", "youtube.com"]);
	if (!allowedHostnames.has(hostname)) return [];
	return parsed.pathname.split("/").filter(Boolean);
}

export async function getCurrentPageType(): Promise<Nullable<PageType>> {
	try {
		if (typeof window === "undefined" || typeof document === "undefined") {
			return null;
		}
		const [first, second] = extractSectionsFromYouTubeURL(window.location.href);
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
		}
		if (first === "watch") {
			const player = await waitForElement<YouTubePlayerDiv>("div#movie_player");
			if (player) {
				const playerData = await player.getVideoData();
				if (playerData?.isLive) return "live";
			}
			return "watch";
		}
		return null;
	} catch {
		return null;
	}
}

export function getLayoutType(): "legacy" | "modern" {
	return isModernYouTubeVideoLayout() ? "modern" : "legacy";
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
