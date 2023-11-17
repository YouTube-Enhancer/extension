import type { YouTubePlayerDiv } from "@/src/types";
export function formatTime(timeInSeconds: number) {
	timeInSeconds = Math.round(timeInSeconds);
	const units: number[] = [
		Math.floor(timeInSeconds / (3600 * 24)),
		Math.floor((timeInSeconds % (3600 * 24)) / 3600),
		Math.floor((timeInSeconds % 3600) / 60),
		Math.floor(timeInSeconds % 60)
	];

	const formattedUnits: string[] = units.reduce((acc: string[], unit) => {
		if (acc.length > 0) {
			acc.push(unit.toString().padStart(2, "0"));
		} else {
			if (unit > 0) {
				acc.push(unit.toString());
			}
		}

		return acc;
	}, []);
	return `${formattedUnits.length > 0 ? formattedUnits.join(":") : "0"}`;
}
export async function calculateRemainingTime({
	playerContainer,
	videoElement
}: {
	playerContainer: YouTubePlayerDiv;
	videoElement: HTMLVideoElement;
}) {
	// Get the player speed (playback rate)
	const { playbackRate } = videoElement;

	// Get the current time and duration of the video
	const currentTime = await playerContainer.getCurrentTime();
	const duration = await playerContainer.getDuration();

	// Calculate the remaining time in seconds
	const remainingTimeInSeconds = (duration - currentTime) / playbackRate;

	// Format the remaining time
	return ` (-${formatTime(remainingTimeInSeconds)})`;
}
