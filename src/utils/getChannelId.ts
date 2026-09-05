import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { isShortsPage, isWatchPage } from "@/src/utils/url";

const channelIdRegex = /^UC[\w-]{22}$/;

export async function getCurrentChannelId(): Promise<Nullable<string>> {
	const playerContainer =
		isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
		: null;
	/**
	 * Prefer the live player state: it reflects the currently loaded video and updates on SPA navigation, unlike
	 * ytInitialPlayerResponse, which is only set for the first video loaded on the page.
	 */
	if (playerContainer) {
		try {
			/**
			 * The player's full response updates with every loaded video, so its videoDetails.channelId stays in step
			 * with the video being played, unlike DOM links during an SPA navigation.
			 */
			const playerResponse = playerContainer.getPlayerResponse?.() as undefined | { videoDetails?: { channelId?: string } };
			const responseChannelId = playerResponse?.videoDetails?.channelId;
			if (responseChannelId) return responseChannelId;
		} catch {
			// fall through to DOM-based fallbacks
		}
		try {
			const { channel_id: liveChannelId } = (await playerContainer.getVideoData()) as { channel_id?: string };
			if (liveChannelId) return liveChannelId;
		} catch {
			// fall through to DOM-based fallbacks
		}
	}
	const ownerLink = document.querySelector<HTMLAnchorElement>("a[href*='/channel/']");
	const hrefChannelId = ownerLink?.href.match(/\/channel\/([\w-]+)/)?.[1];
	if (hrefChannelId) return hrefChannelId;
	const playerResponseChannelId = (window as { ytInitialPlayerResponse?: { videoDetails?: { channelId?: string } } }).ytInitialPlayerResponse
		?.videoDetails?.channelId;
	return playerResponseChannelId ?? null;
}

/**
 * Resolves the channel id from a pasted YouTube link (channel, handle, or video URL).
 * Works without a YouTube tab open, unlike content-script based detection.
 */
export async function resolveChannelIdFromLink(input: string): Promise<Nullable<string>> {
	const trimmed = input.trim();
	if (!trimmed) return null;
	// A bare channel id was pasted
	const bareChannelId = trimmed.match(channelIdRegex);
	if (bareChannelId) return bareChannelId[0];
	let url: URL;
	try {
		url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
	} catch {
		return null;
	}
	const allowedHosts = ["www.youtube.com", "youtube.com", "m.youtube.com", "youtu.be"];
	if (!allowedHosts.includes(url.hostname)) return null;
	// A direct /channel/ link never needs a network request
	const channelPath = url.pathname.match(/^\/channel\/([\w-]+)/);
	if (channelPath) return channelPath[1];
	try {
		// youtu.be is not covered by host permissions, so normalize to a watch URL first
		const fetchUrl = url.hostname === "youtu.be" ? `https://www.youtube.com/watch?v=${url.pathname.slice(1)}` : url.href;
		const response = await fetch(fetchUrl, {
			credentials: "omit",
			headers: { "Accept-Language": "en" }
		});
		if (!response.ok) return null;
		const html = await response.text();
		/**
		 * The canonical link is the page's own authoritative identity. On channel pages it points to /channel/UC...
		 * even for handle URLs, which avoids false positives from associated channels.
		 */
		const canonicalChannelId = html.match(/<link[^>]*rel="canonical"[^>]*href="https:\/\/www\.youtube\.com\/channel\/([\w-]+)"/)?.[1];
		if (canonicalChannelId) return canonicalChannelId;
		/**
		 * externalId and browseId carry the main channel id on channel pages. The loose channelId match,
		 * videoDetails.channelId, is only reliable on watch and shorts pages, so it stays last.
		 */
		const extracted =
			html.match(/"externalId":"(UC[\w-]+)"/)?.[1] ?? html.match(/"browseId":"(UC[\w-]+)"/)?.[1] ?? html.match(/"channelId":"(UC[\w-]+)"/)?.[1];
		return extracted ?? null;
	} catch {
		return null;
	}
}
