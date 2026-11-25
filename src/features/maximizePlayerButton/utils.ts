import type { Nullable, YouTubeNavigateStart } from "@/src/types";
import type { ModifyElementAction } from "@/src/utils/dom/classList";

import eventManager from "@/src/events/EventManager";
import { registry } from "@/src/features/_registry/featureRegistry";
import {
	modifyIconForLightTheme,
	updateFeatureButtonChecked,
	updateFeatureButtonIconByName,
	updateFeatureButtonTitle
} from "@/src/features/buttonController";
import { getFeatureIcon } from "@/src/icons";
import { whenReady } from "@/src/utils/dom/readiness";
import { waitForElement } from "@/src/utils/dom/wait";
import { isNewYouTubeVideoLayout } from "@/src/utils/url";
const maximizePlayerButtonStateAPI = registry.getStateAPI("maximizePlayerButton");
export type PlayerControllerState = {
	header: HeaderState;
	isProgrammaticClick: boolean;
	listenersAttached: boolean;
};

type HeaderState = {
	timeout: Nullable<number>;
	visible: boolean;
};

function changeMaximizeButtonState(maximized: boolean) {
	/**
	 * The player is maximized and minimized from outside the button too: Escape, navigation and YouTube's own size
	 * buttons. The controller keeps aria-checked, the menu item's checked class and the tracked record (which a
	 * relocated button is rebuilt from) in step, so it is told the new state.
	 */
	updateFeatureButtonChecked("maximizePlayerButton", maximized);
	const icon = getFeatureIcon("maximizePlayerButton", "player_controls_left");
	updateFeatureButtonIconByName(
		"maximizePlayerButton",
		modifyIconForLightTheme(maximized ? icon.on : icon.off)
	);
	updateFeatureButtonTitle(
		"maximizePlayerButton",
		window.i18nextInstance.t(
			(translations) =>
				translations.pages.content.features.maximizePlayerButton.button.toggle[
					maximized ? "on" : "off"
				]
		)
	);
}
function clearHeaderTimeout() {
	const state = getPlayerControllerState();
	if (state.header.timeout) {
		clearTimeout(state.header.timeout);
		setHeaderTimeout(null);
	}
}
function destroyPlayerController() {
	document.body.removeAttribute("yte-size-button-state");
	document.body.style.removeProperty("--yte-header-height");
	document.body.style.removeProperty("--yte-video-height");
	window.removeEventListener("resize", handleResize);
	document.removeEventListener("mousemove", headerMouseMoveHandler);
	document.removeEventListener("yt-navigate-start", navigateStartHandler);
	document.removeEventListener("keydown", onKeyDown, true);
	resetFeatureState();
}
function getPlayerControllerState() {
	const state = maximizePlayerButtonStateAPI.getState();
	return state;
}
function handleUserClick() {
	const state = getPlayerControllerState();
	if (state.isProgrammaticClick) return;
	void minimizePlayer();
}
function hideHeader() {
	const header = document.querySelector<HTMLElement>("#masthead-container");
	if (!header) return;
	const state = getPlayerControllerState();
	if (!state.header.visible) return;
	header.classList.remove("yte-header-visible");
	setHeaderVisible(false);
}

function resetFeatureState() {
	const state = getPlayerControllerState();
	if (state.header.timeout) {
		clearTimeout(state.header.timeout);
	}
	setPlayerControllerState(() => ({
		header: {
			timeout: null,
			visible: false
		},
		isProgrammaticClick: false,
		listenersAttached: false
	}));
}
function setHeaderTimeout(timeout: Nullable<number>) {
	setPlayerControllerState((prev) => ({
		...prev,
		header: {
			...prev.header,
			timeout
		}
	}));
}
function setHeaderVisible(visible: boolean) {
	setPlayerControllerState((prev) => ({
		...prev,
		header: {
			...prev.header,
			visible
		}
	}));
}

function setPlayerControllerState(updater: (prev: PlayerControllerState) => PlayerControllerState) {
	maximizePlayerButtonStateAPI.setState(updater);
}

