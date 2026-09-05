/**
 * One lazy Innertube client for the whole extension, and the reads built on it. Use it for reads, and as the fallback
 * when YouTube's own command pipeline (src/utils/dom/nativeCommands.ts) is unavailable; prefer the pipeline for
 * writes.
 */

import type { Nullable } from "@/src/types";

import { findInObjectTree } from "@/src/utils/misc";

let clientPromise: Nullable<ReturnType<typeof createInnertubeClient>> = null;

export function getInnertubeClient() {
	return (clientPromise ??= createInnertubeClient());
}

export async function isVideoInPlaylist(videoId: string, playlistId: string): Promise<boolean> {
	const youtube = await getInnertubeClient();
	const response = await youtube.actions.execute("/playlist/get_add_to_playlist", { parse: false, videoIds: [videoId] });
	return findInObjectTree(response.data, (node) => (node.playlistId === playlistId ? node.containsSelectedVideos === "ALL" : null), 12) ?? false;
}

async function createInnertubeClient() {
	const { Innertube } = await import("youtubei.js/web");
	return Innertube.create({
		cookie: document.cookie,
		fetch: (...args) => fetch(...args)
	});
}
