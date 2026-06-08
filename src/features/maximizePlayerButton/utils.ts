import type { Nullable, YouTubeNavigateStart, YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { registry } from "@/src/features/_registry/featureRegistry";
import { getFeatureButton, modifyIconForLightTheme, updateFeatureButtonIcon, updateFeatureButtonTitle } from "@/src/features/buttonPlacement/utils";
import { getFeatureIcon } from "@/src/icons";
import { type ModifyElementAction } from "@/src/utils/dom/classList";
import { waitForElement, waitForPlayerLoaded } from "@/src/utils/dom/wait";
import { isNewYouTubeVideoLayout } from "@/src/utils/url";
const maximizePlayerButtonStateAPI = registry.stateManager.getStateAPI("maximizePlayerButton");
export type PlayerControllerState = {
	header: HeaderState;
	isProgrammaticClick: boolean;
	listenersAttached: boolean;
};

type HeaderState = {
	timeout: Nullable<number>;
	visible: boolean;
};

async function changeMaximizeButtonToOff() {
	const button = getFeatureButton("maximizePlayerButton");
	if (!button || !(button instanceof HTMLButtonElement)) return;
	button.ariaChecked = "false";
	const icon = getFeatureIcon("maximizePlayerButton", "player_controls_left");
	if (icon && typeof icon === "object" && "off" in icon) {
		updateFeatureButtonIcon(button, await modifyIconForLightTheme(icon.off, true));
	}
	updateFeatureButtonTitle(
		"maximizePlayerButton",
		window.i18nextInstance.t((translations) => translations.pages.content.features.maximizePlayerButton.button.toggle.off)
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
	if (!["Escape", "t"].includes(e.key) || (e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable='true']")) return;
	const state = getPlayerControllerState();
	if (!state.listenersAttached) return;
	e.preventDefault();
	void minimizePlayer();
};
export async function maximizePlayer() {
	const videoPlayer = await waitForElement<HTMLVideoElement>("video.html5-main-video");
	if (!videoPlayer) return;
	const sizeElement = await waitForElement<HTMLButtonElement>("button.ytp-size-button");
	if (!sizeElement) return;
	const header = await waitForElement<HTMLElement>("#masthead-container");
	if (!header) return;
	// Wait for player to be fully loaded
	const moviePlayer = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	if (!moviePlayer) return;
	await waitForPlayerLoaded(moviePlayer);
	const inTheaterMode =
		document.querySelector<HTMLButtonElement>(isNewYouTubeVideoLayout() ? "ytd-watch-grid" : "ytd-watch-flexy")?.hasAttribute("theater") ?? false;
	if (!inTheaterMode) clickAndRestore(sizeElement);
	adjustPlayer("add");
	const { height } = header.getBoundingClientRect();
	document.body.setAttribute("yte-size-button-state", inTheaterMode ? "theater" : "default");
	document.body.style.setProperty("--yte-header-height", `${height}px`);
	document.body.style.setProperty("--yte-video-height", `${window.innerHeight}px`);
	window.addEventListener("resize", handleResize);
	document.addEventListener("mousemove", headerMouseMoveHandler);
	document.addEventListener("yt-navigate-start", navigateStartHandler);
	attachRuntimeListeners();
}
export async function minimizePlayer() {
	const lastState = document.body.getAttribute("yte-size-button-state");
	const sizeElement = await waitForElement<HTMLButtonElement>("button.ytp-size-button");
	if (lastState === "default" && sizeElement) clickAndRestore(sizeElement);
	adjustPlayer("remove");
	destroyPlayerController();
	showHeader();
	clearHeaderTimeout();
	void changeMaximizeButtonToOff();
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
	const pip = document.querySelector<HTMLButtonElement>("button.ytp-pip-button");
	const size = document.querySelector<HTMLButtonElement>("button.ytp-size-button");
	const mini = document.querySelector<HTMLButtonElement>("button.ytp-miniplayer-button");
	[pip, size, mini].forEach((el) => {
		if (!el) return;
		eventManager.addEventListener(el, "click", handleUserClick, "maximizePlayerButton");
	});
	document.addEventListener("keydown", onKeyDown, true);
	setPlayerControllerState((prev) => ({
		...prev,
		listenersAttached: true
	}));
}

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
