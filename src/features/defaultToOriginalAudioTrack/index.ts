import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { isShortsPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";
import { findDefaultTrack, parseAudioTrack, type ParsedAudioTrack } from "./utils";

let originalAudioTrack: Nullable<ParsedAudioTrack> = null;

function makeRestoreAudioTrackTask(): () => Promise<boolean> {
	return async (): Promise<boolean> => {
		if (!originalAudioTrack) return true;
		const playerContainer =
			isShortsPage() ? document.querySelector<YouTubePlayerDiv>("#shorts-player") : document.querySelector<YouTubePlayerDiv>("div#movie_player");
		if (!playerContainer || !playerContainer.setAudioTrack) return false;
		await playerContainer.setAudioTrack(originalAudioTrack.track);
		originalAudioTrack = null;
		return true;
	};
}

function makeSaveTrackTask(): () => Promise<boolean> {
	return async (): Promise<boolean> => {
		if (originalAudioTrack) return true;
		const playerContainer =
			isShortsPage() ? document.querySelector<YouTubePlayerDiv>("#shorts-player") : document.querySelector<YouTubePlayerDiv>("div#movie_player");
		if (!playerContainer || !playerContainer.getAudioTrack) return false;
		const currentAudioTrack = parseAudioTrack(await playerContainer.getAudioTrack());
		if (!currentAudioTrack) return false;
		originalAudioTrack = currentAudioTrack;
		return true;
	};
}

function makeSetDefaultAudioTrackTask(): () => Promise<boolean> {
	return async (): Promise<boolean> => {
		const playerContainer =
			isShortsPage() ? document.querySelector<YouTubePlayerDiv>("#shorts-player") : document.querySelector<YouTubePlayerDiv>("div#movie_player");
		if (!playerContainer || !playerContainer.getAvailableAudioTracks) return false;
		const audioTracks = await playerContainer.getAvailableAudioTracks();
		const defaultAudioTrack = findDefaultTrack(audioTracks);
		if (!defaultAudioTrack) return false;
		const currentAudioTrack = parseAudioTrack(await playerContainer.getAudioTrack());
		if (!currentAudioTrack) return false;
		if (defaultAudioTrack.track.id === currentAudioTrack.track.id) return true;
		await playerContainer.setAudioTrack(defaultAudioTrack.track);
		return true;
	};
}

export default createFeature({
	...metadata,
	onDisable: () => {
		void registry.playerManager.executeWithRetries("defaultToOriginalAudioTrack", [makeRestoreAudioTrackTask()], ["restoreAudio"], {
			maxAttempts: 15,
			waitForLoaded: true
		});
	},
	onEnable: () => {
		void registry.playerManager.executeWithRetries(
			"defaultToOriginalAudioTrack",
			[makeSaveTrackTask(), makeSetDefaultAudioTrackTask()],
			["saveTrack", "setDefault"],
			{ maxAttempts: 15, waitForLoaded: true }
		);
	},
	onNavigate: () => {
		void registry.playerManager.executeWithRetries("defaultToOriginalAudioTrack", [makeSetDefaultAudioTrackTask()], ["setDefault"], {
			maxAttempts: 15,
			waitForLoaded: true
		});
	}
});
