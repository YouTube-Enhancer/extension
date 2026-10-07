import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { subscribeToDomMutations } from "@/src/utils/dom/observers/domMutationBus";

import { metadata } from "./index.metadata";
import { setupAutoScroll } from "./utils";

let boundVideo: Nullable<HTMLVideoElement> = null;
let unsubscribePlayerBus: Nullable<() => void> = null;

export default createFeature({
	...metadata,
	onDisable: () => {
		eventManager.removeEventListeners("shortsAutoScroll");
		unsubscribePlayerBus?.();
		unsubscribePlayerBus = null;
		boundVideo = null;
	},
	onEnable: () => {
		setupShortsAutoScroll();
		armPlayerBus();
	},
	onNavigate: () => {
		eventManager.removeEventListeners("shortsAutoScroll");
		boundVideo = null;
		setupShortsAutoScroll();
		armPlayerBus();
	}
});

/**
 * The advance is an in-page navigation: the player can be replaced before or after the registry's navigate
 * event, so binding only at that event risks attaching to the outgoing player and going deaf on the incoming
 * one. Re-arm whenever a new #shorts-player shows up; the bind itself skips a video already bound.
 */
function armPlayerBus() {
	unsubscribePlayerBus?.();
	unsubscribePlayerBus = subscribeToDomMutations("#shorts-player", () => {
		setupShortsAutoScroll();
	});
}

function setupShortsAutoScroll() {
	const shortsContainer = document.querySelector<YouTubePlayerDiv>("#shorts-player");
	if (!shortsContainer) return;
	const video = shortsContainer.querySelector<HTMLVideoElement>("video");
	if (!video || video === boundVideo) return;
	boundVideo = video;
	setupAutoScroll(shortsContainer, video);
}
