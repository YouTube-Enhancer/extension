import type { Nullable, PlaylistLengthGetMethod, PlaylistWatchTimeGetMethod, VideoDetails, YouTubePlaylistItem } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import {
	conditionalStyles,
	createStyledElement,
	formatDuration,
	isNewYouTubeVideoLayout,
	isWatchPage,
	parseISO8601Duration,
	timeStringToSeconds,
	waitForAllElements
} from "@/src/utils/utilities";
import { z } from "zod";

export const headerSelector = () =>
	isWatchPage() ?
		isNewYouTubeVideoLayout() ? "#page-manager > ytd-watch-grid #playlist #header-contents"
		:	"#page-manager > ytd-watch-flexy #playlist #header-contents"
	:	"ytd-playlist-header-renderer div.immersive-header-container div.immersive-header-content";
export const playlistItemsSelector = () =>
	isWatchPage() ? "ytd-playlist-panel-renderer:not([hidden]) div#container div#items" : "ytd-playlist-video-list-renderer div#contents";
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const youtubePlaylistResponseSchema = z.object({
	items: z.array(z.object({ contentDetails: z.object({ videoId: z.string() }) })),
	nextPageToken: z.string().optional()
});
const youtubeVideoDurationResponseSchema = z.object({
	items: z.array(z.object({ contentDetails: z.object({ duration: z.string() }) }))
});
const youtubeDataAPIErrorSchema = z.object({
	error: z.object({
		code: z.number(),
		errors: z.array(
			z.object({
				reason: z.string()
			})
		),
		message: z.string()
	})
});
export async function fetchPlaylistVideos(playlistId: string, apiKey: string): Promise<YouTubePlaylistItem[]> {
	const playlistItemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&fields=items/contentDetails/videoId,nextPageToken&key=${apiKey}&playlistId=${playlistId}`;
	let nextPageToken: string | undefined = undefined;
	const allVideos: YouTubePlaylistItem[] = [];
	try {
		do {
			const playlistResponse = await fetch(`${playlistItemsUrl}${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`);
			const data = await playlistResponse.json();
			const youtubeDataAPIParsed = youtubeDataAPIErrorSchema.safeParse(data);
			if (youtubeDataAPIParsed.success && youtubeDataAPIParsed.data.error) {
				switch (youtubeDataAPIParsed.data.error.code) {
					case 403:
						throw new Error("YouTube Enhancer (YouTube Data API V3): Quota exceeded. Please try again later.");
					case 404:
						throw new Error("YouTube Enhancer (YouTube Data API V3): Playlist not found. Please try again later.");
					default:
						throw new Error("YouTube Enhancer (YouTube Data API V3): Unknown error. Please try again later.");
				}
			}
			const parsedData = youtubePlaylistResponseSchema.safeParse(data);
			if (!parsedData.success) throw new Error("Failed to parse playlist response.");
			if (parsedData.data.items && parsedData.data.items.length === 0) throw new Error("No items found in playlist.");
			nextPageToken = parsedData.data.nextPageToken || "";
			allVideos.push(...parsedData.data.items);
			await delay(40); // Adding delay between requests to avoid rate limiting
		} while (nextPageToken);
		return allVideos;
	} catch (error) {
		throw new Error(`Error fetching playlist videos: ${error}`);
	}
}
export async function getPlaylistDuration(playlistVideos: YouTubePlaylistItem[], apiKey: string) {
	const videoIds = playlistVideos.map((video) => video.contentDetails.videoId);
	try {
		const videoDurationPromises = videoIds.map(async (videoId) => {
			await delay(1); // Adding delay between requests to avoid rate limiting
			return getVideoDuration(videoId, apiKey);
		});
		const videoDurations = await Promise.all(videoDurationPromises);
		const totalDuration = videoDurations.reduce((acc, duration) => acc + duration, 0);
		return totalDuration;
	} catch (error) {
		throw new Error(`Error fetching playlist duration: ${error}`);
	}
}
export async function getVideoDuration(videoId: string, apiKey: string) {
	const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&fields=items/contentDetails/duration&key=${apiKey}&id=${videoId}`;
	try {
		const videoResponse = await fetch(videoDetailsUrl);
		const data = await videoResponse.json();
		const youtubeDataAPIParsed = youtubeDataAPIErrorSchema.safeParse(data);
		const parsedData = youtubeVideoDurationResponseSchema.safeParse(data);
		if (!parsedData.success) throw new Error("Failed to parse video duration response.");
		if (
			youtubeDataAPIParsed.success &&
			youtubeDataAPIParsed.data.error &&
			youtubeDataAPIParsed.data.error.code === 403 &&
			youtubeDataAPIParsed.data.error.errors.find((e) => e.reason === "quotaExceeded")
		) {
			throw new Error("Quota exceeded. Please try again later.");
		}
		const videoDuration = parsedData.data.items.at(0)?.contentDetails?.duration;
		if (!videoDuration) throw new Error("Failed to get video duration.");
		return parseISO8601Duration(videoDuration);
	} catch (error) {
		throw new Error(`Error getting video duration: ${error}`);
	}
}
export function getPlaylistItemsFromWatchPage() {
	const playlistItems = document.querySelector(
		isNewYouTubeVideoLayout() ? "#page-manager > ytd-watch-grid #playlist #items" : "#page-manager > ytd-watch-flexy #playlist #items"
	);
	if (!playlistItems) return [];
	const { children: videos } = playlistItems;
	return Array.from(videos) as HTMLElement[];
}
export function getPlaylistItemsFromPlaylistPage() {
	const playlistItems = document.querySelector("ytd-playlist-video-list-renderer div#contents");
	if (!playlistItems) return [];
	const { children: videos } = playlistItems;
	return Array.from(videos) as HTMLElement[];
}
export function getPlaylistItemsWatchedProgress(playlistItems: HTMLElement[]): VideoDetails[] {
	return playlistItems.map(getVideoDetails);
}
function getWatchedPercentage(videoElement: Element): number {
	const progressBar = videoElement.querySelector<HTMLElement>(".ytd-thumbnail-overlay-resume-playback-renderer,#progress");
	if (!progressBar) return 0;
	return parseFloat(progressBar.style.width) || 0;
}
function getVideoDurationInSeconds(videoElement: Element): number {
	const durationElement = videoElement.querySelector<HTMLElement>("ytd-thumbnail-overlay-time-status-renderer > div#time-status");
	if (!durationElement || !durationElement.textContent?.trim()) return 0;
	return timeStringToSeconds(durationElement.textContent.trim());
}
function findIndexById(array: VideoDetails[], id: string): number {
	return array.findIndex((video) => video.videoId === id);
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
function getVideoId(videoElement: Element): null | string {
	const videoIdElement = videoElement.querySelector<HTMLAnchorElement>("a#thumbnail");
	if (!videoIdElement) return null;
	const url = new URL(`https://youtube.com${videoIdElement.href}`);
	return url.searchParams.get("v");
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
type VideoTimeState = { totalTimeSeconds: number; watchedTimeSeconds: number };
type PageType = "playlist" | "watch";
type PlaylistLengthParameters = {
	apiKey: string;
	pageType: PageType;
	playlistLengthGetMethod: PlaylistLengthGetMethod;
	playlistWatchTimeGetMethod: PlaylistWatchTimeGetMethod;
};
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
			backgroundColor: "rgb(43, 43, 43)",
			border: "2px solid rgb(84, 84, 84)",
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
		styles: { backgroundColor: "#522628", borderRadius: "8px", height: "100%" }
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
			backgroundColor: "#3f3f3f",
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
export async function appendPlaylistLengthUIElement(playlistLengthUIElement: HTMLDivElement) {
	await waitForAllElements([headerSelector()]);
	const headerContents = document.querySelector(headerSelector());
	if (!headerContents) return null;
	if (document.querySelector("#yte-playlist-length-ui") !== null) {
		document.querySelector("#yte-playlist-length-ui")?.remove();
	}
	headerContents.append(playlistLengthUIElement);
}
async function getDurationFromAPI(playlistId: string, apiKey: string): Promise<number> {
	const playlistVideos = await fetchPlaylistVideos(playlistId, apiKey);
	return getPlaylistDuration(playlistVideos, apiKey);
}
type WatchTimeParameters = {
	pageType: PageType;
	playlistItemsVideoDetails: VideoDetails[];
	playlistWatchTimeGetMethod: PlaylistWatchTimeGetMethod;
};

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
function getDurationAndWatchedTimeHTML({ pageType, playlistItemsVideoDetails, playlistWatchTimeGetMethod }: WatchTimeParameters): VideoTimeState {
	const totalTimeSeconds = playlistItemsVideoDetails.reduce((total, video) => total + video.duration, 0);
	const watchedTimeSeconds = calculateWatchedTime({ pageType, playlistItemsVideoDetails, playlistWatchTimeGetMethod });
	return { totalTimeSeconds, watchedTimeSeconds };
}
export async function getDataForPlaylistLengthUIElement({
	apiKey,
	pageType,
	playlistLengthGetMethod,
	playlistWatchTimeGetMethod
}: PlaylistLengthParameters): Promise<VideoTimeState> {
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
	const playlistItems = pageType === "watch" ? getPlaylistItemsFromWatchPage() : getPlaylistItemsFromPlaylistPage();
	const playlistItemsVideoDetails = getPlaylistItemsWatchedProgress(playlistItems);
	let totalTimeSeconds: number;
	if (playlistLengthGetMethod === "api") {
		totalTimeSeconds = await getDurationFromAPI(playlistId, apiKey);
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
function getPlaylistId() {
	const playlistId = new URLSearchParams(window.location.search).get("list");
	return playlistId;
}
function getCurrentVideoId() {
	const videoId = new URLSearchParams(window.location.search).get("v");
	return videoId;
}
function getCurrentVideoTime() {
	const videoElement = document.querySelector("video") as HTMLVideoElement;
	return videoElement.currentTime;
}
export async function initializePlaylistLength({
	apiKey,
	pageType,
	playlistLengthGetMethod,
	playlistWatchTimeGetMethod
}: PlaylistLengthParameters): Promise<Nullable<MutationObserver>> {
	const playlistHeader = document.querySelector(headerSelector());
	if (!playlistHeader) return null;
	let { totalTimeSeconds, watchedTimeSeconds } = await getDataForPlaylistLengthUIElement({
		apiKey,
		pageType,
		playlistLengthGetMethod,
		playlistWatchTimeGetMethod
	});
	if (playlistHeader) {
		const videoElement = document.querySelector<HTMLVideoElement>("video");
		const playlistItemsElement = document.querySelector(playlistItemsSelector());
		if (!playlistItemsElement) return null;
		const { playbackRate: playerSpeed = 1 } = videoElement || {};
		const { element, update } = createPlaylistLengthUIElement(
			{
				totalTimeSeconds: Math.floor(totalTimeSeconds / playerSpeed),
				watchedTimeSeconds: Math.floor(watchedTimeSeconds / playerSpeed)
			},
			pageType
		);
		await appendPlaylistLengthUIElement(element);
		const documentObserver = new MutationObserver(() => {
			void (async () => {
				const videoElement = document.querySelector<HTMLVideoElement>("video");
				const { playbackRate: playerSpeed = 1 } = videoElement || {};
				({ totalTimeSeconds, watchedTimeSeconds } = await getDataForPlaylistLengthUIElement({
					apiKey,
					pageType,
					playlistLengthGetMethod,
					playlistWatchTimeGetMethod
				}));
				update({
					totalTimeSeconds: Math.floor(totalTimeSeconds / playerSpeed),
					watchedTimeSeconds: Math.floor(watchedTimeSeconds / playerSpeed)
				});
			})();
		});
		documentObserver.observe(document.documentElement, { childList: true, subtree: true });
		if (videoElement)
			eventManager.addEventListener(
				videoElement,
				"timeupdate",
				() => {
					void (async () => {
						const videoElement = document.querySelector<HTMLVideoElement>("video");
						const { playbackRate: playerSpeed = 1 } = videoElement || {};
						({ totalTimeSeconds, watchedTimeSeconds } = await getDataForPlaylistLengthUIElement({
							apiKey,
							pageType,
							playlistLengthGetMethod,
							playlistWatchTimeGetMethod
						}));
						update({
							totalTimeSeconds: Math.floor(totalTimeSeconds / playerSpeed),
							watchedTimeSeconds: Math.floor(watchedTimeSeconds / playerSpeed)
						});
					})();
				},
				"playlistLength"
			);
		return documentObserver;
	}
	return null;
}
