import { setPlayerSpeed } from "@/src/features/playerSpeed";
import { youtubePlayerMinSpeed, type Selector } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import { browserColorLog, round } from "@/src/utils/utilities";

/**
 * Adjust the speed based on the scroll direction.
 *
 * @param playerContainer - The player container element.
 * @param scrollDelta - The scroll direction.
 * @param speedStep - The speed adjustment steps.
 * @returns Promise that resolves with the new speed.
 */
export function adjustSpeed(scrollDelta: number, speedStep: number): Promise<{ newSpeed: number; oldSpeed: number }> {
	return new Promise((resolve) => {
		void (async () => {
			const videoElement = document.querySelector<HTMLVideoElement>("video");
			if (!videoElement) return;
			const { playbackRate: currentPlaybackSpeed } = videoElement;
			const adjustmentAmount = speedStep * scrollDelta;
			if (currentPlaybackSpeed + adjustmentAmount > 16 || currentPlaybackSpeed + adjustmentAmount < youtubePlayerMinSpeed) return;
			const speed = round(currentPlaybackSpeed + adjustmentAmount, 2);
			await setPlayerSpeed(speed);
			resolve({ newSpeed: speed, oldSpeed: currentPlaybackSpeed });
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
	const elements: NodeListOf<HTMLDivElement> = document.querySelectorAll(selector);
	if (!elements.length) return browserColorLog(`No elements found with selector ${selector}`, "FgRed");
	for (const element of elements) {
		eventManager.addEventListener(element, "wheel", handleWheel, "scrollWheelSpeedControl", { passive: false });
	}
}
