import type { Selector, YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import { browserColorLog, clamp, round, toDivisible } from "@/src/utils/utilities";

/**
 * Adjust the speed based on the scroll direction.
 *
 * @param playerContainer - The player container element.
 * @param scrollDelta - The scroll direction.
 * @param speedStep - The speed adjustment steps.
 * @returns Promise that resolves with the new speed.
 */
export function adjustSpeed(
	playerContainer: YouTubePlayerDiv,
	scrollDelta: number,
	speedStep: number
): Promise<{ newSpeed: number; oldSpeed: number }> {
	return new Promise((resolve) => {
		void (async () => {
			if (!playerContainer.getPlaybackRate || !playerContainer.setPlaybackRate) return;
			const video = playerContainer.querySelector("video");
			if (!video) return;
			const { playbackRate: speed } = video;
			const newSpeed = round(clamp(toDivisible(parseFloat((speed + scrollDelta * speedStep).toFixed(2)), speedStep), 0.25, 4), 2);
			browserColorLog(`Adjusting speed by ${speedStep} to ${newSpeed}. Old speed was ${speed}`, "FgMagenta");
			await playerContainer.setPlaybackRate(newSpeed);
			if (video) video.playbackRate = newSpeed;
			resolve({ newSpeed, oldSpeed: speed });
		})();
	});
}
/**
 * Set up event listeners for the specified element.
 *
 * @param selector - The CSS selector for the element.
 * @param listener - The event listener function.
 */
export function setupScrollListeners(selector: Selector, handleWheel: (event: Event) => void) {
	const elements = document.querySelectorAll<HTMLDivElement>(selector);
	if (!elements.length) return browserColorLog(`No elements found with selector ${selector}`, "FgRed");
	for (const element of elements) {
		eventManager.addEventListener(element, "wheel", handleWheel, "scrollWheelSpeedControl", { passive: false });
	}
}
