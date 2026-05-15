import type { VideoHistoryEntry, VideoHistoryResumeType, VideoHistoryStorage } from "@/src/features/videoHistory/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { formatTime } from "@/src/features/remainingTime/utils";
import { getVideoHistory, setVideoHistory } from "@/src/features/videoHistory/utils";
import { type Author, type Brand, type Nullable, type VideoId, type YouTubePlayerDiv } from "@/src/types";
import { createStyledElement } from "@/src/utils/dom/elements";
import { createTooltip } from "@/src/utils/dom/tooltip";
import { waitForElement } from "@/src/utils/dom/wait";
import { browserColorLog } from "@/src/utils/logging";
import { round } from "@/src/utils/math";

import { metadata } from "./index.metadata";

let animationFrameId: Nullable<number> = null;
let start: Nullable<number> = null;
let currentVideoId: Nullable<string> = null;
let lastSave = 0;
let lastSavedTimestamp = 0;
let hasMarkedWatched = false;
const artistChannelCache = new Map<string, boolean>();
const progressBarId = "resume-prompt-progress-bar";
const closeButtonId = "resume-prompt-close-button";
const resumeButtonId = "resume-prompt-button";
const promptId = "resume-prompt";
const progressBarDuration = 15;
const SAVE_INTERVAL = 1000;
const END_TOLERANCE = 0.75;
function createAuthor(author: string): Author {
	if (!author) throw new Error("Invalid author");
	return author as Author;
}
function createResumePrompt(videoHistoryEntry: VideoHistoryEntry, playerContainer: YouTubePlayerDiv) {
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
	resumeButton.textContent = window.i18nextInstance.t((translations) => translations.pages.content.features.videoHistory.extras.resumeButton);
	function startCountdown() {
		if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
		prompt.style.display = "block";
		start = null;
		function updateResumeProgress(timestamp: number) {
			if (!start) start = timestamp;
			if (prompt.style.display === "none") return;
			const elapsed = timestamp - start;
			const progress = Math.min(elapsed / (progressBarDuration * 1000), 1);
			progressBar.style.width = `${round((1 - progress) * 100, 2)}%`;
			if (progress < 1) animationFrameId = requestAnimationFrame(updateResumeProgress);
			else hidePrompt();
		}

		animationFrameId = requestAnimationFrame(updateResumeProgress);
	}
	function hidePrompt() {
		if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
		start = null;
		lastSave = 0;
		lastSavedTimestamp = 0;
		hasMarkedWatched = false;
		prompt.style.display = "none";
	}
	function resumeButtonClickListener() {
		hidePrompt();
		browserColorLog(
			window.i18nextInstance.t((translations) => translations.messages.resumingVideo, {
				VIDEO_TIME: formatTime(videoHistoryEntry.timestamp)
			}),
			"FgGreen"
		);
		try {
			void playerContainer.playVideo?.();
			void playerContainer.seekTo(videoHistoryEntry.timestamp, true);
		} catch {}
	}
	const fragment = document.createDocumentFragment();
	if (!document.getElementById(progressBarId)) fragment.appendChild(progressBar);
	if (!document.getElementById(closeButtonId)) fragment.appendChild(closeButton);
	fragment.appendChild(resumeButton);
	prompt.appendChild(fragment);
	const { listener: tooltipListener } = createTooltip({
		element: closeButton,
		featureName: "videoHistory",
		id: "yte-feature-videoHistory-tooltip",
		text: window.i18nextInstance.t((translations) => translations.pages.content.features.videoHistory.extras.resumePromptClose)
	});
	eventManager.removeEventListener(closeButton, "mouseover", "videoHistory");
	eventManager.addEventListener(closeButton, "mouseover", tooltipListener, "videoHistory");
	const closeListener = () => hidePrompt();
	eventManager.removeEventListener(resumeButton, "click", "videoHistory");
	eventManager.addEventListener(resumeButton, "click", resumeButtonClickListener, "videoHistory");
	eventManager.removeEventListener(closeButton, "click", "videoHistory");
	eventManager.addEventListener(closeButton, "click", closeListener, "videoHistory");
	startCountdown();
	if (!document.getElementById(promptId)) {
		playerContainer.appendChild(prompt);
	}
}
function createVideoId(id: string): VideoId {
	if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
		throw new Error(`Invalid YouTube videoId: "${id}"`);
	}
	return id as VideoId;
}
export default createFeature({
	...metadata,
	dependencies: { includePages: ["watch"] },
	onDisable: () => {
		eventManager.removeEventListeners("videoHistory");
		document.getElementById(promptId)?.remove();
		resetState();
	},
	onEnable: async ({ resumeType }) => handleVideoChange(resumeType),
	onInit: () => {
		if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
		start = null;
		lastSave = 0;
		eventManager.removeEventListeners("videoHistory");
		document.getElementById(promptId)?.remove();
		resetState();
	},
	onNavigate: async ({ resumeType }, _, navigationType) => {
		if (navigationType === "finish") await handleVideoChange(resumeType);
		else if (navigationType === "start") document.getElementById(promptId)?.remove();
	},
	persistState: true,
	state: {
		storage: {} as VideoHistoryStorage
	}
});
async function handleVideoChange(resumeType: VideoHistoryResumeType) {
	// Get the player container element
	const playerContainer = document.querySelector<YouTubePlayerDiv>("div#movie_player");
	// If player container is not available, return
	if (!playerContainer) return;
	const playerVideoData = await playerContainer.getVideoData();
	// If the video is live return
	if (playerVideoData.isLive) return;
	const { author: rawAuthor } = playerVideoData;
	let videoId: VideoId;
	if (currentVideoId) {
		const nextVideoId = await waitForVideoChange(playerContainer);
		if (!nextVideoId) return;
		videoId = nextVideoId;
	} else {
		if (!playerVideoData.video_id) return;
		videoId = createVideoId(playerVideoData.video_id);
	}
	if (currentVideoId === videoId) return;
	currentVideoId = videoId;
	resetState();
	const videoElement = playerContainer.querySelector<HTMLVideoElement>("video.video-stream.html5-main-video");
	if (!videoElement) return;
	const author = createAuthor(rawAuthor ?? "");
	const [isArtist, duration] = await Promise.all([isOfficialArtist(videoId, author, { current: currentVideoId }), playerContainer.getDuration()]);
	if (isArtist) return;
	const { [videoId]: video_history_entry } = getVideoHistory(registry.stateManager.getStateAPI("videoHistory"));
	if (video_history_entry && video_history_entry.status === "watching" && video_history_entry.timestamp > 0) {
		({ timestamp: lastSavedTimestamp } = video_history_entry);
		if (resumeType === "automatic") {
			if (video_history_entry.timestamp >= duration) return;
			try {
				await playerContainer.playVideo?.();
				void playerContainer.seekTo(video_history_entry.timestamp, true);
			} catch {}
		} else createResumePrompt(video_history_entry, playerContainer);
	} else if (video_history_entry && video_history_entry.status === "watched") {
		hasMarkedWatched = true;
	}
	const videoPlayerTimeUpdateListener = async () => {
		const now = Date.now();
		if (now - lastSave < SAVE_INTERVAL) return;
		const currentTime = await playerContainer.getCurrentTime();
		if (currentTime < 1) return;
		if (Math.abs(currentTime - lastSavedTimestamp) < 1) return;
		lastSave = now;
		lastSavedTimestamp = currentTime;
		const isWatched = duration - currentTime < END_TOLERANCE;
		if (isWatched && hasMarkedWatched) return;
		if (isWatched) hasMarkedWatched = true;
		setVideoHistory(videoId, currentTime, isWatched ? "watched" : "watching", registry.stateManager.getStateAPI("videoHistory"));
	};
	eventManager.addEventListener(videoElement, "timeupdate", () => void videoPlayerTimeUpdateListener(), "videoHistory");
	eventManager.addEventListener(videoElement, "pause", () => void videoPlayerTimeUpdateListener(), "videoHistory");
	eventManager.addEventListener(videoElement, "ended", () => void videoPlayerTimeUpdateListener(), "videoHistory");
}
function isLikelyArtistChannel(author: string): boolean {
	return author.endsWith(" - Topic");
}
async function isOfficialArtist(
	videoId: Brand<string, "videoId">,
	author: Brand<string, "author">,
	currentVideoIdRef: { current: Nullable<string> }
) {
	if (artistChannelCache.size > 500) artistChannelCache.clear();
	if (artistChannelCache.has(author)) return artistChannelCache.get(author)!;

	if (isLikelyArtistChannel(author)) {
		artistChannelCache.set(author, true);
		return true;
	}
	await waitForElement("#owner #upload-info #channel-name", 50);
	const isOfficialArtistChannel =
		(await waitForElement(
			"#owner #upload-info #channel-name svg path[d='M9.03 2.242 8.272 3H7.2A4.2 4.2 0 003 7.2v1.072l-.758.758a4.2 4.2 0 000 5.94l.758.758V16.8A4.2 4.2 0 007.2 21h1.072l.758.758a4.2 4.2 0 005.94 0l.758-.758H16.8a4.2 4.2 0 004.2-4.2v-1.072l.758-.758a4.2 4.2 0 000-5.94L21 8.272V7.2A4.2 4.2 0 0016.8 3h-1.072l-.758-.758a4.2 4.2 0 00-5.94 0Zm7.73 6.638a.5.5 0 01.241.427v1.743a.256.256 0 01-.386.219L14.001 9.7v4.55a2.75 2.75 0 11-2-2.646V6.888a.5.5 0 01.759-.428l4 2.42Z']",
			50
		)) !== null;
	if (currentVideoIdRef.current !== videoId) return false;
	artistChannelCache.set(author, isOfficialArtistChannel);
	return isOfficialArtistChannel;
}
function resetState() {
	if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
	animationFrameId = null;
	start = null;
	lastSave = 0;
	lastSavedTimestamp = 0;
	hasMarkedWatched = false;
	eventManager.removeEventListeners("videoHistory");
}
async function waitForVideoChange(playerContainer: YouTubePlayerDiv, timeout = 5000): Promise<Nullable<VideoId>> {
	const videoEl = await waitForElement<HTMLVideoElement>("video.video-stream.html5-main-video", timeout);
	if (!videoEl) return null;
	const start = Date.now();
	let { currentSrc: lastSrc } = videoEl;
	while (Date.now() - start < timeout) {
		const { currentSrc } = videoEl;
		if (currentSrc && currentSrc !== lastSrc) {
			lastSrc = currentSrc;
			const data = await playerContainer.getVideoData();
			if (data.video_id && data.video_id !== currentVideoId) return createVideoId(data.video_id);
		}
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
	const fallback = await playerContainer.getVideoData();
	if (fallback.video_id && fallback.video_id !== currentVideoId) return createVideoId(fallback.video_id);
	return null;
}
