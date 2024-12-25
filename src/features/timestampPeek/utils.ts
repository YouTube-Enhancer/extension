import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import { isNewYouTubeVideoLayout } from "@/src/utils/utilities";
export const timestampElementSelector = ".yt-core-attributed-string__link";
export const timestampsWithListeners = new Set<string>();
export function getVideoHref() {
	const {
		location: { search }
	} = window;
	const vParam = new URLSearchParams(search).get("v");
	if (!vParam) return null;
	return `/watch?v=${vParam}`;
}
export function getTimestampFromString(str: string) {
	const timestampParam = new URLSearchParams(str).get("t") ?? "0";
	return parseInt(timestampParam, 10);
}
function getTimestampTextElements() {
	const timestampLinkHref = getVideoHref();
	if (!timestampLinkHref) return [];
	return Array.from(document.querySelectorAll<HTMLElement>(`${timestampElementSelector}[href^='${timestampLinkHref}']`));
}
function getTimestamps(): [HTMLElement, number][] {
	return getTimestampTextElements()
		.map((timestampTextElement) => [
			timestampTextElement,
			timestampTextElement.getAttribute("href") ? getTimestampFromString(timestampTextElement.getAttribute("href")!) : 0
		])
		.filter(([, timestamp]) => timestamp !== 0) as [HTMLElement, number][];
}
function toggleClassList(element: HTMLElement, classList: string, show: boolean) {
	if (show) element.classList.add(classList);
	else element.classList.remove(classList);
}
async function previewTimestamp({
	isPlaying,
	playerType,
	showPreview,
	timestamp,
	timestampElement
}: {
	isPlaying: boolean;
	playerType: "normal" | "theater";
	showPreview: boolean;
	timestamp: number;
	timestampElement: HTMLElement;
}) {
	const commentThread = timestampElement.closest("#comment");
	const playerContainer = document.querySelector<HTMLDivElement>("div#player-container:has(#movie_player)");
	const moviePlayer = document.querySelector<YouTubePlayerDiv>("div#movie_player");
	const fullBleedContainer = document.querySelector<HTMLDivElement>("#full-bleed-container");
	const playerFullBleedContainer = document.querySelector<HTMLDivElement>("#player-full-bleed-container");
	const playerContainerOuter = document.querySelector<HTMLDivElement>("#player-container-outer");
	const playerContainerInner = document.querySelector<HTMLDivElement>("#player-container-inner");
	const ytdPlayer = document.querySelector<HTMLDivElement>("#ytd-player");
	const video = document.querySelector<HTMLVideoElement>("video.video-stream.html5-main-video");
	const ytpChromeBottom = document.querySelector<HTMLDivElement>(".ytp-chrome-bottom");
	const ytpChromeTop = document.querySelector<HTMLButtonElement>(".ytp-chrome-top");
	const ytpGradientBottom = document.querySelector<HTMLDivElement>(".ytp-gradient-bottom");
	if (
		!video ||
		!ytpChromeBottom ||
		!ytpChromeTop ||
		!ytpGradientBottom ||
		!moviePlayer ||
		!playerContainer ||
		!playerContainerOuter ||
		!playerContainerInner ||
		!fullBleedContainer ||
		!playerFullBleedContainer ||
		!commentThread ||
		!ytdPlayer
	)
		return;
	const { height: playerHeight, width: playerWidth } = await moviePlayer.getSize();
	const commentThreadRect = commentThread.getBoundingClientRect();
	const { left, top, width } = commentThreadRect;
	const playerContainerPlaceholder = document.querySelector<HTMLDivElement>("#yte-timestamp-peek-video-container-placeholder");
	const playerContainerPlaceholderExists = playerContainerPlaceholder !== null;
	if (!playerContainerPlaceholderExists) {
		const playerContainerPlaceholder = document.createElement("div");
		playerContainerPlaceholder.style.height = `${playerHeight}px`;
		playerContainerPlaceholder.style.width = `${playerWidth}px`;
		playerContainerPlaceholder.id = "yte-timestamp-peek-video-container-placeholder";
		if (playerType === "normal") playerContainerOuter.insertAdjacentElement("afterend", playerContainerPlaceholder);
		else fullBleedContainer.insertAdjacentElement("afterend", playerContainerPlaceholder);
	} else {
		playerContainerPlaceholder.style.height = `${playerHeight}px`;
		playerContainerPlaceholder.style.width = `${playerWidth}px`;
		if (!showPreview) playerContainerPlaceholder.style.display = "none";
		else playerContainerPlaceholder.style.display = "block";
	}
	if (playerType === "normal") {
		toggleClassList(ytdPlayer, "yte-timestamp-peek-ytd-player-no-border-radius", showPreview);
		if (showPreview) {
			// FIXME: position the preview better in the left direction
			playerContainerOuter.style.top = `${window.scrollY + top / 2}px`;
			playerContainerOuter.style.left = `${left + width / 2}px`;
		} else {
			playerContainerOuter.style.top = "";
			playerContainerOuter.style.left = "";
		}
		toggleClassList(playerContainerOuter, "yte-timestamp-peek-video-container", showPreview);
		toggleClassList(playerContainerOuter, "yte-timestamp-peek-player-container-reset", showPreview);
		toggleClassList(playerContainerInner, "yte-timestamp-peek-video-container", showPreview);
		toggleClassList(playerContainerInner, "yte-timestamp-peek-player-container-reset", showPreview);
	} else {
		console.log(`Show preview: ${showPreview}`);
		if (showPreview) {
			// FIXME: position the preview better in the left direction
			fullBleedContainer.style.top = `${window.scrollY + top / 2}px`;
			fullBleedContainer.style.left = `${left + width / 2}px`;
		} else {
			fullBleedContainer.style.top = "";
			fullBleedContainer.style.left = "";
		}
		toggleClassList(fullBleedContainer, "yte-timestamp-peek-video-container", showPreview);
		toggleClassList(fullBleedContainer, "yte-timestamp-peek-player-container-reset", showPreview);
		toggleClassList(playerFullBleedContainer, "yte-timestamp-peek-video-container", showPreview);
		toggleClassList(playerFullBleedContainer, "yte-timestamp-peek-player-container-reset", showPreview);
	}
	// FIXME: full-bleed-container and player-full-bleed-container not having their classes removed when hiding preview
	// FIXME: page jumping when hovering over timestamp
	toggleClassList(video, "yte-timestamp-peek-video", showPreview);
	toggleClassList(ytpChromeBottom, "yte-timestamp-peek-hidden", showPreview);
	toggleClassList(ytpChromeTop, "yte-timestamp-peek-hidden", showPreview);
	toggleClassList(ytpGradientBottom, "yte-timestamp-peek-hidden", showPreview);
	toggleClassList(playerContainer, "yte-timestamp-peek-video-container", showPreview);
	toggleClassList(playerContainer, "yte-timestamp-peek-player-container-reset", showPreview);
	toggleClassList(moviePlayer, "yte-timestamp-peek-video-container", showPreview);
	toggleClassList(moviePlayer, "yte-timestamp-peek-player-container-reset", showPreview);
	const ytpPlayerContentElements = document.querySelectorAll<HTMLDivElement>(".ytp-player-content");
	ytpPlayerContentElements.forEach((element) => {
		toggleClassList(element, "yte-timestamp-peek-hidden", showPreview);
	});
	const ytpCeElements = document.querySelectorAll<HTMLDivElement>(".ytp-ce-element");
	ytpCeElements.forEach((element) => {
		toggleClassList(element, "yte-timestamp-peek-hidden", showPreview);
	});
	if (showPreview) {
		await moviePlayer.seekTo(timestamp, true);
		await moviePlayer.playVideo();
	} else {
		await moviePlayer.seekTo(timestamp, true);
		if (!isPlaying) {
			await moviePlayer.pauseVideo();
		}
	}
}
export function handleTimestampHover(element: HTMLElement, timestamp: number) {
	const videoElement = document.querySelector<HTMLVideoElement>("video.video-stream.html5-main-video");
	if (!videoElement) return;
	let { currentTime } = videoElement;
	const isPlaying = !videoElement.paused;
	eventManager.addEventListener(
		element,
		"mouseenter",
		async () => {
			const videoElement = document.querySelector<HTMLVideoElement>("video.video-stream.html5-main-video");
			if (!videoElement) return;
			({ currentTime } = videoElement);
			// Get the player element
			const playerContainer = document.querySelector<YouTubePlayerDiv>("div#movie_player");
			// If player element is not available, return
			if (!playerContainer) return;
			const { width } = await playerContainer.getSize();
			const {
				body: { clientWidth }
			} = document;
			const isTheaterMode = width === clientWidth;
			void previewTimestamp({
				isPlaying: true,
				playerType: isTheaterMode ? "theater" : "normal",
				showPreview: true,
				timestamp,
				timestampElement: element
			});
		},
		"timestampPeek"
	);
	eventManager.addEventListener(
		element,
		"mouseleave",
		async () => {
			// Get the player element
			const playerContainer = document.querySelector<YouTubePlayerDiv>("div#movie_player");
			// If player element is not available, return
			if (!playerContainer) return;
			const { width } = await playerContainer.getSize();
			const {
				body: { clientWidth }
			} = document;
			const isTheaterMode = width === clientWidth;
			void previewTimestamp({
				isPlaying,
				playerType: isTheaterMode ? "theater" : "normal",
				showPreview: false,
				timestamp: currentTime,
				timestampElement: element
			});
		},
		"timestampPeek"
	);
}
export function handleTimestampElementsHover() {
	const timestampTextElements = getTimestamps();
	timestampTextElements.forEach(([element, timestamp]) => {
		const commentElement = element.closest(".yt-core-attributed-string");
		if (!commentElement) return;
		const { textContent: commentText } = commentElement;
		if (!commentText) return;
		const timestampedCommentText = `${commentText}-${timestamp}`;
		if (timestampsWithListeners.has(timestampedCommentText)) return;
		timestampsWithListeners.add(timestampedCommentText);
		handleTimestampHover(element, timestamp);
	});
}
// FIXME: not working properly
export function observeTimestampElements(): Nullable<MutationObserver> {
	const timestampLinkHref = getVideoHref();
	if (!timestampLinkHref) return null;
	const observer = new MutationObserver((mutationList) => {
		mutationList
			.filter((mutation) => mutation.type === "childList")
			.filter(
				(mutation) =>
					(mutation.target instanceof Element &&
						mutation.target.matches("ytd-comment-thread-renderer #replies ytd-comment-replies-renderer #expander #contents")) ||
					Array.from(mutation.addedNodes).some(
						(addedNode) =>
							addedNode instanceof Element &&
							addedNode.matches("ytd-comment-thread-renderer") &&
							addedNode.querySelector(`${timestampElementSelector}[href^='${timestampLinkHref}']`) !== null
					)
			)
			.filter((mutation) => mutation.addedNodes.length > 0)
			.forEach((mutation) => {
				mutation.addedNodes.forEach((addedNode) => {
					const timestampHrefElement = (addedNode as Element).querySelector(`${timestampElementSelector}[href^='${timestampLinkHref}']`);
					if (!timestampHrefElement) return;
					const timestampHref = timestampHrefElement.getAttribute("href");
					if (!timestampHref) return;
					const commentElement = (addedNode as Element).querySelector("yt-attributed-string .yt-core-attributed-string");
					if (!commentElement) return;
					const { textContent: commentText } = commentElement;
					if (!commentText) return;
					const timestamp = getTimestampFromString(timestampHref);
					const timestampedCommentText = `${commentText}-${timestamp}`;
					if (timestampsWithListeners.has(timestampedCommentText)) return;
					timestampsWithListeners.add(timestampedCommentText);
					handleTimestampHover(timestampHrefElement as HTMLElement, timestamp);
				});
			});
	});
	const commentsSection = document.querySelector(
		isNewYouTubeVideoLayout() ?
			"ytd-comments ytd-item-section-renderer#sections.ytd-comments div#contents"
		:	"ytd-comments.ytd-watch-flexy ytd-item-section-renderer#sections.ytd-comments div#contents"
	) as Element;
	observer.observe(commentsSection, { childList: true, subtree: true });
	return observer;
}
