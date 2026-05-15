import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { getVideoHref, handleTimestampElementsHover, observeTimestampElements, resetState } from "@/src/features/timestampPeek/utils";
import { waitForAllElements } from "@/src/utils/dom/wait";

import "./index.css";
import { metadata } from "./index.metadata";

let timestampElementObserver: Nullable<MutationObserver> = null;
const navigateStartHandler = () => {
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
	timestampElementObserver?.disconnect();
	timestampElementObserver = null;
}

function setTimestampObserver(observer: MutationObserver) {
	timestampElementObserver?.disconnect();
	timestampElementObserver = observer;
}

export default createFeature({
	...metadata,
	dependencies: { includePages: ["watch"] },
	onDisable: () => {
		eventManager.removeEventListeners("timestampPeek");
		document.removeEventListener("yt-navigate-start", navigateStartHandler);
		cleanupTimestampObserver();
		const overlay = document.getElementById("yte-timestamp-peek-overlay");
		if (overlay) overlay.remove();
		const placeholder = document.getElementById("yte-timestamp-peek-placeholder");
		if (placeholder) placeholder.remove();
		const shield = document.getElementById("yte-timestamp-peek-hover-shield");
		if (shield) shield.remove();
	},
	onEnable: async () => {
		await waitForAllElements(["#movie_player", "#player-container", "#player-container-outer"]);
		const videoHref = getVideoHref();
		if (!videoHref) return;
		eventManager.removeEventListeners("timestampPeek");
		document.addEventListener("yt-navigate-start", navigateStartHandler);
		cleanupTimestampObserver();
		await handleTimestampElementsHover();
		const obs = await observeTimestampElements();
		if (obs) setTimestampObserver(obs);
	}
});
