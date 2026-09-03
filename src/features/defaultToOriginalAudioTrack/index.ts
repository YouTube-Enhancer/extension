import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { extractSectionsFromYouTubeURL, getCurrentVideoId, isShortsPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";
import { findDefaultTrack, parseAudioTrack, type ParsedAudioTrack } from "./utils";

let originalAudioTrack: Nullable<ParsedAudioTrack> = null;
// The video the saved track was read from: an in-page navigation swaps the video without re-running onEnable, so a
// track captured for the previous video must never be restored into the one that is playing now.
let originalAudioTrackVideoId: Nullable<string> = null;

function clearOriginalAudioTrack() {
	originalAudioTrack = null;
	originalAudioTrackVideoId = null;
}

/** Returns the video id the URL points at, on watch (?v=), shorts and live pages alike. */
function getUrlVideoId(): Nullable<string> {
	const [section, videoId] = extractSectionsFromYouTubeURL(window.location.href);
	if (section === "live" || section === "shorts") return videoId ?? null;
	return getCurrentVideoId();
}

function makeRestoreAudioTrackTask(): () => Promise<boolean> {
	return async (): Promise<boolean> => {
		if (!originalAudioTrack) return true;
		const playerContainer =
			isShortsPage() ? document.querySelector<YouTubePlayerDiv>("#shorts-player") : document.querySelector<YouTubePlayerDiv>("div#movie_player");
		if (!playerContainer || !playerContainer.setAudioTrack || !playerContainer.getVideoData) return false;
		const { video_id: playerVideoId } = await playerContainer.getVideoData();
		const videoId = resolvePlayerVideoId(playerVideoId);
		if (!videoId) return false;
		// The saved track belongs to another video, so this player has nothing of its own to get back.
		if (videoId !== originalAudioTrackVideoId) {
			clearOriginalAudioTrack();
			return true;
		}
		await playerContainer.setAudioTrack(originalAudioTrack.track);
		clearOriginalAudioTrack();
		return true;
	};
}

function makeSaveTrackTask(): () => Promise<boolean> {
	return async (): Promise<boolean> => {
		const playerContainer =
			isShortsPage() ? document.querySelector<YouTubePlayerDiv>("#shorts-player") : document.querySelector<YouTubePlayerDiv>("div#movie_player");
		if (!playerContainer || !playerContainer.getAudioTrack || !playerContainer.getVideoData) return false;
		// Read the id and the track together so both describe the same moment.
		const [{ video_id: playerVideoId }, currentTrack] = await Promise.all([playerContainer.getVideoData(), playerContainer.getAudioTrack()]);
		const videoId = resolvePlayerVideoId(playerVideoId);
		if (!videoId) return false;
		// Keep the track already saved for this video, replace one saved for any other.
		if (originalAudioTrack && originalAudioTrackVideoId === videoId) return true;
		const currentAudioTrack = parseAudioTrack(currentTrack);
		if (!currentAudioTrack) return false;
		originalAudioTrack = currentAudioTrack;
		originalAudioTrackVideoId = videoId;
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

/**
 * Returns the id of the video the player reports, or null while it still reports the video the page navigated away
 * from: a track read at that point belongs to that previous video.
 */
function resolvePlayerVideoId(playerVideoId: Nullable<string>): Nullable<string> {
	if (!playerVideoId) return null;
	const urlVideoId = getUrlVideoId();
	if (urlVideoId && playerVideoId !== urlVideoId) return null;
	return playerVideoId;
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
		// Save first: the video changed without onEnable running again, so the track to restore is this video's.
		void registry.playerManager.executeWithRetries(
			"defaultToOriginalAudioTrack",
			[makeSaveTrackTask(), makeSetDefaultAudioTrackTask()],
			["saveTrack", "setDefault"],
			{ maxAttempts: 15, waitForLoaded: true }
		);
	}
});
