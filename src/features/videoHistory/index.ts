import type { YouTubePlayerDiv } from "@/src/types";
import eventManager from "@/utils/EventManager";
import { browserColorLog, createTooltip, isShortsPage, isWatchPage, sendContentMessage, waitForSpecificMessage } from "@/utils/utilities";

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
	const playerContainer = isWatchPage() ? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null) : isShortsPage() ? null : null;
	// If player container is not available, return
	if (!playerContainer) return;
	const { video_id: videoId } = await playerContainer.getVideoData();
	if (!videoId) return;
	const videoElement = document.querySelector("video.video-stream.html5-main-video") as HTMLVideoElement | null;
	if (!videoElement) return;

	const videoPlayerTimeUpdateListener = async () => {
		const currentTime = await playerContainer.getCurrentTime();
		const duration = await playerContainer.getDuration();
		sendContentMessage("videoHistoryOne", "send_data", {
			video_history_entry: {
				id: videoId,
				status: Math.ceil(duration) === Math.ceil(currentTime) ? "watched" : "watching",
				timestamp: currentTime
			}
		});
	};
	eventManager.addEventListener(videoElement, "timeupdate", videoPlayerTimeUpdateListener, "videoHistory");
}
export async function promptUserToResumeVideo() {
	// Get the player container element
	const playerContainer = isWatchPage() ? (document.querySelector("div#movie_player") as YouTubePlayerDiv | null) : isShortsPage() ? null : null;

	// If player container is not available, return
	if (!playerContainer) return;

	const { video_id: videoId } = await playerContainer.getVideoData();
	if (!videoId) return;
	const videoHistoryOneData = await waitForSpecificMessage("videoHistoryOne", "request_data", "content", { id: videoId });
	if (!videoHistoryOneData) return;
	const {
		data: { video_history_entry }
	} = videoHistoryOneData;
	if (video_history_entry && video_history_entry.status === "watching" && video_history_entry.timestamp > 0) {
		// Check if the prompt element already exists
		const prompt = document.getElementById("resume-prompt") ?? document.createElement("div");
		// Check if the prompt progress bar already exists
		const progressBar = document.getElementById("resume-prompt-progress-bar") ?? document.createElement("div");
		const progressBarDuration = 15;
		// Create a countdown timer
		let countdown = 15; // Countdown in seconds
		const countdownInterval = setInterval(() => {
			countdown--;
			progressBar.style.width = `${(countdown / progressBarDuration) * 100}%`; // Update the progress bar

			if (countdown <= 0) {
				// Automatically hide the prompt when the countdown reaches 0
				clearInterval(countdownInterval);
				prompt.style.display = "none";
				overlay.style.display = "none";
			}
		}, 1000);
		if (!document.getElementById("resume-prompt-progress-bar")) {
			progressBar.id = "resume-prompt-progress-bar";
			progressBar.style.width = "100%";
			progressBar.style.height = "5px"; // Height of the progress bar
			progressBar.style.backgroundColor = "#007acc"; // Progress bar color
			progressBar.style.position = "absolute";
			progressBar.style.zIndex = "1000";
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
			overlay.style.display = "none";
			browserColorLog(`Resuming video`, "FgGreen");
			playerContainer.seekTo(video_history_entry.timestamp, true);
		};
		const overlay = document.getElementById("resume-prompt-overlay") ?? document.createElement("div");
		const resumeButton = document.getElementById("resume-prompt-button") ?? document.createElement("button");
		const closeButton = document.getElementById("resume-prompt-close-button") ?? document.createElement("button");

		// Create the overlay if it doesn't exist
		if (!document.getElementById("resume-prompt-overlay")) {
			overlay.style.position = "fixed";
			overlay.style.top = "0";
			overlay.style.left = "0";
			overlay.style.width = "100%";
			overlay.style.height = "100%";
			overlay.style.backgroundColor = "rgba(0, 0, 0, 0.75)";
			overlay.style.zIndex = "2500";
			overlay.style.cursor = "pointer";
			document.body.appendChild(overlay);
		}
		// Create the close button if it doesn't exist
		if (!document.getElementById("resume-prompt-close-button")) {
			closeButton.id = "resume-prompt-close-button";
			closeButton.textContent = "ₓ";
			closeButton.style.fontSize = "16px";
			closeButton.style.position = "absolute";
			closeButton.style.top = "2px";
			closeButton.style.right = "-2px";
			closeButton.style.backgroundColor = "transparent";
			closeButton.style.color = "#fff";
			closeButton.style.border = "0";
			closeButton.style.padding = "5px";
			closeButton.style.cursor = "pointer";
			closeButton.style.lineHeight = "1px";
			closeButton.dataset.title = "Close";
			const { listener: resumePromptCloseButtonMouseOverListener } = createTooltip({
				element: closeButton,
				id: "yte-resume-prompt-close-button-tooltip",
				featureName: "videoHistory"
			});
			eventManager.addEventListener(closeButton, "mouseover", resumePromptCloseButtonMouseOverListener, "videoHistory");
			prompt.appendChild(closeButton);
		}
		// Create the prompt element if it doesn't exist
		if (!document.getElementById("resume-prompt")) {
			prompt.id = "resume-prompt";
			prompt.style.position = "fixed";
			prompt.style.bottom = "10px";
			prompt.style.left = "10px";
			prompt.style.backgroundColor = "#181a1b";
			prompt.style.padding = "12px";
			prompt.style.paddingBottom = "17px";
			prompt.style.transition = "all 0.5s ease-in-out";
			prompt.style.borderRadius = "5px";
			prompt.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.2)";
			prompt.style.zIndex = "25000";
			resumeButton.id = "resume-prompt-button";
			resumeButton.textContent = "Resume";
			resumeButton.style.backgroundColor = "hsl(213, 80%, 50%)";
			resumeButton.style.border = "transparent";
			resumeButton.style.color = "white";
			resumeButton.style.padding = "5px";
			resumeButton.style.borderRadius = "5px";
			resumeButton.style.boxShadow = "0px 0px 5px rgba(0, 0, 0, 0.2)";
			resumeButton.style.cursor = "pointer";
			resumeButton.style.textAlign = "center";
			resumeButton.style.verticalAlign = "middle";
			resumeButton.style.transition = "all 0.5s ease-in-out";

			prompt.appendChild(resumeButton);
			document.body.appendChild(prompt);
		}
		if (document.getElementById("resume-prompt-button")) {
			eventManager.removeEventListener(resumeButton, "click", "videoHistory");
		}
		const closeListener = () => {
			clearInterval(countdownInterval);
			prompt.style.display = "none";
			overlay.style.display = "none";
		};
		eventManager.addEventListener(resumeButton, "click", resumeButtonClickListener, "videoHistory");
		eventManager.addEventListener(overlay, "click", closeListener, "videoHistory");
		eventManager.addEventListener(closeButton, "click", closeListener, "videoHistory");
		// Display the prompt
		prompt.style.display = "block";
	}
}
