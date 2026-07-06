import type PlaylistVideo from "youtubei.js/dist/src/parser/classes/PlaylistVideo";

import { Innertube } from "youtubei.js/web";

import type { PlaylistLengthGetMethod, PlaylistWatchTimeGetMethod } from "@/src/features/playlistLength/types";
import type { Nullable, VideoDetails } from "@/src/types";

import { createStyledElement } from "@/src/utils/dom/elements";
import { NO_PADDING_HEADER_SELECTOR, PLAYLIST_PAGE_HEADER_SELECTORS, selectFirstWithWidth } from "@/src/utils/dom/selectors";
import { waitForAllElements } from "@/src/utils/dom/wait";
import { formatDuration, timeStringToSeconds } from "@/src/utils/format/time";
import { conditionalStyles } from "@/src/utils/style";
import { isNewYouTubeVideoLayout, isWatchPage } from "@/src/utils/url";
export const getHeaderSelectors = () => {
	const playlistSelectors = PLAYLIST_PAGE_HEADER_SELECTORS;
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
export type VideoTimeState = { totalTimeSeconds: number; watchedTimeSeconds: number };
type PageType = "playlist" | "watch";

export async function appendPlaylistLengthUIElement(playlistLengthUIElement: HTMLDivElement): Promise<boolean> {
	const { playlist, watch } = getHeaderSelectors();
	await waitForAllElements([isWatchPage() ? watch : playlist]);
	const headerContents = isWatchPage() ? document.querySelector(watch) : selectFirstWithWidth(playlist);
	if (!headerContents) return false;
	document.querySelector("#yte-playlist-length-ui")?.remove();
	headerContents.append(playlistLengthUIElement);
	return true;
}
export function calculateWatchedTime(
	pageType: PageType,
	playlistItemsVideoDetails: VideoDetails[],
	playlistWatchTimeGetMethod: PlaylistWatchTimeGetMethod
): number {
	if (pageType === "watch") {
		const playlistItemsWithoutCurrentVideo = playlistItemsVideoDetails.filter((video) => video.videoId !== getCurrentVideoId());
		return (
			playlistItemsWithoutCurrentVideo.reduce(
				(total, video) => total + (playlistWatchTimeGetMethod === "youtube" ? video.progress : video.duration),
				0
			) + getCurrentVideoTime()
		);
	}
	return playlistItemsVideoDetails.reduce((total, video) => total + video.progress, 0);
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
				marginTop:
					getPlaylistId() === "WL" ?
						window.matchMedia("(max-width: 1080px)").matches ?
							"16px"
						:	"0px"
					:	"24px",
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

export async function getDurationFromAPI(playlistId: string): Promise<number> {
	if (playlistId.startsWith("UU")) {
		throw new Error(`API not supported for playlist ID: ${playlistId}`);
	}
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

export function getPlaylistId(): Nullable<string> {
	return new URLSearchParams(window.location.search).get("list");
}

export function getPlaylistItemsFromPlaylistPage(): HTMLElement[] {
	const selectors = ["ytd-playlist-video-list-renderer div#contents", "yt-item-section-renderer div#contents"];
	for (const selector of selectors) {
		const el = document.querySelector(selector);
		if (el) {
			const children = Array.from(el.children) as HTMLElement[];
			if (children.some((child) => child.tagName === "YTD-RICH-GRID-RENDERER")) return [];
			return children;
		}
	}
	return [];
}

export function getPlaylistItemsFromWatchPage(): HTMLElement[] {
	const selector = isNewYouTubeVideoLayout() ? "#page-manager > ytd-watch-grid #playlist #items" : "#page-manager > ytd-watch-flexy #playlist #items";
	const el = document.querySelector(selector);
	return el ? (Array.from(el.children) as HTMLElement[]) : [];
}

export function getPlaylistItemsVideoDetails(playlistItems: HTMLElement[]): VideoDetails[] {
	return playlistItems.map(getVideoDetails);
}

function getCurrentVideoId(): Nullable<string> {
	return new URLSearchParams(window.location.search).get("v");
}

function getCurrentVideoTime(): number {
	return getVideoElement()?.currentTime ?? 0;
}

function getVideoDetails(videoElement: Element): VideoDetails {
	return {
		duration: getVideoDurationInSeconds(videoElement),
		progress: getVideoProgress(videoElement),
		videoId: getVideoId(videoElement)
	};
}

function getVideoDurationInSeconds(videoElement: Element): number {
	const oldSelector = "ytd-thumbnail-overlay-time-status-renderer > div#time-status";
	const newSelector = "badge-shape .ytBadgeShapeText";
	let durationElement = videoElement.querySelector<HTMLElement>(oldSelector);
	if (!durationElement || !durationElement.textContent?.trim()) {
		durationElement = videoElement.querySelector<HTMLElement>(newSelector);
	}
	if (!durationElement || !durationElement.textContent?.trim()) return 0;
	return timeStringToSeconds(durationElement.textContent.trim());
}

function getVideoElement(): Nullable<HTMLVideoElement> {
	return document.querySelector<HTMLVideoElement>("video");
}

function getVideoId(videoElement: Element): Nullable<string> {
	const oldSelector = "a#thumbnail";
	const newSelector = "a.ytLockupViewModelContentImage";
	let videoIdElement = videoElement.querySelector<HTMLAnchorElement>(oldSelector);
	if (!videoIdElement) {
		videoIdElement = videoElement.querySelector<HTMLAnchorElement>(newSelector);
	}
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
	const oldSelector = ".ytd-thumbnail-overlay-resume-playback-renderer,#progress";
	const newSelector = ".ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment";
	let progressBar = videoElement.querySelector<HTMLElement>(oldSelector);
	if (!progressBar) {
		progressBar = videoElement.querySelector<HTMLElement>(newSelector);
	}
	if (!progressBar) return 0;
	return parseFloat(progressBar.style.width) || 0;
}
