import type { FeatureStateAPI } from "@/src/features/_registry/types";
import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { waitForElement } from "@/src/utils/dom/wait";

import { ensureReversalSticks, injectButton, pollForDataReady } from "./button";
import { applyPlaylistPageReversal, applyReversal, reversePlaylistPage, waitForDataRefresh } from "./reversal";
import { FEATURE_NAME, getPlaylistPageActionRow, isCurrentlyReversed, isPlaylistDataReady, PLAYLIST_PAGE_WAIT_SELECTOR } from "./utils";

type StateAPI = FeatureStateAPI<"playlistReverseButton">;

let resizeObserver: Nullable<ResizeObserver> = null;
let miniPlayerCheckTimer: Nullable<ReturnType<typeof setInterval>> = null;

function disconnectResizeObserver() {
	resizeObserver?.disconnect();
	resizeObserver = null;
}

function setupNativeMiniPlayerDetection(stateAPI: StateAPI) {
	const miniButton = document.querySelector<HTMLButtonElement>("button.ytp-miniplayer-button");
	if (!miniButton) return;
	eventManager.addEventListener(
		miniButton,
		"click",
		() => {
			if (stateAPI.getState().isReversed) startMiniPlayerCheck(stateAPI);
		},
		FEATURE_NAME
	);
}

async function setupOnPlaylistPage(stateAPI: StateAPI) {
	const list = await waitForElement<HTMLElement>(PLAYLIST_PAGE_WAIT_SELECTOR, 5000, "optional");
	if (!list) return;

	if (!isPlaylistDataReady()) {
		const ready = await pollForDataReady();
		if (!ready) return;
	}

	const { isReversed } = stateAPI.getState();
	if (isReversed) await reversePlaylistPage();
	const row = await getPlaylistPageActionRow();
	if (row) await injectButton(stateAPI, row);

	if (isReversed) {
		void ensureReversalSticks(stateAPI, applyPlaylistPageReversal, async () => {
			const r = await getPlaylistPageActionRow();
			if (r) await injectButton(stateAPI, r);
		});
	}

	disconnectResizeObserver();
	resizeObserver = new ResizeObserver(() => {
		const { isReversed: currentlyReversed } = stateAPI.getState();
		void getPlaylistPageActionRow().then((r) => {
			if (
				r &&
				document.getElementById("yte-playlist-reverse-button-container") &&
				!r.contains(document.getElementById("yte-playlist-reverse-button-container"))
			) {
				void injectButton(stateAPI, r);
				if (currentlyReversed && !isCurrentlyReversed()) applyPlaylistPageReversal();
			}
			return undefined;
		});
	});
	resizeObserver.observe(document.documentElement);
}

async function setupOnWatchPage(stateAPI: StateAPI, prevCurrentIndex: Nullable<number> = null) {
	const panel = await waitForElement("ytd-playlist-panel-renderer", 5000, "optional");
	if (!panel) return;

	if (!isPlaylistDataReady()) {
		const ready = await pollForDataReady();
		if (!ready) return;
	}

	if (prevCurrentIndex !== null) {
		const refreshed = await waitForDataRefresh(prevCurrentIndex);
		if (!refreshed) return;
	}

	const { isReversed } = stateAPI.getState();
	if (isReversed) applyReversal();
	await injectButton(stateAPI);
	setupNativeMiniPlayerDetection(stateAPI);

	if (prevCurrentIndex === null && isReversed) {
		void ensureReversalSticks(stateAPI, applyReversal, () => injectButton(stateAPI));
	}
}

function startMiniPlayerCheck(stateAPI: StateAPI) {
	stopMiniPlayerCheck();
	miniPlayerCheckTimer = setInterval(() => {
		const { isReversed } = stateAPI.getState();
		if (!isReversed) {
			stopMiniPlayerCheck();
			return;
		}
		if (isPlaylistDataReady() && !isCurrentlyReversed()) {
			applyReversal();
			void injectButton(stateAPI);
			stopMiniPlayerCheck();
		}
	}, 500);
}

function stopMiniPlayerCheck() {
	if (miniPlayerCheckTimer) {
		clearInterval(miniPlayerCheckTimer);
		miniPlayerCheckTimer = null;
	}
}

export { disconnectResizeObserver, setupOnPlaylistPage, setupOnWatchPage, stopMiniPlayerCheck };
