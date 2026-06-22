import "./index.css";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { isWatchPage } from "@/src/utils/url";

import { removeButton } from "./button";
import { metadata } from "./index.metadata";
import { applyPlaylistPageReversal, applyReversal } from "./reversal";
import { disconnectResizeObserver, setupOnPlaylistPage, setupOnWatchPage, stopMiniPlayerCheck } from "./setup";
import { FEATURE_NAME, getPlaylistData, isCurrentlyReversed } from "./utils";

function cleanup() {
	removeButton();
	stopMiniPlayerCheck();
	disconnectResizeObserver();
	eventManager.removeEventListeners(FEATURE_NAME);
	document.getElementById(`yte-feature-${FEATURE_NAME}-tooltip`)?.remove();
}

export default createFeature({
	...metadata,
	onDisable: () => {
		if (isCurrentlyReversed()) {
			if (isWatchPage()) {
				applyReversal();
			} else {
				applyPlaylistPageReversal();
			}
		}
		cleanup();
	},
	onEnable: async (_config, stateAPI) => {
		if (isWatchPage()) {
			await setupOnWatchPage(stateAPI);
		} else {
			await setupOnPlaylistPage(stateAPI);
		}
	},
	onNavigate: async (_config, stateAPI) => {
		let prevIndex: null | number = null;
		if (isWatchPage()) {
			prevIndex = getPlaylistData()?.playlist.currentIndex ?? null;
		}
		cleanup();
		if (isWatchPage()) {
			await setupOnWatchPage(stateAPI, prevIndex);
		} else {
			await setupOnPlaylistPage(stateAPI);
		}
	},
	persistState: true,
	state: { isReversed: false }
});
