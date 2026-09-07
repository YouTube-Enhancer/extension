import type { VideoHistoryEntry, VideoHistoryResumeType } from "@/src/features/videoHistory/types";

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
import { isWatchPage } from "@/src/utils/url";

import { OFFICIAL_ARTIST_BADGE_SELECTOR } from "./constants";
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
	/**
	 * onNavigate receives the navigation signature, such as "watch:VIDEO_ID", rather than a "start" or "finish" event
	 * type, and the registry runs it once per navigation. Both halves therefore happen here: the prompt of the video
	 * being left is dropped, then the video being entered is picked up.
	 */
	onNavigate: async ({ resumeType }) => {
		document.getElementById(promptId)?.remove();
		await handleVideoChange(resumeType);
	},
	persistState: true,
	state: {
		storage: {}
	}
});
async function handleVideoChange(resumeType: VideoHistoryResumeType) {
	// At start-up the player is not always in the document yet, and nothing runs this again until the next
	// navigation, so it is waited for rather than looked up once.
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player", 15000);
	if (!playerContainer) return;
	// The first read of a page can still see an empty player, the video played before a navigation, or a
	// pre-roll ad, whose id would become the history key; wait for the video the page is about instead. After an
	// in-page navigation the same applies: the next id the player reports is the pre-roll's when one plays, and on
	// a slow load still the previous video's, and nothing runs this again for the video that follows.
	const playerVideoData = await waitForPlayerVideoData(playerContainer);
	// If the video is live return
	if (playerVideoData.isLive) return;
	const { author: rawAuthor } = playerVideoData;
	if (!playerVideoData.video_id) return;
	const videoId = createVideoId(playerVideoData.video_id);
	if (currentVideoId === videoId) return;
	currentVideoId = videoId;
	resetState();
	// Leaving a Mix for a plain watch page has YouTube rebuild the player, and the new video element lands a moment
	// after the player already reports the new video, so it is waited for rather than looked up once.
	const videoElement = await waitForElement<HTMLVideoElement>("div#movie_player video.video-stream.html5-main-video", 15000);
	if (!videoElement || currentVideoId !== videoId) return;
	const author = createAuthor(rawAuthor ?? "");
	const [isArtist, duration] = await Promise.all([isOfficialArtist(videoId, author, { current: currentVideoId }), playerContainer.getDuration()]);
	if (isArtist) return;
	const { [videoId]: video_history_entry } = getVideoHistory(registry.stateManager.getStateAPI("videoHistory"));
	if (video_history_entry && video_history_entry.status === "watching" && video_history_entry.timestamp > 0) {
		({ timestamp: lastSavedTimestamp } = video_history_entry);
		if (resumeType === "automatic") {
			if (video_history_entry.timestamp >= duration) return;
			try {
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
	// On a fresh page the owner row renders after the player, and right after an in-page navigation it still names the
	// previous video's channel, whose badge would be taken for this one's. The badge is only read once the row names
	// the channel the player reports; a row that never does leaves the video tracked, the lesser error.
	const ownerRowNamesChannel = await waitForOwnerRow(author, 3000);
	const isOfficialArtistChannel = ownerRowNamesChannel && document.querySelector(OFFICIAL_ARTIST_BADGE_SELECTOR) !== null;
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
/** Resolves true once the owner row's channel name is `author`, or false after `timeout`. */
async function waitForOwnerRow(author: string, timeout: number): Promise<boolean> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const channelName = document.querySelector("#owner #upload-info #channel-name")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
		if (author && channelName.includes(author)) return true;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	return false;
}
/** Resolves with the player's video data once it is the video the URL names and no ad is showing, or after `timeout`. */
async function waitForPlayerVideoData(playerContainer: YouTubePlayerDiv, timeout = 60000) {
	const start = Date.now();
	for (;;) {
		const data = await playerContainer.getVideoData();
		const urlVideoId = isWatchPage() ? new URLSearchParams(window.location.search).get("v") : null;
		const holdsPageVideo = !!data.video_id && (!urlVideoId || data.video_id === urlVideoId);
		if ((holdsPageVideo && !playerContainer.classList.contains("ad-showing")) || Date.now() - start >= timeout) return data;
		await new Promise((resolve) => setTimeout(resolve, 200));
	}
}
