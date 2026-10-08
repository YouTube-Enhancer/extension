import type { PageType } from "@/src/features/_registry/types";
import type { Nullable } from "@/src/types";

import { getCurrentPageType } from "./index";

export type NavigationSignature = `${string}${"" | `:${string}`}`;

/**
 * URL params that change without a feature-relevant navigation. Watch position, share
 * tracking, and similar query noise used to produce a new signature on every replaceState,
 * which re-ran the full navigation pipeline for the same video.
 */
export const VOLATILE_URL_PARAMS = [
	"v",
	"t",
	"start",
	"si",
	"pp",
	"feature",
	"ab_channel"
] as const;

/**
 * Build the navigation signature from the current URL's page type.
 * Returns null when the page type does not classify.
 */
export function getNavigationSignature(): Nullable<NavigationSignature> {
	const pageType = getCurrentPageType();
	if (!pageType) return null;

	const {
		location: { pathname, search }
	} = window;
	const pathParts = pathname.split("/").filter(Boolean);

	/**
	 * Extra-identifier suffix from what is not already in the signature. For path-parts,
	 * `exclude` is the number of leading elements to drop; for URLSearchParams, it is
	 * the list of keys to drop.
	 */
	const processExclusions = <T>(source: T, exclude: number | string[]): string => {
		if (Array.isArray(source)) {
			const count = exclude as number;
			const filtered = source.slice(count).filter(Boolean);
			return filtered.length > 0 ? `:${filtered.join(",")}` : "";
		}
		if (source instanceof URLSearchParams) {
			const keysToExclude = exclude as string[];
			const additionalParams = Array.from(source.entries())
				.filter(([k]) => !keysToExclude.includes(k))
				.map(([k, v]) => `${k}=${v}`);
			return additionalParams.length > 0 ? `:${additionalParams.join(",")}` : "";
		}
		return "";
	};

	switch (pageType) {
		case "channel_home": {
			if (pathParts[0]?.startsWith("@")) {
				const [channelId] = pathParts;
				const paramsString = processExclusions(pathParts, 1);
				return `channel_home:${channelId}${paramsString}`;
			} else if (pathParts[0] === "c" && pathParts[1]) {
				const [, channelId] = pathParts;
				const paramsString = processExclusions(pathParts, 2);
				return `channel_home:${channelId}${paramsString}`;
			}
			return "channel_home:unknown";
		}
		case "channel_posts": {
			if (pathParts[0]?.startsWith("@") && pathParts[1] === "posts") {
				const [channelId] = pathParts;
				const paramsString = processExclusions(pathParts, 2);
				return `channel_posts:${channelId}${paramsString}`;
			} else if (pathParts[0] === "c" && pathParts[1] && pathParts[2] === "posts") {
				const [, channelId] = pathParts;
				const paramsString = processExclusions(pathParts, 3);
				return `channel_posts:${channelId}${paramsString}`;
			}
			return "channel_posts:unknown";
		}
		case "channel_streams": {
			if (pathParts[0]?.startsWith("@") && pathParts[1] === "streams") {
				const [channelId] = pathParts;
				const paramsString = processExclusions(pathParts, 2);
				return `channel_streams:${channelId}${paramsString}`;
			} else if (pathParts[0] === "c" && pathParts[1] && pathParts[2] === "streams") {
				const [, channelId] = pathParts;
				const paramsString = processExclusions(pathParts, 3);
				return `channel_streams:${channelId}${paramsString}`;
			}
			return "channel_streams:unknown";
		}
		case "channel_videos": {
			if (pathParts[0]?.startsWith("@") && pathParts[1] === "videos") {
				const [channelId] = pathParts;
				const paramsString = processExclusions(pathParts, 2);
				return `channel_videos:${channelId}${paramsString}`;
			} else if (pathParts[0] === "c" && pathParts[1] && pathParts[2] === "videos") {
				const [, channelId] = pathParts;
				const paramsString = processExclusions(pathParts, 3);
				return `channel_videos:${channelId}${paramsString}`;
			}
			return "channel_videos:unknown";
		}
		case "home": {
			return "home";
		}
		case "live": {
			const urlParams = new URLSearchParams(search);
			const videoId = urlParams.get("v");
			const paramsString = processExclusions(urlParams, [...VOLATILE_URL_PARAMS]);
			return videoId ? `live:${videoId}${paramsString}` : "live:unknown";
		}
		case "playlist": {
			const urlParams = new URLSearchParams(search);
			const playlistId = urlParams.get("list");
			const paramsString = processExclusions(urlParams, ["list"]);
			return playlistId ? `playlist:${playlistId}${paramsString}` : "playlist:unknown";
		}
		case "search": {
			const urlParams = new URLSearchParams(search);
			const searchQuery = urlParams.get("search_query");
			if (searchQuery) {
				const truncatedQuery =
					searchQuery.length > 50 ? searchQuery.substring(0, 50) + "..." : searchQuery;
				return `search:${truncatedQuery}`;
			}
			return "search:unknown";
		}
		case "shorts": {
			const [, , shortId] = pathname.split("/");
			return shortId ? `shorts:${shortId}` : "shorts:unknown";
		}
		case "subscriptions": {
			return "subscriptions";
		}
		case "watch": {
			const urlParams = new URLSearchParams(search);
			const videoId = urlParams.get("v");
			const paramsString = processExclusions(urlParams, [...VOLATILE_URL_PARAMS]);
			return videoId ? `watch:${videoId}${paramsString}` : "watch:unknown";
		}
		default:
			return pageType satisfies PageType;
	}
}
