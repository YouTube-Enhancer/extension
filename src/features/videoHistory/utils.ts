import type { FeatureStateAPI } from "@/src/features/_registry/types";

import type { VideoHistoryStatus, VideoHistoryStorage } from "./types";

export function getVideoHistory(stateAPI: FeatureStateAPI<"videoHistory">): VideoHistoryStorage {
	return stateAPI.getState()?.storage ?? {};
}

export function setVideoHistory(id: string, timestamp: number, status: VideoHistoryStatus, stateAPI: FeatureStateAPI<"videoHistory">) {
	stateAPI.setState((prev) => ({
		storage: {
			...prev?.storage,
			[id]: { id, status, timestamp }
		}
	}));
}
