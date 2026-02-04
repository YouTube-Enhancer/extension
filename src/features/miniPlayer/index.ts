import type { MiniPlayerPosition, MiniPlayerSize, Nullable } from "@/src/types";

import { createStyledElement, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";

import { MiniPlayerController, setManualOverride } from "./controller";

export type MiniPlayerOptions = {
	mini_player_default_position: MiniPlayerPosition;
	mini_player_default_size: MiniPlayerSize;
};

const MINI_PLAYER_STATE_EVENT = "yte-mini-player-state";
const SENTINEL_ID = "yte-mini-player-sentinel";

let miniPlayerController: Nullable<MiniPlayerController> = null;
let cachedMiniPlayerDefaults: Nullable<MiniPlayerOptions> = null;

let visibilityObserver: Nullable<IntersectionObserver> = null;
let commentsMutationObserver: Nullable<MutationObserver> = null;

let lastEmittedActiveState: Nullable<boolean> = null;

function cleanupAutoObservers() {
	visibilityObserver?.disconnect();
	visibilityObserver = null;
	commentsMutationObserver?.disconnect();
	commentsMutationObserver = null;
}
function emitMiniPlayerState(active: boolean) {
	if (lastEmittedActiveState === active) return;
	lastEmittedActiveState = active;
	document.dispatchEvent(new CustomEvent(MINI_PLAYER_STATE_EVENT, { detail: { active } }));
}
function ensureController(options: MiniPlayerOptions) {
	const defaults = cachedMiniPlayerDefaults ?? options;
	if (!miniPlayerController) {
		miniPlayerController = new MiniPlayerController(defaults);
	} else {
		miniPlayerController.setDefaults(defaults);
	}
	return miniPlayerController;
}
function ensureSentinelBelowPlayer(playerElement: Element): HTMLDivElement {
	let visibilitySentinel = document.getElementById(SENTINEL_ID) as Nullable<HTMLDivElement>;
	if (!visibilitySentinel) {
		visibilitySentinel = createStyledElement({
			elementId: SENTINEL_ID,
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
	if (nextSibling !== visibilitySentinel) parentElement.insertBefore(visibilitySentinel, nextSibling);
	return visibilitySentinel;
}
function getCommentsElement(): Nullable<Element> {
	return document.querySelector("ytd-comments") ?? document.querySelector("#comments");
}
function isElementVisible(element: Element) {
	const bounds = (element as HTMLElement).getBoundingClientRect();
	return bounds.bottom > 0 && bounds.right > 0 && bounds.top < window.innerHeight && bounds.left < window.innerWidth;
}
export const setCommentsMiniPlayerDefaults = (defaults: MiniPlayerOptions) => {
	cachedMiniPlayerDefaults = defaults;
	if (miniPlayerController) miniPlayerController.setDefaults(defaults, { forceApply: true });
};
async function attachCommentsAutoMiniPlayer(miniPlayer: MiniPlayerController) {
	cleanupAutoObservers();
	const playerElement = (await waitForElement<Element>("#player", 15000)) ?? (await waitForElement<Element>("#player-container", 15000));
	if (!playerElement) return;
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
		visibilityObserver = new IntersectionObserver(evaluateVisibility, { threshold: [0, 0.01, 0.05, 0.1] });
		visibilityObserver.observe(visibilitySentinel);
		visibilityObserver.observe(commentsElement);
		visibilityObserver.observe(playerElement);
		evaluateVisibility();
	};
	let commentsElement = getCommentsElement();
	if (!commentsElement) {
		commentsElement = await waitForElement<Element>("ytd-comments, #comments", 8000);
	}
	if (commentsElement) {
		attachObserver(commentsElement);
		return;
	}
	commentsMutationObserver = new MutationObserver(() => {
		const foundComments = getCommentsElement();
		if (!foundComments) return;
		commentsMutationObserver?.disconnect();
		commentsMutationObserver = null;
		attachObserver(foundComments);
	});
	commentsMutationObserver.observe(document.documentElement, { childList: true, subtree: true });
}
export const enableCommentsMiniPlayer = async () => {
	const {
		data: {
			options: { enable_comments_mini_player, mini_player_default_position, mini_player_default_size }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_comments_mini_player) return;
	setManualOverride(false);
	const miniPlayer = ensureController({
		mini_player_default_position,
		mini_player_default_size
	});
	await attachCommentsAutoMiniPlayer(miniPlayer);
	emitMiniPlayerState(miniPlayer.isActive());
};
export const disableCommentsMiniPlayer = async () => {
	cleanupAutoObservers();
	const sentinel = document.getElementById(SENTINEL_ID);
	sentinel?.remove();
	if (miniPlayerController) {
		miniPlayerController.destroy();
		miniPlayerController = null;
	}
	emitMiniPlayerState(false);
};
async function getEnabledController(): Promise<Nullable<MiniPlayerController>> {
	const {
		data: {
			options: { mini_player_default_position, mini_player_default_size }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	return ensureController({
		mini_player_default_position,
		mini_player_default_size
	});
}
export const toggleMiniPlayerManual = async () => {
	const miniPlayer = await getEnabledController();
	if (!miniPlayer) return;
	miniPlayer.toggleManual();
	emitMiniPlayerState(miniPlayer.isActive());
};
export const setMiniPlayerManual = async (checked: boolean) => {
	const miniPlayer = await getEnabledController();
	if (!miniPlayer) return;
	if (checked) {
		if (!miniPlayer.isActive()) miniPlayer.toggleManual();
	} else {
		if (miniPlayer.isActive()) miniPlayer.close();
	}
	emitMiniPlayerState(miniPlayer.isActive());
};
export const isMiniPlayerActive = () => miniPlayerController?.isActive() ?? false;
