import type { FeatureStateAPI } from "@/src/features/_registry/types";
import type { Nullable, VideoId } from "@/src/types";

import { waitForSpecificMessage } from "@/src/utils/messaging";

import type { VideoHistoryEntry, VideoHistoryStatus, VideoHistoryStorage } from "./types";

export function getVideoHistory(stateAPI: FeatureStateAPI<"videoHistory">): VideoHistoryStorage {
	return stateAPI.getState()?.storage ?? {};
}

/**
 * Asks the content script for this video's stored history entry. The page bridge only ever
 * carries the current video's entry (see scopeStateForPage in the content script), so a
 * navigation must re-fetch instead of trusting the state hydrated at page load.
 */
export async function requestStoredVideoEntry(
	videoId: VideoId
): Promise<Nullable<VideoHistoryEntry>> {
	try {
		const { data: state } = await waitForSpecificMessage("state", "request_data", "extension");
		return state.videoHistory?.storage?.[videoId] ?? null;
	} catch {
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
