import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { waitForElement, waitForPlayerLoaded } from "@/src/utils/dom/wait";
import { isShortsPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";
import { findDefaultTrack, parseAudioTrack, type ParsedAudioTrack } from "./utils";

let originalAudioTrack: Nullable<ParsedAudioTrack> = null;
export default createFeature({
	...metadata,
	dependencies: { includePages: ["watch", "shorts"] },
	onDisable: async () => {
		// Determine the correct player container selector based on page type
		const playerContainerSelector = isShortsPage() ? "#shorts-player" : "div#movie_player";
		const playerContainer = await waitForElement<YouTubePlayerDiv>(playerContainerSelector);
		if (!playerContainer) return;
		// If the original audio track is not stored, do nothing
		if (!originalAudioTrack) return;
		// Revert the audio track to the one that was selected by the user
		await playerContainer.setAudioTrack(originalAudioTrack.track);
		// Reset the original audio track
		originalAudioTrack = null;
	},
	onEnable: async () => {
		// Determine the correct player container selector based on page type
		const playerContainerSelector = isShortsPage() ? "#shorts-player" : "div#movie_player";
		const playerContainer = await waitForElement<YouTubePlayerDiv>(playerContainerSelector);
		if (!playerContainer) return;
		await waitForPlayerLoaded(playerContainer);
		const audioTracks = await playerContainer.getAvailableAudioTracks();
		const defaultAudioTrack = findDefaultTrack(audioTracks);
		if (!defaultAudioTrack) return;
		const currentAudioTrack = parseAudioTrack(await playerContainer.getAudioTrack());
		if (!currentAudioTrack) return;
		// Store the original audio track in the "originalAudioTrack" variable
		if (!originalAudioTrack) originalAudioTrack = currentAudioTrack;
		// If the current audio track is the same as the default audio track, do nothing
		if (defaultAudioTrack.track.id === currentAudioTrack.track.id) return;
		// Set the audio track to the default audio track
		await playerContainer.setAudioTrack(defaultAudioTrack.track);
	}
});
