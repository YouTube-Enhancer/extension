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
	waitForAllElements,
	waitForElement,
	waitForSpecificMessage
} from "@/utils/utilities";
export async function promptUserToResumeVideo(cb: () => void) {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_video_history: enableVideoHistory, video_history_resume_type }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enableVideoHistory) return;
	// Get the player container element
	const playerContainer =
		isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? null
		: null;
	// If player container is not available, return
	if (!playerContainer) return;
	await waitForAllElements(["#owner #upload-info #channel-name"]);
	const isOfficialArtistChannel =
		(await waitForElement(
			"#owner #upload-info #channel-name svg path[d='M9.03 2.242 8.272 3H7.2A4.2 4.2 0 003 7.2v1.072l-.758.758a4.2 4.2 0 000 5.94l.758.758V16.8A4.2 4.2 0 007.2 21h1.072l.758.758a4.2 4.2 0 005.94 0l.758-.758H16.8a4.2 4.2 0 004.2-4.2v-1.072l.758-.758a4.2 4.2 0 000-5.94L21 8.272V7.2A4.2 4.2 0 0016.8 3h-1.072l-.758-.758a4.2 4.2 0 00-5.94 0Zm7.73 6.638a.5.5 0 01.241.427v1.743a.256.256 0 01-.386.219L14.001 9.7v4.55a2.75 2.75 0 11-2-2.646V6.888a.5.5 0 01.759-.428l4 2.42Z']"
		)) !== null;
	if (isOfficialArtistChannel) return;
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
		if (video_history_resume_type === "automatic") {
			void playerContainer.seekTo(video_history_entry.timestamp, true);
			return cb();
		}
		createResumePrompt(video_history_entry, playerContainer, cb);
	} else {
		cb();
	}
}
export async function setupVideoHistory() {
	// Wait for the "options" message from the content script
	const {
		data: {
			options: { enable_video_history: enableVideoHistory }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enableVideoHistory) return;
	if (!isWatchPage()) return;
	// Get the player container element
	const playerContainer = document.querySelector<YouTubePlayerDiv>("div#movie_player");
	// If player container is not available, return
	if (!playerContainer) return;
	const playerVideoData = await playerContainer.getVideoData();
	// If the video is live return
	if (playerVideoData.isLive) return;
	const { video_id: videoId } = await playerContainer.getVideoData();
	if (!videoId) return;
	const videoElement = playerContainer.querySelector<HTMLVideoElement>("video.video-stream.html5-main-video");
	if (!videoElement) return;
	await waitForAllElements(["#owner #upload-info #channel-name"]);
	const isOfficialArtistChannel = document.querySelector("#owner #upload-info #channel-name .badge-style-type-verified-artist") !== null;
	if (isOfficialArtistChannel) return;
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
// Utility function to check if an element exists
const elementExists = (elementId: string) => !!document.getElementById(elementId);
let animationFrameId: null | number = null;
let start: null | number = null;
function createResumePrompt(videoHistoryEntry: VideoHistoryEntry, playerContainer: YouTubePlayerDiv, cb: () => void) {
	const progressBarId = "resume-prompt-progress-bar";
	const closeButtonId = "resume-prompt-close-button";
	const resumeButtonId = "resume-prompt-button";
	const promptId = "resume-prompt";
	const progressBarDuration = 15;
	const prompt = createStyledElement({
		elementId: promptId,
		elementType: "div",
		styles: {
			backgroundColor: "rgba(28, 28, 28, 0.9)",
			borderRadius: "5px",
			boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.2)",
			left: "50%",
			position: "absolute",
			top: "50%",
			transform: "translate(-50%, -50%)",
			transition: "all 0.5s ease-in-out",
			zIndex: "25000"
		}
	});
	const progressBar = createStyledElement({
		elementId: progressBarId,
		elementType: "div",
		styles: {
			backgroundColor: "#ff0000",
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
			right: "0px",
			top: "0px"
		}
	});
	closeButton.textContent = "ₓ";
	const resumeButton = createStyledElement({
		elementId: resumeButtonId,
		elementType: "button",
		styles: {
			backgroundColor: "rgb(15, 15, 15)",
			border: "transparent",
			borderRadius: "5px",
			boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.2)",
			color: "white",
			cursor: "pointer",
			padding: "10px 12px",
			textAlign: "center",
			transition: "all 0.5s ease-in-out",
			verticalAlign: "middle"
		}
	});
	resumeButton.textContent = window.i18nextInstance.t("pages.content.features.videoHistory.extras.resumeButton");
	function startCountdown() {
		if (prompt) prompt.style.display = "block";
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
	if (!elementExists(closeButtonId)) {
		prompt.appendChild(closeButton);
	}
	const { listener: resumePromptCloseButtonMouseOverListener } = createTooltip({
		element: closeButton,
		featureName: "videoHistory",
		id: "yte-feature-videoHistory-tooltip",
		text: window.i18nextInstance.t("pages.content.features.videoHistory.extras.resumePromptClose")
	});
	eventManager.removeEventListener(closeButton, "mouseover", "videoHistory");
	eventManager.addEventListener(closeButton, "mouseover", resumePromptCloseButtonMouseOverListener, "videoHistory");
	startCountdown();
	const closeListener = () => {
		hidePrompt();
	};
	eventManager.removeEventListener(resumeButton, "click", "videoHistory");
	eventManager.addEventListener(resumeButton, "click", resumeButtonClickListener, "videoHistory");
	eventManager.removeEventListener(closeButton, "click", "videoHistory");
	eventManager.addEventListener(closeButton, "click", closeListener, "videoHistory");
	// Display the prompt
	if (!elementExists(promptId)) {
		prompt.appendChild(resumeButton);
		playerContainer.appendChild(prompt);
	}
}
