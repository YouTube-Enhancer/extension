import type { YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/utils/EventManager";

export const setupAutoScroll = (playerContainer: YouTubePlayerDiv, video: HTMLVideoElement) => {
	if (!("getProgressState" in playerContainer) || ("getProgressState" in playerContainer && typeof playerContainer.getProgressState !== "function"))
		return;
	const shortTimeUpdate = () => {
		const progressState = playerContainer.getProgressState();
		const currentTime = Math.floor(progressState.current);
		const duration = Math.floor(progressState.duration);

		if (currentTime !== duration) return;
		eventManager.removeEventListener(video, "timeupdate", "shortsAutoScroll");
		const nextButton = document.querySelector<HTMLDivElement>("#navigation-button-down > ytd-button-renderer > yt-button-shape > button");
		// Click the next button
		nextButton?.click();
	};
	eventManager.addEventListener(video, "timeupdate", shortTimeUpdate, "shortsAutoScroll");
};
