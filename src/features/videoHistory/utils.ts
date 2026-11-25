import type { FeatureStateAPI } from "@/src/features/_registry/types";
import type { Nullable, VideoId } from "@/src/types";

import { waitForSpecificMessage } from "@/src/utils/messaging";

import type { VideoHistoryEntry, VideoHistoryStatus, VideoHistoryStorage } from "./types";

/** State-bridge round trip for the scoped entry: ms. Loud, not silent, on timeout (plan 043). */
const VIDEO_HISTORY_ENTRY_TIMEOUT_MS = 500;

export function getVideoHistory(stateAPI: FeatureStateAPI<"videoHistory">): VideoHistoryStorage {
	return stateAPI.getState()?.storage ?? {};
}

/**
 * Asks the content script for this video's stored history entry. The page bridge only ever
 * carries the current video's entry (see scopeStateForPage in the content script), so a
 * navigation must re-fetch instead of trusting the state hydrated at page load — the hop is
 * load-bearing (plan 019): the page-side store is seeded once for the load-time video, so a
 * synchronous read after an SPA navigation has no entry for the video now on screen. The wait
 * runs on a short budget (VIDEO_HISTORY_ENTRY_TIMEOUT_MS) and times out loudly by design
 * (plan 043): a dead bridge must fail fast and visibly instead of stalling resume for the
 * messaging layer's 30 s default and then failing silently. Failure still resolves to null —
 * the caller treats null as "skip auto-seek / resume prompt".
 */
export async function requestStoredVideoEntry(
	videoId: VideoId
): Promise<Nullable<VideoHistoryEntry>> {
	try {
		const { data: state } = await waitForSpecificMessage(
			"state",
			"request_data",
			"extension",
			undefined,
			{ timeout: VIDEO_HISTORY_ENTRY_TIMEOUT_MS }
		);
		return state.videoHistory?.storage?.[videoId] ?? null;
	} catch (error) {
		console.warn(
			"[yte] videoHistory: scoped-entry read failed or timed out; skipping resume this navigation",
			error
		);
		return null;
	}
}

export function setVideoHistory(
	id: string,
	timestamp: number,
	status: VideoHistoryStatus,
	stateAPI: FeatureStateAPI<"videoHistory">
) {
	stateAPI.setState((prev) => ({
		storage: {
			...prev?.storage,
			[id]: { id, status, timestamp }
		}
	}));
}
