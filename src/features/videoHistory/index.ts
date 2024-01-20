import type { VideoHistoryEntry, YouTubePlayerDiv } from "@/src/types";

import { formatTime } from "@/src/features/remainingTime/utils";
import eventManager from "@/utils/EventManager";
import {
	browserColorLog,
	createStyledElement,
	createTooltip,
	isShortsPage,
	isWatchPage,
	round,
	sendContentMessage,
	waitForSpecificMessage
} from "@/utils/utilities";
export async function setupVideoHistory() {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: { options }
	} = optionsData;
	const { enable_video_history: enableVideoHistory } = options;
	if (!enableVideoHistory) return;
	// Get the player container element
	const playerContainer =
		isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? null
		: null;
	// If player container is not available, return
	if (!playerContainer) return;
	const playerVideoData = await playerContainer.getVideoData();
	// If the video is live return
	if (playerVideoData.isLive) return;
	const { video_id: videoId } = await playerContainer.getVideoData();
	if (!videoId) return;
	const videoElement = playerContainer.querySelector<HTMLVideoElement>("video.video-stream.html5-main-video");
	if (!videoElement) return;

	const videoPlayerTimeUpdateListener = () => {
		void (async () => {
			const currentTime = await playerContainer.getCurrentTime();
			const duration = await playerContainer.getDuration();
			void sendContentMessage("videoHistoryOne", "send_data", {
				video_history_entry: {
					id: videoId,
					status: Math.ceil(duration) === Math.ceil(currentTime) ? "watched" : "watching",
					timestamp: currentTime
				}
			});
		})();
	};
	eventManager.addEventListener(videoElement, "timeupdate", videoPlayerTimeUpdateListener, "videoHistory");
}
export async function promptUserToResumeVideo(cb: () => void) {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: { options }
	} = optionsData;
	const { enable_video_history: enableVideoHistory } = options;
	if (!enableVideoHistory) return;

	// Get the player container element
	const playerContainer =
		isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? null
		: null;

	// If player container is not available, return
	if (!playerContainer) return;

	const { video_id: videoId } = await playerContainer.getVideoData();
	if (!videoId) return;

	const videoHistoryOneData = await waitForSpecificMessage("videoHistoryOne", "request_data", "content", { id: videoId });
	if (!videoHistoryOneData) {
		cb();
		return;
	}
	const {
		data: { video_history_entry }
	} = videoHistoryOneData;
	if (video_history_entry && video_history_entry.status === "watching" && video_history_entry.timestamp > 0) {
		createResumePrompt(video_history_entry, playerContainer, cb);
	} else {
		cb();
	}
}
// Utility function to check if an element exists
const elementExists = (elementId: string) => !!document.getElementById(elementId);
let animationFrameId: null | number = null;
let start: null | number = null;
function createResumePrompt(videoHistoryEntry: VideoHistoryEntry, playerContainer: YouTubePlayerDiv, cb: () => void) {
	const progressBarId = "resume-prompt-progress-bar";
	const overlayId = "resume-prompt-overlay";
	const closeButtonId = "resume-prompt-close-button";
	const resumeButtonId = "resume-prompt-button";
	const promptId = "resume-prompt";
	const progressBarDuration = 15;

	const prompt = createStyledElement({
		elementId: promptId,
		elementType: "div",
		styles: {
			backgroundColor: "#181a1b",
			borderRadius: "5px",
			bottom: "10px",
			boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.2)",
			left: "10px",
			padding: "12px",
			paddingBottom: "17px",
			position: "fixed",
			transition: "all 0.5s ease-in-out",
			zIndex: "25000"
		}
	});
	const progressBar = createStyledElement({
		elementId: progressBarId,
		elementType: "div",
		styles: {
			backgroundColor: "#007acc",
			borderBottomLeftRadius: "5px",
			borderBottomRightRadius: "5px",
			bottom: "0",
			height: "5px",
			left: "0",
			position: "absolute",
			transition: "all 0.5s ease-in-out",
			width: "100%",
			zIndex: "1000"
		}
	});

	const overlay = createStyledElement({
		elementId: overlayId,
		elementType: "div",
		styles: {
			backgroundColor: "rgba(0, 0, 0, 0.75)",
			cursor: "pointer",
			height: "100%",
			left: "0",
			position: "fixed",
			top: "0",
			width: "100%",
			zIndex: "2500"
		}
	});

	const closeButton = createStyledElement({
		elementId: closeButtonId,
		elementType: "button",
		styles: {
			backgroundColor: "transparent",
			border: "0",
			color: "#fff",
			cursor: "pointer",
			fontSize: "16px",
			lineHeight: "1px",
			padding: "5px",
			position: "absolute",
			right: "-2px",
			top: "2px"
		}
	});
	closeButton.textContent = "ₓ";

	const resumeButton = createStyledElement({
		elementId: resumeButtonId,
		elementType: "button",
		styles: {
			backgroundColor: "hsl(213, 80%, 50%)",
			border: "transparent",
			borderRadius: "5px",
			boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.2)",
			color: "white",
			cursor: "pointer",
			padding: "5px",
			textAlign: "center",
			transition: "all 0.5s ease-in-out",
			verticalAlign: "middle"
		}
	});
	resumeButton.textContent = window.i18nextInstance.t("pages.content.features.videoHistory.resumeButton");

	function startCountdown() {
		if (prompt) prompt.style.display = "block";
		if (overlay) overlay.style.display = "block";
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		function updateResumeProgress(timestamp: number) {
			if (!start) start = timestamp;
			const elapsed = round(timestamp - start);
			const progress = round(Math.min(elapsed / (progressBarDuration * 1000), 1), 2);
			progressBar.style.width = `${round((1 - progress) * 100, 2)}%`;
			if (progress < 1) {
				animationFrameId = requestAnimationFrame(updateResumeProgress);
			} else {
				hidePrompt();
			}
		}
		animationFrameId = requestAnimationFrame(updateResumeProgress);
	}

	function hidePrompt() {
		if (animationFrameId) cancelAnimationFrame(animationFrameId);
		prompt.style.display = "none";
		overlay.style.display = "none";
		cb();
	}

	function resumeButtonClickListener() {
		hidePrompt();
		browserColorLog(window.i18nextInstance.t("messages.resumingVideo", { VIDEO_TIME: formatTime(videoHistoryEntry.timestamp) }), "FgGreen");
		void playerContainer.seekTo(videoHistoryEntry.timestamp, true);
		cb();
	}

	if (!elementExists(progressBarId)) {
		prompt.appendChild(progressBar);
	}

	if (!elementExists(overlayId)) {
		document.body.appendChild(overlay);
	}

	if (!elementExists(closeButtonId)) {
		const { listener: resumePromptCloseButtonMouseOverListener } = createTooltip({
			element: closeButton,
			featureName: "videoHistory",
			id: "yte-feature-videoHistory-tooltip",
			text: window.i18nextInstance.t("pages.content.features.videoHistory.resumePrompt.close")
		});
		eventManager.addEventListener(closeButton, "mouseover", resumePromptCloseButtonMouseOverListener, "videoHistory");
		prompt.appendChild(closeButton);
	}

	startCountdown();

	if (elementExists(resumeButtonId)) {
		eventManager.removeEventListener(resumeButton, "click", "videoHistory");
	}

	const closeListener = () => {
		hidePrompt();
	};

	eventManager.addEventListener(resumeButton, "click", resumeButtonClickListener, "videoHistory");
	eventManager.addEventListener(overlay, "click", closeListener, "videoHistory");
	eventManager.addEventListener(closeButton, "click", closeListener, "videoHistory");

	// Display the prompt
	if (!elementExists(promptId)) {
		document.body.appendChild(prompt);
		prompt.appendChild(resumeButton);
	}
}
