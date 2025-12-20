import type PlaylistVideo from "youtubei.js/dist/src/parser/classes/PlaylistVideo";

import { Innertube } from "youtubei.js/web";

import type { Nullable, PlaylistLengthGetMethod, PlaylistWatchTimeGetMethod, VideoDetails } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import {
	conditionalStyles,
	createStyledElement,
	formatDuration,
	isNewYouTubeVideoLayout,
	isWatchPage,
	timeStringToSeconds,
	waitForAllElements
} from "@/src/utils/utilities";
const NO_PADDING_HEADER_SELECTOR = "yt-page-header-view-model.yt-page-header-view-model.yt-page-header-view-model--no-padding";
const CINEMATIC_HEADER_SELECTOR =
	"yt-page-header-renderer yt-page-header-view-model.yt-page-header-view-model--cinematic-container-overflow-boundary";
const IMMERSIVE_HEADER_SELECTOR = "ytd-playlist-header-renderer .immersive-header-container .immersive-header-content";
export const getHeaderSelectors = () =>
	({
		playlist: (() => {
			const noPaddingHeader = document.querySelector(NO_PADDING_HEADER_SELECTOR);
			const cinematicHeader = document.querySelector(CINEMATIC_HEADER_SELECTOR);
			const immersiveHeader = document.querySelector(IMMERSIVE_HEADER_SELECTOR);
			if (immersiveHeader && immersiveHeader.clientWidth > 0) return IMMERSIVE_HEADER_SELECTOR;
			if (noPaddingHeader && noPaddingHeader.clientWidth > 0) return NO_PADDING_HEADER_SELECTOR;
			if (cinematicHeader && cinematicHeader.clientWidth > 0) return `${CINEMATIC_HEADER_SELECTOR} .yt-page-header-view-model__page-header-content`;
			return NO_PADDING_HEADER_SELECTOR;
		})(),
		watch:
			isNewYouTubeVideoLayout() ?
				"#page-manager > ytd-watch-grid #playlist #header-contents"
			:	"#page-manager > ytd-watch-flexy #playlist #header-contents"
	}) as const satisfies { playlist: string; watch: string };
export const playlistItemsSelector = () =>
	isWatchPage() ? "ytd-playlist-panel-renderer:not([hidden]) div#container div#items" : "ytd-playlist-video-list-renderer div#contents";
