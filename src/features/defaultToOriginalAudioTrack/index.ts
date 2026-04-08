import type { audioTrack } from "node_modules/@types/youtube-player/dist/types";

import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { isWatchPage, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";
let originalAudioTrack: Nullable<ParsedAudioTrack> = null;
type ParsedAudioTrack = { isAutoDubbed: boolean; isDefault: boolean; name: string; track: audioTrack };
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
	await playerContainer.setAudioTrack(originalAudioTrack.track);
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
	const defaultAudioTrack = findDefaultTrack(audioTracks);
	if (!defaultAudioTrack) return;
	const currentAudioTrack = parseAudioTrack(await playerContainer.getAudioTrack());
	if (!currentAudioTrack) return;
	// Store the original audio track in the "originalAudioTrack" variable
	if (!originalAudioTrack) originalAudioTrack = currentAudioTrack;
	// If the current audio track is the same as the default audio track, do nothing
	if (defaultAudioTrack.name === currentAudioTrack.name) return;
	// Set the audio track to the default audio track
	await playerContainer.setAudioTrack(defaultAudioTrack.track);
}
function findDefaultTrack(tracks: Record<string, unknown>[]): Nullable<ParsedAudioTrack> {
	for (const track of tracks) {
		const audio = parseAudioTrack(track);
		if (audio && audio.isDefault === false && audio.isAutoDubbed === false) {
			return audio;
		}
	}
	return null;
}

function parseAudioTrack(obj: Record<string, unknown>): Nullable<ParsedAudioTrack> {
	for (const key of Object.keys(obj)) {
		const { [key]: value } = obj;
		if (value && typeof value === "object" && !Array.isArray(value) && "name" in value && "isDefault" in value && "isAutoDubbed" in value) {
			return {
				isAutoDubbed: value.isAutoDubbed as boolean,
				isDefault: value.isDefault as boolean,
				name: value.name as string,
				track: obj
			};
		}
	}

	return null;
}
