import type { YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/events/EventManager";

export const setupAutoScroll = (playerContainer: YouTubePlayerDiv, video: HTMLVideoElement) => {
	if (!("getProgressState" in playerContainer) || ("getProgressState" in playerContainer && typeof playerContainer.getProgressState !== "function"))
		return;
	let hasTriggered = false;
	let wasNearEnd = false;
	const shortTimeUpdate = () => {
		const progressState = playerContainer.getProgressState();
		const { current: currentTime, duration } = progressState;
		if (hasTriggered) {
			if (currentTime < 0.3) {
				// Video has restarted (300ms threshold)
				hasTriggered = false;
				wasNearEnd = false;
			}
			return;
		}
		if (currentTime >= duration * 0.99) {
			wasNearEnd = true;
		}
		if (wasNearEnd && currentTime < 0.3) {
			hasTriggered = true;
			wasNearEnd = false;
			const nextButton = document.querySelector<HTMLDivElement>("#navigation-button-down > ytd-button-renderer > yt-button-shape > button");
			if (!nextButton) return;
			// Click the next button
			nextButton.click();
		}
	};
	eventManager.addEventListener(video, "timeupdate", shortTimeUpdate, "shortsAutoScroll");
};