function setProgrammaticClick(value: boolean) {
	setPlayerControllerState((prev) => ({
		...prev,
		isProgrammaticClick: value
	}));
}
function showHeader() {
	const header = document.querySelector<HTMLElement>("#masthead-container");
	if (!header) return;

	const state = getPlayerControllerState();
	if (state.header.visible) return;

	header.classList.add("yte-header-visible");
	setHeaderVisible(true);
}
const headerMouseMoveHandler = (e: MouseEvent) => {
	const header = document.querySelector<HTMLElement>("#masthead-container");
	if (!header) return;
	const { height } = header.getBoundingClientRect();
	const state = getPlayerControllerState();
	if (e.clientY <= height) {
		if (!state.header.timeout) {
			const timeout = window.setTimeout(() => {
				showHeader();
				setHeaderTimeout(null);
			}, 300);
			setHeaderTimeout(timeout);
		}
	} else {
		if (state.header.timeout) {
			clearTimeout(state.header.timeout);
			setHeaderTimeout(null);
		}
		hideHeader();
	}
};

const handleResize = () => {
	document.body.style.setProperty("--yte-video-height", `${window.innerHeight}px`);
};
function runProgrammaticClick(fn: () => void) {
	setProgrammaticClick(true);
	try {
		fn();
	} finally {
		window.setTimeout(() => {
			setProgrammaticClick(false);
		}, 100);
	}
}
const navigateStartHandler = (e: CustomEvent<YouTubeNavigateStart>) => {
	if (e.detail.pageType === "watch") return;
	void minimizePlayer();
};
const onKeyDown = (e: KeyboardEvent) => {
	if (
		!["Escape", "t"].includes(e.key) ||
		(e.target as Nullable<HTMLElement>)?.closest("input, textarea, [contenteditable='true']")
	)
		return;
	const state = getPlayerControllerState();
	if (!state.listenersAttached) return;
	e.preventDefault();
	void minimizePlayer();
};
/**
 * Whether the last maximize attempt actually landed. `body[yte-maximized]` is set unconditionally
 * by maximizePlayer, so it only proves the extension committed to being maximized; the layout that
 * defines it is YouTube's theater attribute flipping on the watch container. When automaticTheaterMode
 * owns theater, maximizePlayer skips its own click and records `yte-size-button-state="theater"`
 * instead - that flip then belongs to the theater feature's own retry, so it counts as landed here.
 */
export function isMaximizeLanded(): boolean {
	if (document.body.getAttribute("yte-maximized") !== "") return false;
	if (document.body.getAttribute("yte-size-button-state") === "theater") return true;
	return (
		document
			.querySelector<HTMLDivElement>("ytd-watch-flexy, ytd-watch-grid")
			?.hasAttribute("theater") ?? false
	);
}
/**
 * One maximize attempt for the player retry seam. maximizePlayer's element/readiness waits are
 * one-shot budgets, and a player transition (theater mode re-renders the controls, live starts
 * late) can outlast them, which used to drop the user's click for the rest of the page. The task
 * reports whether the maximize actually landed, so the seam retries the failed wait instead.
 */
