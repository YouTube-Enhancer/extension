import type { Nullable } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { registry } from "@/src/features/_registry/featureRegistry";
import { createStyledElement } from "@/src/utils/dom/elements";
import { subscribe } from "@/src/utils/dom/observers/domMutationBus";

import type { MiniPlayerRect } from "./controller";
import type { MiniPlayerOptions } from "./types";

import { MINI_PLAYER_ACTIVE_CLASS, MINI_PLAYER_SENTINEL_ID } from "./constants";
import { MiniPlayerController, readManualOverride, setManualOverride } from "./controller";
import { metadata } from "./index.metadata";

const MINI_PLAYER_STATE_EVENT = "yte-mini-player-state";

let miniPlayerController: Nullable<MiniPlayerController> = null;
let cachedMiniPlayerDefaults: Nullable<MiniPlayerOptions> = null;

let visibilityObserver: Nullable<IntersectionObserver> = null;
let unsubscribeCommentsBus: Nullable<() => void> = null;

let lastEmittedActiveState: Nullable<boolean> = null;

function cleanupAutoObservers() {
	visibilityObserver?.disconnect();
	visibilityObserver = null;
	unsubscribeCommentsBus?.();
	unsubscribeCommentsBus = null;
}
function emitMiniPlayerState(active: boolean) {
	if (lastEmittedActiveState === active) return;
	lastEmittedActiveState = active;
	document.dispatchEvent(new CustomEvent(MINI_PLAYER_STATE_EVENT, { detail: { active } }));
}
function ensureController(options: MiniPlayerOptions) {
	const defaults = cachedMiniPlayerDefaults ?? options;
	if (!miniPlayerController) {
		// The controller announces every activation itself, so paths that bypass setMiniPlayerManual (the overlay close button) still sync the button.
		miniPlayerController = new MiniPlayerController(defaults, {
			onStateChange: emitMiniPlayerState
		});
	} else {
		miniPlayerController.setDefaults(defaults);
	}
	return miniPlayerController;
}
function ensureSentinelBelowPlayer(playerElement: Element): HTMLDivElement {
	let visibilitySentinel = document.getElementById(
		MINI_PLAYER_SENTINEL_ID
	) as Nullable<HTMLDivElement>;
	if (!visibilitySentinel) {
		visibilitySentinel = createStyledElement({
			elementId: MINI_PLAYER_SENTINEL_ID,
			elementType: "div",
			styles: {
				height: "1px",
				pointerEvents: "none",
				width: "1px"
			}
		});
	}
	const { parentElement } = playerElement;
	if (!parentElement) return visibilitySentinel;
	const { nextSibling } = playerElement;
	if (nextSibling !== visibilitySentinel)
		parentElement.insertBefore(visibilitySentinel, nextSibling);
	return visibilitySentinel;
}
function getCommentsElement(): Nullable<Element> {
	return document.querySelector("ytd-comments") ?? document.querySelector("#comments");
}
function isElementVisible(element: Element) {
	const bounds = (element as HTMLElement).getBoundingClientRect();
	return (
		bounds.bottom > 0 &&
		bounds.right > 0 &&
		bounds.top < window.innerHeight &&
		bounds.left < window.innerWidth
	);
}
export const setCommentsMiniPlayerDefaults = (defaults: MiniPlayerOptions) => {
	cachedMiniPlayerDefaults = defaults;
	if (miniPlayerController) miniPlayerController.setDefaults(defaults, { forceApply: true });
};
/**
 * The player element can be missing for a long time (stripped pages) or render
 * late under load; waiting inline froze this feature's reconcile. Retry through
 * the player manager until the player exists, then attach observers.
 */
