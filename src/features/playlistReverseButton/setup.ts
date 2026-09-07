import type { FeatureStateAPI } from "@/src/features/_registry/types";
import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { waitForElement } from "@/src/utils/dom/wait";
import { isWatchPage } from "@/src/utils/url";

import { ensureButton, ensureReversalSticks, injectButton, pollForDataReady } from "./button";
import { REVERSE_BUTTON_CONTAINER_ID } from "./constants";
import { applyPlaylistPageReversal, matchReversalToState, reversePlaylistPage } from "./reversal";
import {
	currentSetupGeneration,
	FEATURE_NAME,
	getPlaylistPageActionRow,
	getReversalState,
	isPlaylistDataCurrent,
	isPlaylistDataReady,
	nextSetupGeneration,
	PLAYLIST_PAGE_WAIT_SELECTOR,
	poll
} from "./utils";

type StateAPI = FeatureStateAPI<"playlistReverseButton">;

let resizeObserver: Nullable<ResizeObserver> = null;
let miniPlayerCheckTimer: Nullable<ReturnType<typeof setInterval>> = null;
/** When the maintenance listener last had to restore the order; see setupReversalMaintenance for the cap. */
let maintenanceRestores: number[] = [];

const MAINTENANCE_RESTORE_LIMIT = 6;
const MAINTENANCE_RESTORE_WINDOW = 10_000;
const MINI_PLAYER_CHECK_DURATION = 15_000;

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
	const generation = nextSetupGeneration();
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
		void ensureReversalSticks(
			stateAPI,
			() => getReversalState() === false && applyPlaylistPageReversal(),
			async () => {
				const r = await getPlaylistPageActionRow();
				if (r) await ensureButton(stateAPI, r);
			},
			() => generation === currentSetupGeneration()
		);
	}

	disconnectResizeObserver();
	resizeObserver = new ResizeObserver(() => {
		const { isReversed: currentlyReversed } = stateAPI.getState();
		void getPlaylistPageActionRow().then((r) => {
			if (r && document.getElementById(REVERSE_BUTTON_CONTAINER_ID) && !r.contains(document.getElementById(REVERSE_BUTTON_CONTAINER_ID))) {
				void injectButton(stateAPI, r);
				if (currentlyReversed && getReversalState() === false) applyPlaylistPageReversal();
			}
			return undefined;
		});
	});
	resizeObserver.observe(document.documentElement);
}

async function setupOnWatchPage(stateAPI: StateAPI) {
	const generation = nextSetupGeneration();
	// A watch page without a list in its address plays no playlist, whatever panel a previous page left behind.
	if (!new URLSearchParams(window.location.search).has("list")) return;
	setupReversalMaintenance(stateAPI, generation);

	const panel = await waitForElement("ytd-playlist-panel-renderer", 5000, "optional");
	if (!panel) return;

	// After an in-page navigation the previous video's data stays in place until YouTube's response arrives, and the
	// player has usually switched by the time this runs, so the data is trusted by the video it names, not by timing.
	const current = await poll(() => isPlaylistDataReady() && isPlaylistDataCurrent(), Boolean, 100, 5000);
	if (current) matchReversalToState(stateAPI.getState().isReversed);
	await injectButton(stateAPI);
	setupNativeMiniPlayerDetection(stateAPI);

	if (stateAPI.getState().isReversed) {
		void ensureReversalSticks(
			stateAPI,
			() => isPlaylistDataCurrent() && matchReversalToState(true),
			() => ensureButton(stateAPI),
			() => generation === currentSetupGeneration()
		);
	}
}

/**
 * Keeps the order the toggle asks for while the page lives. YouTube keeps its own copy of the playlist and hands it
 * to the panel, the playlist manager and the player again whenever it reloads it: its response to a navigation,
 * the rest of a long playlist, a queue or miniplayer change. Each hand-over is announced with
 * yt-playlist-data-updated, and the page announces its own data with yt-page-data-updated, so both are answered by
 * restoring the order. The order is only touched when the live data is clearly the wrong way round, so the
 * feature's own hand-overs pass as no-ops; the restores are capped all the same, in case a change on YouTube's side
 * ever makes the two disagree for good. Answers queued before a cleanup or a later setup stand down.
 */
function setupReversalMaintenance(stateAPI: StateAPI, generation: number) {
	maintenanceRestores = [];
	const restoreOrder = () => {
		// A tick later, so the page has finished taking the data it was handed before the live order is read.
		setTimeout(() => {
			if (generation !== currentSetupGeneration()) return;
			if (!isWatchPage() || !stateAPI.getState().isReversed || !isPlaylistDataCurrent()) return;
			const now = Date.now();
			maintenanceRestores = maintenanceRestores.filter((time) => now - time < MAINTENANCE_RESTORE_WINDOW);
			if (maintenanceRestores.length >= MAINTENANCE_RESTORE_LIMIT) return;
			if (!matchReversalToState(true)) return;
			maintenanceRestores.push(now);
			void ensureButton(stateAPI);
		}, 0);
	};
	eventManager.addEventListener(document, "yt-page-data-updated", restoreOrder, FEATURE_NAME);
	eventManager.addEventListener(document, "yt-playlist-data-updated", restoreOrder, FEATURE_NAME);
}

function startMiniPlayerCheck(stateAPI: StateAPI) {
	stopMiniPlayerCheck();
	const started = Date.now();
	miniPlayerCheckTimer = setInterval(() => {
		const { isReversed } = stateAPI.getState();
		if (!isReversed || Date.now() - started > MINI_PLAYER_CHECK_DURATION) {
			stopMiniPlayerCheck();
			return;
		}
		if (!isPlaylistDataCurrent() || !matchReversalToState(true)) return;
		void ensureButton(stateAPI);
		stopMiniPlayerCheck();
	}, 500);
}

function stopMiniPlayerCheck() {
	if (miniPlayerCheckTimer) {
		clearInterval(miniPlayerCheckTimer);
		miniPlayerCheckTimer = null;
	}
}

export { disconnectResizeObserver, setupOnPlaylistPage, setupOnWatchPage, stopMiniPlayerCheck };
