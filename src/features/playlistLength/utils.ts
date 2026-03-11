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
const selectFirstVisible = (...selectors: string[]) =>
	selectors.map((s) => document.querySelector<HTMLElement>(s)).find((el) => el?.clientWidth ?? 0 > 0) || null;
export const getHeaderSelectors = () => {
	const playlistSelectors = [
		IMMERSIVE_HEADER_SELECTOR,
		NO_PADDING_HEADER_SELECTOR,
		`${CINEMATIC_HEADER_SELECTOR} .yt-page-header-view-model__page-header-content`
	];
	const playlist =
		playlistSelectors.find((selector) => {
			const el = document.querySelector<HTMLElement>(selector);
			return el?.clientWidth ?? 0 > 0;
		}) ?? NO_PADDING_HEADER_SELECTOR;
	const watch =
		isNewYouTubeVideoLayout() ?
			"#page-manager > ytd-watch-grid #playlist #header-contents"
		:	"#page-manager > ytd-watch-flexy #playlist #header-contents";

	return { playlist, watch } as const satisfies { playlist: string; watch: string };
};
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
	const headerContents = isWatchPage() ? document.querySelector(watch) : selectFirstVisible(playlist);
	if (!headerContents) return null;
	document.querySelector("#yte-playlist-length-ui")?.remove();
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
			backgroundColor: "var(--yt-spec-additive-background)",
			border: "1px solid var(--yt-spec-outline)",
			borderRadius: "10px",
			height: "48px",
			marginBottom: "10px",
			overflow: "hidden",
			position: "relative",
			...conditionalStyles({
				condition: pageType === "watch",
				top: "50%",
				transform: "translateX(-6px)",
				width: "100%"
			}),
			...conditionalStyles({
				condition: pageType === "playlist",
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
			color: pageType === "watch" ? "var(--yt-spec-text-primary)" : "var(--yt-spec-overlay-text-primary)",
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
			backgroundColor: "var(--yt-spec-button-chip-background-hover)",
			border: "1px solid var(--yt-spec-outline)",
			borderRadius: "6px",
			bottom: "0px",
			color: pageType === "watch" ? "var(--yt-spec-text-primary)" : "var(--yt-spec-overlay-text-primary)",
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
		const watchedPercentage = Number.isFinite(totalTimeSeconds) ? Math.floor((watchedTimeSeconds / totalTimeSeconds) * 100) : 0;
		watchedProgressBar.style.width = `${watchedPercentage}%`;
		videoTimeDisplay.textContent = `${formatDuration(watchedTimeSeconds)} / ${formatDuration(totalTimeSeconds)} (- ${formatDuration(totalTimeSeconds - watchedTimeSeconds)})`;
		percentageWatched.textContent = `${watchedPercentage}%`;
	};
	wrapper.title = window.i18nextInstance.t((translations) => translations.pages.content.features.playlistLength.title);
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
	let totalTimeSeconds = 0;
	if (playlistLengthGetMethod === "api") {
		const playlistId = getPlaylistId();
		if (!playlistId) return { totalTimeSeconds: 0, watchedTimeSeconds: 0 };
		// Return cached duration if available
		if (window.cachedPlaylistDuration?.playlistId === playlistId) {
			({
				cachedPlaylistDuration: { totalTimeSeconds }
			} = window);
		} else {
			totalTimeSeconds = await getDurationFromAPI(playlistId);
			// Cache the duration
			window.cachedPlaylistDuration = { playlistId, totalTimeSeconds };
		}
	} else if (playlistLengthGetMethod === "html") {
		({ totalTimeSeconds } = getDurationAndWatchedTimeHTML({ pageType, playlistItemsVideoDetails, playlistWatchTimeGetMethod }));
	}
	const watchedTimeSeconds = calculateWatchedTime({ pageType, playlistItemsVideoDetails, playlistWatchTimeGetMethod });
	return { totalTimeSeconds, watchedTimeSeconds };
}
export function getPlaylistId(): null | string {
	const playlistId = new URLSearchParams(window.location.search).get("list");
	return playlistId;
}
function getPlaylistItems(selector: string): HTMLElement[] {
	const el = document.querySelector(selector);
	return el ? (Array.from(el.children) as HTMLElement[]) : [];
}
export const getPlaylistItemsFromWatchPage = () =>
	getPlaylistItems(
		isNewYouTubeVideoLayout() ? "#page-manager > ytd-watch-grid #playlist #items" : "#page-manager > ytd-watch-flexy #playlist #items"
	);
export const getPlaylistItemsFromPlaylistPage = () => getPlaylistItems("ytd-playlist-video-list-renderer div#contents");
export function getPlaylistItemsWatchedProgress(playlistItems: HTMLElement[]): VideoDetails[] {
	return playlistItems.map(getVideoDetails);
}
export async function initializePlaylistLength({
	pageType,
	playlistLengthGetMethod,
	playlistWatchTimeGetMethod
}: PlaylistLengthParameters): Promise<Nullable<MutationObserver>> {
	const { playlist, watch } = getHeaderSelectors();
	const headerContents = isWatchPage() ? document.querySelector(watch) : selectFirstVisible(playlist);
	if (!headerContents) return null;
	const videoElement = getVideoElement();
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
		const videoElement = getVideoElement();
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

function calculateWatchedTime({ pageType, playlistItemsVideoDetails, playlistWatchTimeGetMethod }: WatchTimeParameters): number {
	if (pageType === "watch") {
		const playlistItemsWithoutCurrentVideo = playlistItemsVideoDetails.filter((video) => video.videoId !== getCurrentVideoId());
		return (
			playlistItemsWithoutCurrentVideo.reduce(
				(total, video) => total + (playlistWatchTimeGetMethod === "youtube" ? video.progress : video.duration),
				0
			) + getCurrentVideoTime()
		);
	} else {
		return playlistItemsVideoDetails.reduce((total, video) => total + video.progress, 0);
	}
}
const getVideoElement = () => document.querySelector<HTMLVideoElement>("video");
function getCurrentVideoId() {
	const videoId = new URLSearchParams(window.location.search).get("v");
	return videoId;
}
function getCurrentVideoTime() {
	return getVideoElement()?.currentTime ?? 0;
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
		let feed = await youtube.getPlaylist(playlistId);
		let totalSeconds = 0;
		for (const video of feed.videos) {
			const playlistVideo = video as PlaylistVideo;
			if (playlistVideo?.duration?.seconds) {
				totalSeconds += playlistVideo.duration.seconds;
			}
		}
		while (feed.has_continuation) {
			for (const video of feed.videos) {
				const playlistVideo = video as PlaylistVideo;
				if (playlistVideo?.duration?.seconds) {
					totalSeconds += playlistVideo.duration.seconds;
				}
			}
			feed = await feed.getContinuation();
		}
		return totalSeconds;
	} catch (error) {
		throw new Error(`Error fetching playlist duration:`, {
			cause: error
		});
	}
}
function getVideoDetails(videoElement: Element): VideoDetails {
	return {
		duration: getVideoDurationInSeconds(videoElement),
		progress: getVideoProgress(videoElement),
		videoId: getVideoId(videoElement)
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
function getVideoProgress(videoElement: Element): number {
	const duration = getVideoDurationInSeconds(videoElement);
	const percent = getWatchedPercentage(videoElement);
	return Math.floor((percent / 100) * duration);
}
function getWatchedPercentage(videoElement: Element): number {
	const progressBar = videoElement.querySelector<HTMLElement>(".ytd-thumbnail-overlay-resume-playback-renderer,#progress");
	if (!progressBar) return 0;
	return parseFloat(progressBar.style.width) || 0;
}
