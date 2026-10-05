import type { FeatureStateAPI } from "@/src/features/_registry/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { getPagePlayerElement, waitForPagePlayer } from "@/src/utils/dom/pageReadiness";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";
import { resetVolumeChangeListener, setupVolumeChangeListener } from "./utils";

/**
 * restoreVolume gives up when the player is not ready yet, which on a loaded page leaves the remembered
 * volume unapplied. Re-apply it through the player manager's retry task once the player is up; the same
 * task attaches the volume change listener, so the re-apply is recorded like any inline restore.
 */
function queueVolumeReapply(stateAPI: FeatureStateAPI<"rememberVolume">): void {
	const task = async () => {
		const target = rememberedVolumeForCurrentPage(stateAPI.getState());
		// Nothing recorded for this page type (or state has not hydrated yet): keep retrying instead
		// of reporting success, or the remembered value is lost for the whole page session.
		if (!target) return false;
		const playerContainer = getPagePlayerElement();
		if (!playerContainer?.setVolume) return false;
		const nativeVolume =
			typeof playerContainer.getVolume === "function"
				? await playerContainer.getVolume()
				: undefined;
		await playerContainer.setVolume(target);
		// The inline restore skips the listener when the player initializes late (live pages render
		// their player well after the shell); the retry is the backstop that guarantees it exists.
		await setupVolumeChangeListener({ nativeVolume });
		// The player can report the old volume for a tick after setVolume. Only report success once
		// the remembered value actually stuck, so a value that never landed keeps retrying instead
		// of letting YouTube's own persisted volume win the page.
		const applied =
			typeof playerContainer.getVolume === "function" ? await playerContainer.getVolume() : target;
		return applied === target;
	};
	void registry.executeWithRetries("rememberVolume", [task], ["reapplyVolume"], {
		waitForLoaded: true
	});
}

/** The remembered volume for the page type the document currently is, or undefined when none applies. */
function rememberedVolumeForCurrentPage(state: {
	shortsPageVolume: number;
	watchPageVolume: number;
}): number | undefined {
	// A live stream is a /watch document, so the watch bucket covers both.
	if (isWatchPage() || isLivePage()) return state.watchPageVolume || undefined;
	if (isShortsPage()) return state.shortsPageVolume || undefined;
	return undefined;
}

async function restoreVolume(stateAPI: FeatureStateAPI<"rememberVolume">) {
	const target = rememberedVolumeForCurrentPage(stateAPI.getState());
	const IsWatchPage = isWatchPage();
	const IsLivePage = isLivePage();
	const IsShortsPage = isShortsPage();
	if (!IsWatchPage && !IsLivePage && !IsShortsPage) return;
	const playerContainer = await waitForPagePlayer();
	// Snapshot the player's own volume before applying: on shorts it tells the listener whether a
	// later change is YouTube re-applying its persisted volume or a genuine user change.
	const nativeVolume =
		playerContainer && typeof playerContainer.getVolume === "function"
			? await playerContainer.getVolume()
			: undefined;
	// Attach the recording listener even when the player is not up yet. Waiting for the player
	// before this point meant a late-rendering player (live) skipped the listener entirely, so the
	// volume could be applied but never recorded to storage.
	const listenerAttached = setupVolumeChangeListener({ nativeVolume });
	if (playerContainer?.setVolume && target) {
		await playerContainer.setVolume(target);
	}
	await listenerAttached;
}

export default createFeature({
	...metadata,
	onDisable: () => {
		eventManager.removeEventListeners("rememberVolume");
		resetVolumeChangeListener();
	},
	onEnable: async (_, stateAPI) => {
		await restoreVolume(stateAPI);
		queueVolumeReapply(stateAPI);
	},
	onNavigate: async (_, stateAPI) => {
		await restoreVolume(stateAPI);
		queueVolumeReapply(stateAPI);
	},
	persistState: true,
	state: {
		shortsPageVolume: 25,
		watchPageVolume: 25
	}
});
