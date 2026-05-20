import type PlaylistVideo from "youtubei.js/dist/src/parser/classes/PlaylistVideo";

import { Innertube } from "youtubei.js/web";

import type { PlaylistLengthGetMethod, PlaylistWatchTimeGetMethod } from "@/src/features/playlistLength/types";
import type { Nullable, VideoDetails } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createStyledElement } from "@/src/utils/dom/elements";
import { playlistItemsSelector } from "@/src/utils/dom/selectors";
import { waitForAllElements, waitForElement } from "@/src/utils/dom/wait";
import { formatDuration, timeStringToSeconds } from "@/src/utils/format/time";
import { conditionalStyles } from "@/src/utils/style";
import { isNewYouTubeVideoLayout, isWatchPage } from "@/src/utils/url";
const NO_PADDING_HEADER_SELECTOR = "yt-page-header-view-model.ytPageHeaderViewModelHost.ytPageHeaderViewModelNoPadding";
const CINEMATIC_HEADER_SELECTOR =
	"yt-page-header-renderer yt-page-header-view-model.ytPageHeaderViewModelHost.ytPageHeaderViewModelCinematicContainerOverflowBoundary.ytPageHeaderViewModelDisplayAsSidebar .ytPageHeaderViewModelContent";
const selectFirstWithWidth = (...selectors: string[]): HTMLElement | null => {
	for (const selector of selectors) {
		const elements = document.querySelectorAll<HTMLElement>(selector);
		for (const el of elements) {
			if ((el.clientWidth ?? 0) > 0) return el;
		}
	}
	return null;
};
export const getHeaderSelectors = () => {
	const playlistSelectors = [NO_PADDING_HEADER_SELECTOR, CINEMATIC_HEADER_SELECTOR];
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
	const headerContents = isWatchPage() ? document.querySelector(watch) : selectFirstWithWidth(playlist);
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
			backgroundColor: "var(--yt-sys-color-baseline--overlay-additive-background)",
			border: "1px solid var(--yt-sys-color-baseline--outline)",
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
				marginTop: "24px",
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
			color: pageType === "watch" ? "var(--yt-sys-color-baseline--text-primary)" : "var(--yt-sys-color-baseline--overlay-text-primary)",
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
			backgroundColor: "var(--yt-sys-color-baseline--button-chip-background-hover)",
			border: "1px solid var(--yt-sys-color-baseline--outline)",
			borderRadius: "6px",
			bottom: "0px",
			color: pageType === "watch" ? "var(--yt-sys-color-baseline--text-primary)" : "var(--yt-sys-color-baseline--overlay-text-primary)",
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
		const safeTotal = Number.isFinite(totalTimeSeconds) ? totalTimeSeconds : 0;
		const safeWatched = Number.isFinite(watchedTimeSeconds) ? watchedTimeSeconds : 0;
		const watchedPercentage = safeTotal > 0 ? Math.floor((safeWatched / safeTotal) * 100) : 0;
		watchedProgressBar.style.width = `${watchedPercentage}%`;
		videoTimeDisplay.textContent = `${formatDuration(safeWatched)} / ${formatDuration(safeTotal)} (- ${formatDuration(safeTotal - safeWatched)})`;
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
export function getPlaylistId(): Nullable<string> {
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
	let headerContents = isWatchPage() ? document.querySelector(watch) : selectFirstWithWidth(playlist);
	if (!headerContents) {
		headerContents = await waitForElement(isWatchPage() ? watch : playlist);
	}
	if (!headerContents) return null;
	const videoElement = getVideoElement();
	let playlistItemsElement = document.querySelector(playlistItemsSelector());
	if (!playlistItemsElement) playlistItemsElement = await waitForElement(playlistItemsSelector());
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
	let lastPlaylistLength: Nullable<number> = null;
	let lastUpdate: Nullable<{ total: number; watched: number }> = null;
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
		const newTotal = Math.floor(data.totalTimeSeconds / playerSpeed);
		const newWatched = Math.floor(data.watchedTimeSeconds / playerSpeed);
		if (lastUpdate && lastUpdate.total === newTotal && lastUpdate.watched === newWatched) {
			return;
		}
		lastUpdate = { total: newTotal, watched: newWatched };
		update({
			totalTimeSeconds: newTotal,
			watchedTimeSeconds: newWatched
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
function getVideoId(videoElement: Element): Nullable<string> {
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