export type PlaylistLengthParameters = {
	pageType: PageType;
	playlistLengthGetMethod: PlaylistLengthGetMethod;
	playlistWatchTimeGetMethod: PlaylistWatchTimeGetMethod;
};
type PageType = "playlist" | "watch";
type VideoTimeState = { totalTimeSeconds: number; watchedTimeSeconds: number };
type WatchTimeParameters = {
	pageType: PageType;
	playlistItemsVideoDetails: VideoDetails[];
	playlistWatchTimeGetMethod: PlaylistWatchTimeGetMethod;
};
export async function appendPlaylistLengthUIElement(playlistLengthUIElement: HTMLDivElement) {
	const { playlist, watch } = getHeaderSelectors();
	await waitForAllElements([isWatchPage() ? watch : playlist]);
	const headerContents =
		isWatchPage() ? document.querySelector(watch) : Array.from(document.querySelectorAll(playlist))?.find((el) => el.clientWidth > 0);
	if (!headerContents) return null;
	if (document.querySelector("#yte-playlist-length-ui") !== null) {
		document.querySelector("#yte-playlist-length-ui")?.remove();
	}
	headerContents.append(playlistLengthUIElement);
}
export function createPlaylistLengthUIElement(
	initialState: VideoTimeState,
	pageType: PageType
): {
	element: HTMLDivElement;
	update: (state: VideoTimeState) => void;
} {
	const wrapper = createStyledElement({
		elementId: "yte-playlist-length-ui",
		elementType: "div",
		styles: {
			backgroundColor: "var(--yt-spec-badge-chip-background)",
			border: "1px solid var(--yt-spec-10-percent-layer)",
			borderRadius: "10px",
			height: "48px",
			marginBottom: "10px",
			overflow: "hidden",
			position: "relative",
			transform: "translate(-50%, 0%)",
			...conditionalStyles({
				condition: pageType === "watch",
				left: "48.8%",
				top: "50%",
				width: "100%"
			}),
			...conditionalStyles({
				condition: pageType === "playlist",
				left: "50%",
				marginTop: "10px",
				width: "99%"
			})
		}
	});
	const watchedProgressBar = createStyledElement({
		elementId: "yte-playlist-length-ui-watchedProgressBar",
		elementType: "div",
		styles: { backgroundColor: "#9E2A2A", borderRadius: "8px", height: "100%" }
	});
	const videoTimeDisplay = createStyledElement({
		elementId: "yte-playlist-length-ui-times",
		elementType: "div",
		styles: {
			bottom: "15px",
			color: "var(--yt-spec-text-primary)",
			fontSize: "15px",
			marginLeft: "19px",
			position: "absolute"
		}
	});
	videoTimeDisplay.textContent = `${formatDuration(initialState.watchedTimeSeconds)} / ${formatDuration(initialState.totalTimeSeconds)} (- ${formatDuration(initialState.totalTimeSeconds - initialState.watchedTimeSeconds)})`;
	const percentageWatched = createStyledElement({
		elementId: "yte-playlist-length-ui-percentageWatched",
		elementType: "div",
		styles: {
			backgroundColor: "var(--yt-spec-brand-background-primary)",
			border: "1px solid var(--yt-spec-10-percent-layer)",
			borderRadius: "6px",
			bottom: "0px",
			color: "var(--yt-spec-text-primary)",
			fontSize: "15px",
			padding: "4px 8px",
			position: "absolute",
			right: "0px",
			transform: "translateX(-24%) translateY(-11px)"
		}
	});
	percentageWatched.textContent = `0%`;
	wrapper.append(watchedProgressBar, percentageWatched, videoTimeDisplay);
	const updateElement = ({ totalTimeSeconds, watchedTimeSeconds }: VideoTimeState) => {
		const watchedPercentage =
			Number.isNaN(Math.floor((watchedTimeSeconds / totalTimeSeconds) * 100)) ? 0
			: Math.floor((watchedTimeSeconds / totalTimeSeconds) * 100) === Infinity ? 0
			: Math.floor((watchedTimeSeconds / totalTimeSeconds) * 100);
		watchedProgressBar.style.width = `${watchedPercentage}%`;
		videoTimeDisplay.textContent = `${formatDuration(watchedTimeSeconds)} / ${formatDuration(totalTimeSeconds)} (- ${formatDuration(totalTimeSeconds - watchedTimeSeconds)})`;
		percentageWatched.textContent = `${watchedPercentage}%`;
	};
	wrapper.title = window.i18nextInstance.t("pages.content.features.playlistLength.title");
	updateElement(initialState);
	return {
		element: wrapper,
		update: updateElement
	};
}
export async function getDataForPlaylistLengthUIElement({
	pageType,
	playlistLengthGetMethod,
	playlistWatchTimeGetMethod
}: PlaylistLengthParameters): Promise<VideoTimeState> {
	const playlistItems = pageType === "watch" ? getPlaylistItemsFromWatchPage() : getPlaylistItemsFromPlaylistPage();
	const playlistItemsVideoDetails = getPlaylistItemsWatchedProgress(playlistItems);
	let totalTimeSeconds: number;
	if (playlistLengthGetMethod === "api") {
		const playlistId = getPlaylistId();
		if (!playlistId) return { totalTimeSeconds: 0, watchedTimeSeconds: 0 };
		// Check cache
		if (playlistLengthGetMethod === "api" && window.cachedPlaylistDuration && window.cachedPlaylistDuration.playlistId === playlistId) {
			const {
				cachedPlaylistDuration: { totalTimeSeconds }
			} = window;
			const playlistItems = pageType === "watch" ? getPlaylistItemsFromWatchPage() : getPlaylistItemsFromPlaylistPage();
			const playlistItemsVideoDetails = getPlaylistItemsWatchedProgress(playlistItems);
			const watchedTimeSeconds = calculateWatchedTime({ pageType, playlistItemsVideoDetails, playlistWatchTimeGetMethod });
			return { totalTimeSeconds, watchedTimeSeconds };
		}
		totalTimeSeconds = await getDurationFromAPI(playlistId);
		// Cache the duration
		window.cachedPlaylistDuration = { playlistId, totalTimeSeconds };
	} else if (playlistLengthGetMethod === "html") {
		({ totalTimeSeconds } = getDurationAndWatchedTimeHTML({ pageType, playlistItemsVideoDetails, playlistWatchTimeGetMethod }));
	} else {
		return { totalTimeSeconds: 0, watchedTimeSeconds: 0 };
	}
	const watchedTimeSeconds = calculateWatchedTime({ pageType, playlistItemsVideoDetails, playlistWatchTimeGetMethod });
	return { totalTimeSeconds, watchedTimeSeconds };
}
export function getPlaylistId(): null | string {
	const playlistId = new URLSearchParams(window.location.search).get("list");
	return playlistId;
}
export function getPlaylistItemsFromPlaylistPage() {
	const playlistItems = document.querySelector("ytd-playlist-video-list-renderer div#contents");
	if (!playlistItems) return [];
	const { children: videos } = playlistItems;
	return Array.from(videos) as HTMLElement[];
}
export function getPlaylistItemsFromWatchPage() {
	const playlistItems = document.querySelector(
		isNewYouTubeVideoLayout() ? "#page-manager > ytd-watch-grid #playlist #items" : "#page-manager > ytd-watch-flexy #playlist #items"
	);
	if (!playlistItems) return [];
	const { children: videos } = playlistItems;
	return Array.from(videos) as HTMLElement[];
}
export function getPlaylistItemsWatchedProgress(playlistItems: HTMLElement[]): VideoDetails[] {
	return playlistItems.map(getVideoDetails);
}
export async function initializePlaylistLength({
	pageType,
	playlistLengthGetMethod,
	playlistWatchTimeGetMethod
}: PlaylistLengthParameters): Promise<Nullable<MutationObserver>> {
	const { playlist, watch } = getHeaderSelectors();
	const headerContents =
		isWatchPage() ? document.querySelector(watch) : Array.from(document.querySelectorAll(playlist))?.find((el) => el.clientWidth > 0);
	if (!headerContents) return null;
	const videoElement = document.querySelector<HTMLVideoElement>("video");
	const playlistItemsElement = document.querySelector(playlistItemsSelector());
	if (!playlistItemsElement) return null;
	const { playbackRate: playerSpeed = 1 } = videoElement || {};
	const { totalTimeSeconds, watchedTimeSeconds } = await getDataForPlaylistLengthUIElement({
		pageType,
		playlistLengthGetMethod,
		playlistWatchTimeGetMethod
	});
	const { element, update } = createPlaylistLengthUIElement(
		{
			totalTimeSeconds: Math.floor(totalTimeSeconds / playerSpeed),
			watchedTimeSeconds: Math.floor(watchedTimeSeconds / playerSpeed)
		},
		pageType
	);
	await appendPlaylistLengthUIElement(element);
	let updateTimeout: Nullable<number> = null;
	let lastPlaylistLength: null | number = null;
	const debounceDelay = 300;
	async function safeUpdate() {
		const videoElement = document.querySelector<HTMLVideoElement>("video");
		const { playbackRate: playerSpeed = 1 } = videoElement || {};
		if (playlistLengthGetMethod === "api") {
			const playlistItems = pageType === "watch" ? getPlaylistItemsFromWatchPage() : getPlaylistItemsFromPlaylistPage();
			const { length: currentLength } = playlistItems;
			if (lastPlaylistLength === null) {
				lastPlaylistLength = currentLength;
			} else if (currentLength !== lastPlaylistLength) {
				window.cachedPlaylistDuration = null;
				lastPlaylistLength = currentLength;
			}
		}
		const data = await getDataForPlaylistLengthUIElement({
			pageType,
			playlistLengthGetMethod,
			playlistWatchTimeGetMethod
		});
		update({
			totalTimeSeconds: Math.floor(data.totalTimeSeconds / playerSpeed),
			watchedTimeSeconds: Math.floor(data.watchedTimeSeconds / playerSpeed)
		});
	}
	function debouncedUpdate() {
		if (updateTimeout !== null) {
			clearTimeout(updateTimeout);
		}
		updateTimeout = window.setTimeout(() => {
			updateTimeout = null;
			void safeUpdate();
		}, debounceDelay);
	}
	const documentObserver = new MutationObserver(() => {
		debouncedUpdate();
	});
	documentObserver.observe(document.documentElement, { childList: true, subtree: true });
	if (videoElement) {
		eventManager.addEventListener(videoElement, "timeupdate", () => void safeUpdate(), "playlistLength");
	}
	return documentObserver;
}

