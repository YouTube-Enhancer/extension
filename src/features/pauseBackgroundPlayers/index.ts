import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import {
	subscribeToDomMutations,
	type UnsubscribeFromDomMutations
} from "@/src/utils/dom/observers/domMutationBus";
import { browserColorLog } from "@/src/utils/logging";
import { sendContentToBackgroundMessage } from "@/src/utils/messaging";

import { metadata } from "./index.metadata";

const FEATURE_ID = "pauseBackgroundPlayers";

let unsubscribeBus: Nullable<UnsubscribeFromDomMutations> = null;
let activeDebounceTimeout: Nullable<number> = null;
let listenersAttached = false;

const PauseBackgroundPlayers = () => {
	if (document.hidden) {
		const isInVideoPiP =
			"pictureInPictureElement" in document && !!document.pictureInPictureElement;
		const isInDocumentPiP =
			"documentPictureInPicture" in window &&
			!!(window as Window & { documentPictureInPicture?: { window: Nullable<Window> } })
				.documentPictureInPicture?.window;
		if (!isInVideoPiP && !isInDocumentPiP) return;
	}
	sendContentToBackgroundMessage("pauseBackgroundPlayers").catch((error) => {
		throw new Error(`Failed to pause background players: ${error}`);
	});
};

function cleanup() {
	unsubscribeBus?.();
	unsubscribeBus = null;
	if (activeDebounceTimeout) {
		clearTimeout(activeDebounceTimeout);
		activeDebounceTimeout = null;
	}
	listenersAttached = false;
}

export default createFeature({
	...metadata,
	onDisable: () => {
		cleanup();
		browserColorLog("Disabling pauseBackgroundPlayers", "FgMagenta");
	},
	onEnable: () => {
		setupPlayerMonitoring();
	},
	onNavigate: () => {
		cleanup();
		setupPlayerMonitoring();
	}
});

function setupPlayerMonitoring() {
	if (window.location.href.match(/^https?:\/\/(?:www\.)?youtube\.com(\/?|\/channel\/.+|\/\@.+)$/gm))
		return;
	browserColorLog("Enabling pauseBackgroundPlayers", "FgMagenta");
	const videoPlayerContainer = document.querySelector<HTMLVideoElement>(".html5-main-video");
	if (!videoPlayerContainer) return;

	function detectPlaying() {
		if (videoPlayerContainer && !listenersAttached) {
			listenersAttached = true;
			eventManager.addEventListener(
				videoPlayerContainer,
				"playing",
				PauseBackgroundPlayers,
				FEATURE_ID
			);
		}
	}

	unsubscribeBus = subscribeToDomMutations(
		"*",
		() => {
			if (activeDebounceTimeout) clearTimeout(activeDebounceTimeout);
			// @ts-expect-error - doesn't recognize browser environment properly
			activeDebounceTimeout = setTimeout(() => {
				detectPlaying();
			}, 100);
		},
		{ parent: videoPlayerContainer }
	);

	if (!videoPlayerContainer.paused) {
		PauseBackgroundPlayers();
	}
	detectPlaying();
}