function attachCommentsAutoMiniPlayer(miniPlayer: MiniPlayerController): void {
	const task = () => {
		const playerElement =
			document.querySelector<Element>("#player") ??
			document.querySelector<Element>("#player-container");
		if (!playerElement) return false;
		cleanupAutoObservers();
		const visibilitySentinel = ensureSentinelBelowPlayer(playerElement);
		const attachObserver = (commentsElement: Element) => {
			let shouldAutoActivate = false;
			const evaluateVisibility = () => {
				ensureSentinelBelowPlayer(playerElement);
				const sentinelVisible = isElementVisible(visibilitySentinel);
				const commentsVisible = isElementVisible(commentsElement);
				const nextAutoState = !sentinelVisible && commentsVisible;
				if (nextAutoState === shouldAutoActivate) {
					emitMiniPlayerState(miniPlayer.isActive());
					return;
				}
				shouldAutoActivate = nextAutoState;
				miniPlayer.setAutoActive(shouldAutoActivate);
				emitMiniPlayerState(miniPlayer.isActive());
			};
			visibilityObserver = new IntersectionObserver(evaluateVisibility, {
				threshold: [0, 0.01, 0.05, 0.1]
			});
			visibilityObserver.observe(visibilitySentinel);
			visibilityObserver.observe(commentsElement);
			visibilityObserver.observe(playerElement);
			evaluateVisibility();
		};
		const commentsElement = getCommentsElement();
		if (commentsElement) {
			attachObserver(commentsElement);
			return true;
		}
		unsubscribeCommentsBus = subscribe(
			"ytd-comments, #comments",
			([foundComments]) => {
				if (!foundComments) return;
				unsubscribeCommentsBus?.();
				unsubscribeCommentsBus = null;
				attachObserver(foundComments);
			},
			{ once: true }
		);
		return true;
	};
	void registry.executeWithRetries("miniPlayer", [task], ["attach-comments-auto-mini-player"], {
		maxAttempts: 90,
		overallTimeout: 45000,
		waitForLoaded: true
	});
}
function getEnabledController(): Nullable<MiniPlayerController> {
	const { defaultPosition, defaultSize } = featureConfigManager.getLast("miniPlayer");
	return ensureController({
		defaultPosition,
		defaultSize
	});
}
export const toggleMiniPlayerManual = () => {
	const miniPlayer = getEnabledController();
	if (!miniPlayer) return;
	miniPlayer.toggleManual();
	emitMiniPlayerState(miniPlayer.isActive());
};
export const setMiniPlayerManual = (checked: boolean) => {
	const miniPlayer = getEnabledController();
	if (!miniPlayer) return;
	if (checked) {
		if (!miniPlayer.isActive()) miniPlayer.toggleManual();
	} else {
		if (miniPlayer.isActive()) miniPlayer.close();
	}
	emitMiniPlayerState(miniPlayer.isActive());
};
export const isMiniPlayerActive = () =>
	document.documentElement.classList.contains(MINI_PLAYER_ACTIVE_CLASS);
/**
 * Temporarily hides the mini player overlay (e.g. while another feature
 * borrows the video element). Returns a restore function. Both directions are
 * no-ops when the mini player is not active, so this is always safe to call.
 */
export const suspendMiniPlayerOverlay = (): (() => void) => {
	if (!miniPlayerController?.isActive()) return () => {};
	miniPlayerController.setOverlayHidden(true);
	return () => miniPlayerController?.setOverlayHidden(false);
};

function setupMiniPlayer(
	defaultPosition: MiniPlayerOptions["defaultPosition"],
	defaultSize: MiniPlayerOptions["defaultSize"]
) {
	const miniPlayer = ensureController({
		defaultPosition,
		defaultSize
	});
	attachCommentsAutoMiniPlayer(miniPlayer);
	emitMiniPlayerState(miniPlayer.isActive());
}

export default createFeature({
	...metadata,
	migrateFromLocalStorage: () => {
		const rectRaw = localStorage.getItem("yte_mini_player_state");
		const manualRaw = localStorage.getItem("yte_mini_player_manual_override");
		if (!rectRaw && !manualRaw) return undefined;
		return {
			manualOverride: manualRaw ? Boolean(JSON.parse(manualRaw)) : false,
			rect: rectRaw ? (JSON.parse(rectRaw) as MiniPlayerRect) : null
		};
	},
	onConfigChange: ({ defaultPosition, defaultSize }) => {
		setCommentsMiniPlayerDefaults({ defaultPosition, defaultSize });
	},
	onDisable: () => {
		cleanupAutoObservers();
		const sentinel = document.getElementById(MINI_PLAYER_SENTINEL_ID);
		sentinel?.remove();
		if (miniPlayerController) {
			miniPlayerController.destroy();
			miniPlayerController = null;
		}
		emitMiniPlayerState(false);
	},
	onEnable: ({ defaultPosition, defaultSize }) => {
		setManualOverride(false);
		setupMiniPlayer(defaultPosition, defaultSize);
	},
	onNavigate: ({ defaultPosition, defaultSize }) => {
		cleanupAutoObservers();
		const sentinel = document.getElementById(MINI_PLAYER_SENTINEL_ID);
		sentinel?.remove();

		const wasManualActive = miniPlayerController?.isActive() ? readManualOverride() : false;

		if (miniPlayerController) {
			miniPlayerController.destroy();
			miniPlayerController = null;
		}

		if (wasManualActive) {
			const miniPlayer = ensureController({
				defaultPosition,
				defaultSize
			});
			miniPlayer.toggleManual();
		}

		setupMiniPlayer(defaultPosition, defaultSize);
	},
	persistState: true,
	state: {
		manualOverride: false,
		rect: null
	}
});