export function sliceArrayById(array: VideoDetails[], id: string): VideoDetails[] {
	const index = findIndexById(array, id);
	if (index === -1) {
		// If the videoId is not found, return an empty array or handle it as needed
		return [];
	}
	// Slice the array from the start to the found index (inclusive)
	return array.slice(0, index);
}
function calculateWatchedTime({ pageType, playlistItemsVideoDetails, playlistWatchTimeGetMethod }: WatchTimeParameters): number {
	if (pageType === "watch") {
		const slicedItems = sliceArrayById(playlistItemsVideoDetails, getCurrentVideoId()!);
		return (
			slicedItems.reduce((total, video) => total + (playlistWatchTimeGetMethod === "youtube" ? video.progress : video.duration), 0) +
			getCurrentVideoTime()
		);
	} else {
		return playlistItemsVideoDetails.reduce((total, video) => total + video.progress, 0);
	}
}
function findIndexById(array: VideoDetails[], id: string): number {
	return array.findIndex((video) => video.videoId === id);
}
function getCurrentVideoId() {
	const videoId = new URLSearchParams(window.location.search).get("v");
	return videoId;
}
function getCurrentVideoTime() {
	const videoElement = document.querySelector("video") as HTMLVideoElement;
	return videoElement.currentTime;
}

