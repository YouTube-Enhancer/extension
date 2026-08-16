import type { YouTubePlayerDiv } from "@/src/types";

import {
	formatScreenshotTimestamp,
	type ScreenshotFilenameContext,
	type ScreenshotTimestampFormat,
	type ScreenshotTimestampSeparator
} from "@/src/utils/format/filenameTemplate";

type ScreenshotWindow = typeof window & {
	ytInitialPlayerResponse?: {
		playerOverlays?: {
			playerOverlayRenderer?: {
				decoratedPlayerBarRenderer?: {
					playerBarRenderer?: {
						multiMarkersPlayerBarRenderer?: {
							markerMap?: Array<{
								value?: {
									chaptersRenderer?: {
										chapters?: Array<{
											chapterRenderer?: {
												timeRangeStartMillis?: number;
												title?: { runs?: Array<{ text?: string }> };
											};
										}>;
									};
								};
							}>;
						};
					};
				};
			};
		};
		videoDetails?: {
			channel?: string;
			channelId?: string;
			videoId?: string;
		};
	};
};

export async function buildScreenshotFilenameContext(
	videoElement: HTMLVideoElement,
	staticContext: Pick<ScreenshotFilenameContext, "date" | "extension" | "resolution" | "videoId">,
	timestampFormat: ScreenshotTimestampFormat = "auto",
	timestampSeparator: ScreenshotTimestampSeparator = "auto"
): Promise<ScreenshotFilenameContext> {
	const playerResponseData = getPlayerResponseData();
	let channelName = playerResponseData?.videoDetails?.channel ?? "";
	if (!channelName) {
		const player = document.querySelector<YouTubePlayerDiv>("#movie_player");
		if (player) {
			try {
				const { author } = await player.getVideoData();
				if (author) channelName = author;
			} catch {
				// Channel name is best-effort; fall back when unavailable
			}
		}
	}
	return {
		channelId: extractChannelId(playerResponseData),
		channelName,
		chapterName: extractChapterName(playerResponseData, videoElement.currentTime),
		...staticContext,
		videoTimestamp: formatScreenshotTimestamp(videoElement.currentTime, timestampFormat, timestampSeparator)
	};
}

function extractChannelId(data: ScreenshotWindow["ytInitialPlayerResponse"] | undefined): string {
	const channelId = data?.videoDetails?.channelId;
	if (channelId) return channelId;
	const ownerLink = document.querySelector<HTMLAnchorElement>("a[href*='/channel/']");
	const hrefChannelId = ownerLink?.href.match(/\/channel\/([\w-]+)/)?.[1];
	return hrefChannelId ?? "";
}

function extractChapterName(data: ScreenshotWindow["ytInitialPlayerResponse"] | undefined, currentTimeSeconds: number): string {
	// Prefer the chapter title the player actually shows (honors SponsorBlock overrides)
	const chapterName = extractChapterNameFromDom();
	if (chapterName) return chapterName;
	return extractChapterNameFromPlayerResponse(data, currentTimeSeconds);
}

function extractChapterNameFromDom(): string {
	const elements = Array.from(document.querySelectorAll<HTMLElement>(".ytp-chapter-title .ytp-chapter-title-content"));
	for (const element of elements) {
		// Skip the hidden aria-live duplicate that YouTube keeps in the DOM
		if (element.offsetParent === null || getComputedStyle(element).display === "none") continue;
		const title = element.textContent?.trim() ?? "";
		if (title) return title;
	}
	return "";
}

function extractChapterNameFromPlayerResponse(data: ScreenshotWindow["ytInitialPlayerResponse"] | undefined, currentTimeSeconds: number): string {
	const chapters =
		data?.playerOverlays?.playerOverlayRenderer?.decoratedPlayerBarRenderer?.playerBarRenderer?.multiMarkersPlayerBarRenderer?.markerMap
			?.flatMap((marker) => marker?.value?.chaptersRenderer?.chapters ?? [])
			.map((chapter) => chapter?.chapterRenderer)
			.filter((chapter): chapter is NonNullable<typeof chapter> => Boolean(chapter));
	if (!chapters || chapters.length === 0) return "";
	const currentMillis = currentTimeSeconds * 1000;
	const currentChapter = [...chapters].reverse().find((chapter) => (chapter.timeRangeStartMillis ?? Number.POSITIVE_INFINITY) <= currentMillis);
	if (!currentChapter) return "";
	return currentChapter.title?.runs?.map((run) => run?.text ?? "").join("") ?? "";
}

function getPlayerResponseData(): ScreenshotWindow["ytInitialPlayerResponse"] | undefined {
	return (window as ScreenshotWindow).ytInitialPlayerResponse;
}
