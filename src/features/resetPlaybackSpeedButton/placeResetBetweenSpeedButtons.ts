import { getFeatureButtonId } from "@/src/features/buttonController";

export function placeResetBetweenSpeedButtons() {
	const decrease = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId("decreasePlaybackSpeedButton")}`);
	const increase = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId("increasePlaybackSpeedButton")}`);
	const reset = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId("resetPlaybackSpeedButton")}`);
	if (!decrease || !increase || !reset) return;
	const { parentElement } = decrease;
	if (!parentElement || parentElement !== increase.parentElement || parentElement !== reset.parentElement) return;
	increase.before(reset);
}
