import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import {
	getVideoHref,
	handleTimestampElementsHover,
	observeTimestampElements,
	resetState,
	restorePreviewedVideo
} from "@/src/features/timestampPeek/utils";
import { whenReady } from "@/src/utils/dom/readiness";

import "./index.css";
import { metadata } from "./index.metadata";

let unsubscribeTimestampBus: Nullable<() => void> = null;
const navigateStartHandler = () => {
	restorePreviewedVideo();
	eventManager.removeEventListeners("timestampPeek");
	cleanupTimestampObserver();
	const overlay = document.getElementById("yte-timestamp-peek-overlay");
	if (overlay) overlay.remove();
	const placeholder = document.getElementById("yte-timestamp-peek-placeholder");
	if (placeholder) placeholder.remove();
	const shield = document.getElementById("yte-timestamp-peek-hover-shield");
	if (shield) shield.remove();
	resetState();
};

function cleanupTimestampObserver() {
	unsubscribeTimestampBus?.();
	unsubscribeTimestampBus = null;
}

function setupTimestampPeek() {
	void whenReady("playerShell").then(async () => {
		const videoHref = getVideoHref();
		if (!videoHref) return;
		eventManager.removeEventListeners("timestampPeek");
		document.addEventListener("yt-navigate-start", navigateStartHandler);
		cleanupTimestampObserver();
		await handleTimestampElementsHover();
		const unsub = await observeTimestampElements();
		if (unsub) unsubscribeTimestampBus = unsub;
		return undefined;
	});
}

export default createFeature({
	...metadata,
	onDisable: () => {
		eventManager.removeEventListeners("timestampPeek");
		document.removeEventListener("yt-navigate-start", navigateStartHandler);
		cleanupTimestampObserver();
		// A preview that is showing holds the player's video element; give it back before the overlay goes.
		restorePreviewedVideo();
		const overlay = document.getElementById("yte-timestamp-peek-overlay");
		if (overlay) overlay.remove();
		const placeholder = document.getElementById("yte-timestamp-peek-placeholder");
		if (placeholder) placeholder.remove();
		const shield = document.getElementById("yte-timestamp-peek-hover-shield");
		if (shield) shield.remove();
	},
	onEnable: setupTimestampPeek,
	onNavigate: setupTimestampPeek
});
