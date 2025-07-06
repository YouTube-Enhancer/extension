import type { Nullable, YouTubePlayerDiv } from "@/src/types";
import type { audioTrack } from "node_modules/@types/youtube-player/dist/types";

import { isWatchPage, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";
let originalAudioTrack: Nullable<audioTrack> = null;
/**
 * Reverts the audio track to the one that was selected by the user
 * when the feature was enabled.
 */
export async function disableDefaultToOriginalAudioTrack() {
	if (!isWatchPage()) return;
	// Wait for the player container to be available
	await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);
	const playerContainer = document.querySelector<YouTubePlayerDiv>("div#movie_player");
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
	await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);
	const playerContainer = document.querySelector<YouTubePlayerDiv>("div#movie_player");
	if (!playerContainer) return;
	const audioTracks = await playerContainer.getAvailableAudioTracks();
	const defaultAudioTrack = audioTracks.find((track) => track.Y2.isDefault === true);
	if (!defaultAudioTrack) return;
	const currentAudioTrack = await playerContainer.getAudioTrack();
	// Store the original audio track in the "originalAudioTrack" variable
	if (!originalAudioTrack) originalAudioTrack = currentAudioTrack;
	// If the current audio track is the same as the default audio track, do nothing
	if (defaultAudioTrack.Y2.name === currentAudioTrack.Y2.name) return;
	// Set the audio track to the default audio track
	await playerContainer.setAudioTrack(defaultAudioTrack);
}
