import { YouTubePlayerDiv } from "@/src/types";
import eventManager from "@/utils/EventManager";
import { browserColorLog, isShortsPage, isWatchPage, waitForSpecificMessage } from "@/utils/utilities";

import { addToHistory, checkVideoStatus, getVideoHistory, markVideoAsWatched, updateVideoHistory } from "./utils";

export default async function setupVideoHistory() {
	// Wait for the "options" message from the content script
	const { options } = await waitForSpecificMessage("options", { source: "content_script" });
	// If options are not available, return
	if (!options) return;
	const { enable_video_history: enableVideoHistory } = options;
	if (!enableVideoHistory) return;
	// Get the player container element
	const playerContainer = isWatchPage() ? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null) : isShortsPage() ? null : null;
	// If player container is not available, return
	if (!playerContainer) return;
	const { video_id: videoId } = await playerContainer.getVideoData();
	if (!videoId) return;
	const videoElement = document.querySelector("video.video-stream.html5-main-video") as HTMLVideoElement | null;
	if (!videoElement) return;

	const { [videoId]: videoHistory } = getVideoHistory();
	console.log(videoHistory);
	if (videoHistory && videoHistory.status === "watching" && videoHistory.timestamp > 0) {
		promptUserToResumeVideo(videoHistory.timestamp);
	}

	const videoPlayerTimeUpdateListener = async () => {
		const currentTime = await playerContainer.getCurrentTime();
		const duration = await playerContainer.getDuration();
		const videoStatus = checkVideoStatus(videoId);
		if (Math.ceil(duration) === Math.ceil(currentTime)) {
			markVideoAsWatched(videoId);
		} else {
			if (videoStatus === "unwatched") {
				addToHistory(videoId, currentTime, "watching");
			} else {
				updateVideoHistory(videoId, currentTime);
			}
		}
	};
	eventManager.addEventListener(videoElement, "timeupdate", videoPlayerTimeUpdateListener, "videoHistory");
}
async function promptUserToResumeVideo(timestamp: number) {
	// Get the player container element
	const playerContainer = isWatchPage() ? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null) : isShortsPage() ? null : null;

	// If player container is not available, return
	if (!playerContainer) return;

	const { video_id: videoId } = await playerContainer.getVideoData();
	if (!videoId) return;

	// Check if the prompt element already exists
	const prompt = document.getElementById("resume-prompt") ?? document.createElement("div");
	// Check if the prompt progress bar already exists
	const progressBar = document.getElementById("resume-prompt-progress-bar") ?? document.createElement("div");
	const progressBarDuration = 15;
	// Create a countdown timer
	let countdown = progressBarDuration; // Countdown in seconds
	const countdownInterval = setInterval(() => {
		countdown--;
		progressBar.style.width = `${(countdown / progressBarDuration) * 100}%`; // Update the progress bar

		if (countdown <= 0) {
			// Automatically hide the prompt when the countdown reaches 0
			clearInterval(countdownInterval);
			prompt.style.display = "none";
		}
	}, 1000);
	if (!document.getElementById("resume-prompt-progress-bar")) {
		progressBar.id = "resume-prompt-progress-bar";
		progressBar.style.width = "100%";
		progressBar.style.height = "10px"; // Height of the progress bar
		progressBar.style.backgroundColor = "#007acc"; // Progress bar color
		progressBar.style.position = "absolute";
		progressBar.style.zIndex = "1000"; // Adjust as needed
		progressBar.style.left = "0"; // Place at the left of the prompt
		progressBar.style.bottom = "0"; // Place at the bottom of the prompt
		progressBar.style.transition = "all 0.5s ease-in-out";
		progressBar.style.borderBottomRightRadius = "5px";
		progressBar.style.borderBottomLeftRadius = "5px";
		prompt.appendChild(progressBar);
	}
	const resumeButtonClickListener = () => {
		// Hide the prompt and clear the countdown timer
		clearInterval(countdownInterval);
		prompt.style.display = "none";
		browserColorLog(`Resuming video`, "FgGreen");
		playerContainer.seekTo(timestamp, true);
	};
	const resumeButton = document.createElement("button") ?? document.getElementById("resume-prompt-button");
	// Create the prompt element if it doesn't exist
	if (!document.getElementById("resume-prompt")) {
		prompt.id = "resume-prompt";
		prompt.style.position = "fixed";
		prompt.style.bottom = "10px"; // Adjust as needed
		prompt.style.right = "10px"; // Adjust as needed
		prompt.style.backgroundColor = "#181a1b";
		prompt.style.padding = "10px";
		prompt.style.paddingBottom = "20px";
		prompt.style.transition = "all 0.5s ease-in-out";
		prompt.style.borderRadius = "5px";
		prompt.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.2)";
		prompt.style.zIndex = "25000";
		document.body.appendChild(prompt);
		resumeButton.id = "resume-prompt-button";
		resumeButton.textContent = "Resume";
		resumeButton.style.backgroundColor = "hsl(213, 80%, 50%)";
		resumeButton.style.border = "transparent";
		resumeButton.style.color = "white";
		resumeButton.style.padding = "10px 20px";
		resumeButton.style.borderRadius = "5px";
		resumeButton.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.2)";
		resumeButton.style.cursor = "pointer";
		resumeButton.style.fontSize = "1.5em";
		resumeButton.style.fontWeight = "bold";
		resumeButton.style.textAlign = "center";
		resumeButton.style.verticalAlign = "middle";
		resumeButton.style.transition = "all 0.5s ease-in-out";

		prompt.appendChild(resumeButton);
	}
	if (document.getElementById("resume-prompt-button")) {
		eventManager.removeEventListener(resumeButton, "click", "videoHistory");
	}
	eventManager.addEventListener(resumeButton, "click", resumeButtonClickListener, "videoHistory");

	// Display the prompt
	prompt.style.display = "block";
}
