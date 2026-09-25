import { youtubePlayerMinSpeed } from "@/src/types";
import { round } from "@/src/utils/math";

const maxSpeed = 16;

export function calculateAdjustedSpeed(currentSpeed: number, perClick: number, direction: "decrease" | "increase"): number {
	if (!isFinite(currentSpeed) || !isFinite(perClick) || perClick <= 0) return isFinite(currentSpeed) ? currentSpeed : 1;
	const minSpeed = getMinSpeed(perClick);
	const adjusted =
		currentSpeed >= maxSpeed && direction === "increase" ? maxSpeed
		: (currentSpeed <= minSpeed || currentSpeed - perClick <= 0) && direction === "decrease" ? minSpeed
		: direction === "decrease" ? currentSpeed - perClick
		: currentSpeed + perClick;
	return round(adjusted, 2);
}

export function getMinSpeed(playbackSpeedPerClick: number): number {
	return (
		playbackSpeedPerClick === 0.25 ? 0.25
		: playbackSpeedPerClick >= 0.01 && playbackSpeedPerClick <= 0.09 ? 0.07
		: playbackSpeedPerClick === 0.1 ? 0.01
		: playbackSpeedPerClick === 1 ? 1
		: youtubePlayerMinSpeed
	);
}
