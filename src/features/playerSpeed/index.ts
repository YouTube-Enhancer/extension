import { YouTubePlayerDiv } from "@/src/types";
import { isWatchPage, isShortsPage, browserColorLog, waitForSpecificMessage } from "@/src/utils/utilities";

/**
 * Sets the player speed based on the options received from a specific message.
 * It sets the playback speed if the option is enabled and a valid speed is specified.
 *
 * @returns {Promise<void>} A promise that resolves once the player speed is set.
 */
export default async function setPlayerSpeed(options?: { playerSpeed?: number; enableForcedPlaybackSpeed?: boolean }): Promise<void> {
	if (options) {
		const { enableForcedPlaybackSpeed, playerSpeed } = options;
		if (!enableForcedPlaybackSpeed) return;
		if (!playerSpeed) return;
		// Get the player element
		const playerContainer = isWatchPage()
			? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null)
			: isShortsPage()
			? (document.querySelector("div#shorts-player") as YouTubePlayerDiv | null)
			: null;
		const video = document.querySelector("video.html5-main-video") as HTMLVideoElement | null;
		// If player element is not available, return
		if (!playerContainer) return;

		// If setPlaybackRate method is not available in the player, return
		if (!playerContainer.setPlaybackRate) return;

		// Log the message indicating the player speed being set
		browserColorLog(`Setting player speed to ${playerSpeed}`, "FgMagenta");

		// Set the playback speed
		playerContainer.setPlaybackRate(playerSpeed);
		// Set the video playback speed
		if (video) video.playbackRate = playerSpeed;
	} else {
		// Wait for the "options" message from the content script
		const optionsData = await waitForSpecificMessage("options", "request_data", "content");
		if (!optionsData) return;
		const {
			data: { options }
		} = optionsData;
		// Extract the necessary properties from the options object
		const { player_speed, enable_forced_playback_speed } = options;

		// If forced playback speed option is disabled, return
		if (!enable_forced_playback_speed) return;

		// If player speed is not specified, return
		if (!player_speed) return;

		// Get the player element
		const playerContainer = isWatchPage()
			? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null)
			: isShortsPage()
			? (document.querySelector("div#shorts-player") as YouTubePlayerDiv | null)
			: null;
		// If player element is not available, return
		if (!playerContainer) return;
		const video = document.querySelector("video.html5-main-video") as HTMLVideoElement | null;

		// If setPlaybackRate method is not available in the player, return
		if (!playerContainer.setPlaybackRate) return;
		const playerVideoData = await playerContainer.getVideoData();
		// If the video is live return
		if (playerVideoData.isLive) return;
		// Log the message indicating the player speed being set
		browserColorLog(`Setting player speed to ${player_speed}`, "FgMagenta");

		// Set the playback speed
		playerContainer.setPlaybackRate(player_speed);
		// Set the video playback speed
		if (video) video.playbackRate = player_speed;
	}
}