export function makeMaximizeTask(attemptTimeout = 2500): () => Promise<boolean> {
	return async (): Promise<boolean> => {
		await maximizePlayer(attemptTimeout);
		return isMaximizeLanded();
	};
}
export async function maximizePlayer(timeout = 2500) {
	// Wait for player to be fully loaded
	const moviePlayer = await whenReady("pagePlayerReady", { timeout });
	if (!moviePlayer) return;
	// The video and size button live inside the player, so they are queried from the resolved
	// root instead of waiting for them through the generic DOM wait (readiness seam: player
	// presence waits belong to whenReady).
	const videoPlayer = moviePlayer.querySelector<HTMLVideoElement>("video.html5-main-video");
	if (!videoPlayer) return;
	const sizeElement = moviePlayer.querySelector<HTMLButtonElement>("button.ytp-size-button");
	if (!sizeElement) return;
	// Page chrome, not player-owned: it stays a generic wait by design.
	const header = await waitForElement<HTMLElement>("#masthead-container", timeout);
	if (!header) return;
	const inTheaterMode =
		document
			.querySelector<HTMLButtonElement>(
				isNewYouTubeVideoLayout() ? "ytd-watch-grid" : "ytd-watch-flexy"
			)
			?.hasAttribute("theater") ?? false;
	const theaterConfig = registry.getConfig("automaticTheaterMode");
	const theaterEnabled = "enabled" in theaterConfig && theaterConfig.enabled;
	if (!inTheaterMode && !theaterEnabled) clickAndRestore(sizeElement);
	adjustPlayer("add");
	void changeMaximizeButtonState(true);
	const { height } = header.getBoundingClientRect();
	// Set-once: the attribute records the layout this maximize STARTED from, and the retry seam
	// re-enters maximizePlayer after the theater flip has already landed. A later attempt would read
	// inTheaterMode=true, skip its own click and rewrite the record to "theater" - which misreports
	// the starting layout and makes minimizePlayer skip its restoring size-button click, leaving
	// theater engaged after a restore that claims success. The first entry owns the value; a retry
	// only refreshes the styles below.
	if (!document.body.hasAttribute("yte-size-button-state")) {
		document.body.setAttribute(
			"yte-size-button-state",
			inTheaterMode || theaterEnabled ? "theater" : "default"
		);
	}
	document.body.style.setProperty("--yte-header-height", `${height}px`);
	document.body.style.setProperty("--yte-video-height", `${window.innerHeight}px`);
	window.addEventListener("resize", handleResize);
	document.addEventListener("mousemove", headerMouseMoveHandler);
	document.addEventListener("yt-navigate-start", navigateStartHandler);
	attachRuntimeListeners();
}
export async function minimizePlayer() {
	// The last action wins: a minimize must supersede a maximize retry that is still waiting out a
	// player transition (theater re-render, slow readiness), or the retry's next attempt would
	// re-maximize after the user has already asked for the normal layout back.
	registry.cleanupPlayerRetry("maximizePlayerButton");
	const lastState = document.body.getAttribute("yte-size-button-state");
	// Same readiness-first pattern as maximizePlayer: the size button lives inside the player, so
	// the player presence wait replaces the button wait (presence-only budget, as before).
	const player = await whenReady("pagePlayer", { timeout: 2500 });
	const sizeElement = player?.querySelector<HTMLButtonElement>("button.ytp-size-button");
	if (lastState === "default" && sizeElement) {
		const autoTheaterConfig = registry.getConfig("automaticTheaterMode");
		if (!("enabled" in autoTheaterConfig) || !autoTheaterConfig.enabled)
			clickAndRestore(sizeElement);
	}
	adjustPlayer("remove");
	destroyPlayerController();
	showHeader();
	clearHeaderTimeout();
	void changeMaximizeButtonState(false);
}

function adjustPlayer(action: ModifyElementAction) {
	switch (action) {
		case "add":
			document.body.style.overflow = "";
			document.body.setAttribute("yte-maximized", "");
			break;
		case "remove":
			document.body.style.overflow = "";
			document.body.removeAttribute("yte-maximized");
			break;
	}
}
function attachRuntimeListeners() {
	const state = getPlayerControllerState();
	if (state.listenersAttached) return;
	// Delegated from document: YouTube replaces the player control buttons when the player layout
	// changes (theater/fullscreen toggles re-render the controls), which orphans per-element click
	// listeners and leaves the extension unable to react to its own runtime exit paths.
	eventManager.addEventListener(
		document,
		"click",
		handleRuntimeButtonClick,
		"maximizePlayerButton"
	);
	document.addEventListener("keydown", onKeyDown, true);
	setPlayerControllerState((prev) => ({
		...prev,
		listenersAttached: true
	}));
}
const playerControlButtonsSelector =
	"button.ytp-size-button, button.ytp-pip-button, button.ytp-miniplayer-button";

function clickAndRestore(sizeElement: HTMLButtonElement) {
	const original = {
		ariaLabel: sizeElement.getAttribute("aria-label") ?? "",
		d: sizeElement.querySelector("svg path")?.getAttribute("d") ?? "",
		titleNoTooltip: sizeElement.getAttribute("data-title-no-tooltip") ?? "",
		tooltipTitle: sizeElement.getAttribute("data-tooltip-title") ?? ""
	};
	runProgrammaticClick(() => {
		sizeElement.click();
	});
	setTimeout(() => {
		const newButton = document.querySelector<HTMLButtonElement>("button.ytp-size-button");
		if (!newButton) {
			setProgrammaticClick(false);
			return;
		}
		const path = newButton.querySelector("svg path");
		if (path) path.setAttribute("d", original.d);
		newButton.setAttribute("aria-label", original.ariaLabel);
		newButton.setAttribute("data-title-no-tooltip", original.titleNoTooltip);
		newButton.setAttribute("data-tooltip-title", original.tooltipTitle);
		setProgrammaticClick(false);
	}, 50);
}
function handleRuntimeButtonClick(event: MouseEvent) {
	if (!(event.target instanceof Element) || !event.target.closest(playerControlButtonsSelector))
		return;
	handleUserClick();
}
