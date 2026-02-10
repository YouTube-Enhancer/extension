import type { Nullable } from "@/src/types";

import { getVideoHref, handleTimestampElementsHover, observeTimestampElements } from "@/src/features/timestampPeek/utils";
import eventManager from "@/src/utils/EventManager";
import { isWatchPage, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";

let timestampElementObserver: Nullable<MutationObserver> = null;
const navigateStartHandler = () => {
	disableTimestampPeek();
};
export function disableTimestampPeek() {
	eventManager.removeEventListeners("timestampPeek");
	document.removeEventListener("yt-navigate-start", navigateStartHandler);
	cleanupTimestampObserver();
	const overlay = document.getElementById("yte-timestamp-peek-overlay");
	if (overlay) overlay.remove();
	const placeholder = document.getElementById("yte-timestamp-peek-placeholder");
	if (placeholder) placeholder.remove();
	const shield = document.getElementById("yte-timestamp-peek-hover-shield");
	if (shield) shield.remove();
}

export async function enableTimestampPeek() {
	const {
		data: {
			options: { enable_timestamp_peek }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_timestamp_peek || !isWatchPage()) return;
	await waitForAllElements(["#movie_player", "#player-container", "#player-container-outer"]);
	const videoHref = getVideoHref();
	if (!videoHref) return;
	eventManager.removeEventListeners("timestampPeek");
	document.addEventListener("yt-navigate-start", navigateStartHandler);
	cleanupTimestampObserver();
	handleTimestampElementsHover();
	const obs = observeTimestampElements();
	if (obs) setTimestampObserver(obs);
}

function cleanupTimestampObserver() {
	timestampElementObserver?.disconnect();
	timestampElementObserver = null;
}

function setTimestampObserver(observer: MutationObserver) {
	timestampElementObserver?.disconnect();
	timestampElementObserver = observer;
}
