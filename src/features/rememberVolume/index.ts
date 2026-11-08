import type { FeatureStateAPI } from "@/src/features/_registry/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { getPagePlayerElement, whenReady } from "@/src/utils/dom/readiness";
import {
	documentVolumeBucket,
	restorePersistedVolume,
	seedPersistedVolume
} from "@/src/utils/player/persistedVolume";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

import { initialState, metadata } from "./index.metadata";
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
	void registry.playerRetry("rememberVolume", [task], ["reapplyVolume"], {
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
	const playerContainer = await whenReady("pagePlayer");
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

/**
 * Puts the remembered level for this document's page type into YouTube's store, where the next
 * player reads it at construction. A remembered 0 means "nothing to force" - the same read
 * `rememberedVolumeForCurrentPage` gives it - so any seed left by an earlier value is handed back
 * instead, and the player boots at YouTube's own level.
 *
 * The lifecycle hooks seed as well as `document_start` because the turn-on can arrive on a page
 * the gate excludes (the home feed), where `onEnable` never runs and the in-page navigation to the
 * next video never re-runs `document_start`.
 */
function seedRememberedVolume(stateAPI: FeatureStateAPI<"rememberVolume">): void {
	const bucket = documentVolumeBucket(stateAPI.getState());
	if (bucket) seedPersistedVolume(bucket);
	else restorePersistedVolume();
}

export default createFeature({
	...metadata,
	onConfigChange: (config, stateAPI) => {
		if (config.enabled) {
			seedRememberedVolume(stateAPI);
			return;
		}
		/**
		 * A turn-off is the one path that always reaches here - the page gate can keep `onDisable`
		 * from ever running (the feature is already inactive when the config lands) - so the store
		 * has to be handed back here while we still know what was in it.
		 */
		resetVolumeChangeListener();
		restorePersistedVolume();
	},
	onDisable: (config) => {
		// Listener removal is a disposer (registered in onEnable); the tracking reset stays here so the
		// next enable re-attaches a fresh listener.
		resetVolumeChangeListener();
		/**
		 * A page-gate exit (watch -> home) also runs this hook, with the feature still configured
		 * on. Restoring there would wipe the seed the next video boots from and re-open the loud
		 * start, so only a real turn-off hands YouTube's own value back.
		 */
		if (config.enabled) return;
		restorePersistedVolume();
	},
	onEnable: async (_, stateAPI) => {
		registry.on("rememberVolume", "events", () =>
			eventManager.removeEventListeners("rememberVolume")
		);
		seedRememberedVolume(stateAPI);
		await restoreVolume(stateAPI);
		queueVolumeReapply(stateAPI);
	},
	onNavigate: async (_, stateAPI) => {
		seedRememberedVolume(stateAPI);
		await restoreVolume(stateAPI);
		queueVolumeReapply(stateAPI);
	},
	persistState: true,
	state: { ...initialState }
});
