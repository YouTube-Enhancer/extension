import "./index.css";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { isWatchPage } from "@/src/utils/url";

import { removeButton } from "./button";
import { metadata } from "./index.metadata";
import { applyPlaylistPageReversal, matchReversalToState } from "./reversal";
import { disconnectResizeObserver, setupOnPlaylistPage, setupOnWatchPage, stopMiniPlayerCheck } from "./setup";
import { FEATURE_NAME, isCurrentlyReversed, nextSetupGeneration } from "./utils";

function cleanup() {
	// Work the last setup left behind stands down from here on; see setupGeneration.
	nextSetupGeneration();
	removeButton();
	stopMiniPlayerCheck();
	disconnectResizeObserver();
	eventManager.removeEventListeners(FEATURE_NAME);
	document.getElementById(`yte-feature-${FEATURE_NAME}-tooltip`)?.remove();
}

export default createFeature({
	...metadata,
	onDisable: () => {
		// Cleaning up first: the un-reversal hands YouTube the playlist again, and the listeners must not answer that.
		cleanup();
		if (isWatchPage()) {
			matchReversalToState(false);
		} else if (isCurrentlyReversed()) {
			applyPlaylistPageReversal();
		}
	},
	onEnable: async (_config, stateAPI) => {
		if (isWatchPage()) {
			await setupOnWatchPage(stateAPI);
		} else {
			await setupOnPlaylistPage(stateAPI);
		}
	},
	onNavigate: async (_config, stateAPI) => {
		cleanup();
		if (isWatchPage()) {
			await setupOnWatchPage(stateAPI);
		} else {
			await setupOnPlaylistPage(stateAPI);
		}
	},
	persistState: true,
	state: { isReversed: false }
});