function getDurationAndWatchedTimeHTML({ pageType, playlistItemsVideoDetails, playlistWatchTimeGetMethod }: WatchTimeParameters): VideoTimeState {
	const totalTimeSeconds = playlistItemsVideoDetails.reduce((total, video) => total + video.duration, 0);
	const watchedTimeSeconds = calculateWatchedTime({ pageType, playlistItemsVideoDetails, playlistWatchTimeGetMethod });
	return { totalTimeSeconds, watchedTimeSeconds };
}
async function getDurationFromAPI(playlistId: string): Promise<number> {
	const youtube = await Innertube.create({
		cookie: document.cookie,
		fetch: (...args) => fetch(...args)
	});

	try {
		const playlist = await youtube.getPlaylist(playlistId);

		let totalSeconds = 0;
		for (const video of playlist.videos) {
			const playlistVideo = video as PlaylistVideo;
			if (playlistVideo?.duration?.seconds) {
				totalSeconds += playlistVideo.duration.seconds;
			}
		}

		while (playlist.has_continuation) {
			const continuation = await playlist.getContinuation();
			for (const video of continuation.videos) {
				const playlistVideo = video as PlaylistVideo;
				if (playlistVideo?.duration?.seconds) {
					totalSeconds += playlistVideo.duration.seconds;
				}
			}
		}

		return totalSeconds;
	} catch (error) {
		throw new Error(`Error fetching playlist duration: ${error}`);
	}
}
function getVideoDetails(videoElement: Element): VideoDetails {
	const videoId = getVideoId(videoElement);
	const duration = getVideoDurationInSeconds(videoElement);
	const progress = Math.floor((getWatchedPercentage(videoElement) / 100) * duration);
	return {
		duration: duration,
		progress: progress,
		videoId: videoId
	};
}
function getVideoDurationInSeconds(videoElement: Element): number {
	const durationElement = videoElement.querySelector<HTMLElement>("ytd-thumbnail-overlay-time-status-renderer > div#time-status");
	if (!durationElement || !durationElement.textContent?.trim()) return 0;
	return timeStringToSeconds(durationElement.textContent.trim());
}
function getVideoId(videoElement: Element): null | string {
	const videoIdElement = videoElement.querySelector<HTMLAnchorElement>("a#thumbnail");
	if (!videoIdElement) return null;
	const url = new URL(`https://youtube.com${videoIdElement.href}`);
	return url.searchParams.get("v");
}
function getWatchedPercentage(videoElement: Element): number {
	const progressBar = videoElement.querySelector<HTMLElement>(".ytd-thumbnail-overlay-resume-playback-renderer,#progress");
	if (!progressBar) return 0;
	return parseFloat(progressBar.style.width) || 0;
}
