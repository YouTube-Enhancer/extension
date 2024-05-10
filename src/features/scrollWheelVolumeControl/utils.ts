import type { Selector, YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import { browserColorLog, clamp, toDivisible } from "@/src/utils/utilities";

/**
 * Adjust the volume based on the scroll direction.
 *
 * @param playerContainer - The player container element.
 * @param scrollDelta - The scroll direction.
 * @param adjustmentSteps - The volume adjustment steps.
 * @returns Promise that resolves with the new volume.
 */
export function adjustVolume(
	playerContainer: YouTubePlayerDiv,
	scrollDelta: number,
	volumeStep: number
): Promise<{ newVolume: number; oldVolume: number }> {
	return new Promise((resolve) => {
		void (async () => {
			if (!playerContainer.getVolume || !playerContainer.setVolume || !playerContainer.isMuted || !playerContainer.unMute) return;
			const [volume, isMuted] = await Promise.all([playerContainer.getVolume(), playerContainer.isMuted()]);
			const newVolume = clamp(toDivisible(volume + scrollDelta * volumeStep, volumeStep), 0, 100);
			browserColorLog(`Adjusting volume by ${volumeStep} to ${newVolume}. Old volume was ${volume}`, "FgMagenta");
			await playerContainer.setVolume(newVolume);
			if (isMuted && typeof playerContainer.unMute === "function") await playerContainer.unMute();
			resolve({ newVolume, oldVolume: volume });
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
		eventManager.addEventListener(element, "wheel", handleWheel, "scrollWheelVolumeControl", { passive: false });
	}
}
