import type { YouTubePlayerDiv } from "@/src/types";

import { formatVideoTimestamp } from "@/src/utils/format/time";

export async function calculateRemainingTime({
	playerContainer,
	videoElement
}: {
	playerContainer: YouTubePlayerDiv;
	videoElement: HTMLVideoElement;
}) {
	// Get the player speed (playback rate)
	const { playbackRate } = videoElement;
	// Get the current time and duration of the video in parallel
	const [currentTime, duration] = await Promise.all([
		playerContainer.getCurrentTime(),
		playerContainer.getDuration()
	]);
	// Calculate the remaining time in seconds
	const remainingTimeInSeconds = (duration - currentTime) / playbackRate;
	// Format the remaining time
	return ` (-${formatVideoTimestamp(remainingTimeInSeconds)})`;
}
