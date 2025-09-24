import type { audioTrack } from "node_modules/@types/youtube-player/dist/types";

import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { isWatchPage, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";
let originalAudioTrack: Nullable<audioTrack> = null;
/**
 * Reverts the audio track to the one that was selected by the user
 * when the feature was enabled.
 */
export async function disableDefaultToOriginalAudioTrack() {
	if (!isWatchPage()) return;
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	if (!playerContainer) return;
	// If the original audio track is not stored, do nothing
	if (!originalAudioTrack) return;
	// Revert the audio track to the one that was selected by the user
	await playerContainer.setAudioTrack(originalAudioTrack);
	// Reset the original audio track
	originalAudioTrack = null;
}

/**
 * Enables the feature to default to the original audio track.
 */
export async function enableDefaultToOriginalAudioTrack() {
	const {
		data: {
			options: { enable_default_to_original_audio_track: defaultToOriginalAudioTrack }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!defaultToOriginalAudioTrack) return;
	if (!isWatchPage()) return;
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	if (!playerContainer) return;
	const audioTracks = await playerContainer.getAvailableAudioTracks();
	const defaultAudioTrack = audioTracks.find((track) => track.tq.name.toLowerCase().includes("original"));
	if (!defaultAudioTrack) return;
	const currentAudioTrack = await playerContainer.getAudioTrack();
	// Store the original audio track in the "originalAudioTrack" variable
	if (!originalAudioTrack) originalAudioTrack = currentAudioTrack;
	// If the current audio track is the same as the default audio track, do nothing
	if (defaultAudioTrack.tq.name === currentAudioTrack.tq.name) return;
	// Set the audio track to the default audio track
	await playerContainer.setAudioTrack(defaultAudioTrack);
}
