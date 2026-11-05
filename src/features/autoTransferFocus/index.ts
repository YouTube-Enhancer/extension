import type { Nullable } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import {
	subscribeToDomMutations,
	type UnsubscribeFromDomMutations
} from "@/src/utils/dom/observers/domMutationBus";

import { metadata } from "./index.metadata";

const VIDEO_SELECTOR = "video.html5-main-video";

let videoElement: Nullable<HTMLVideoElement> = null;
let unsubscribe: Nullable<UnsubscribeFromDomMutations> = null;

function attachToVideo(elements: Element[]): void {
	const video = elements.find((el): el is HTMLVideoElement => el instanceof HTMLVideoElement);
	if (!video || video === videoElement) return;
	detachFromVideo();
	videoElement = video;
	videoElement.addEventListener("seeked", onSeeked);
}

function detachFromVideo(): void {
	videoElement?.removeEventListener("seeked", onSeeked);
	videoElement = null;
}

function onSeeked(): void {
	const playButton = document.querySelector<HTMLButtonElement>(".ytp-play-button");
	playButton?.focus();
}

function startWatching(): void {
	if (unsubscribe) return;
	const existing = document.querySelector<HTMLVideoElement>(VIDEO_SELECTOR);
	if (existing) {
		videoElement = existing;
		videoElement.addEventListener("seeked", onSeeked);
	}
	unsubscribe = subscribeToDomMutations(VIDEO_SELECTOR, attachToVideo);
}

function stopWatching(): void {
	unsubscribe?.();
	unsubscribe = null;
	detachFromVideo();
}

export default createFeature({
	...metadata,
	onDisable: () => {
		stopWatching();
	},
	onEnable: () => {
		startWatching();
	},
	onNavigate: () => {
		stopWatching();
		startWatching();
	}
});
