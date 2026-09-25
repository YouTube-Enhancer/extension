import type { ButtonPlacement, FullscreenPlacement, Nullable } from "@/src/types";

import { createStyledElement } from "@/src/utils/dom/elements";
import { waitForElement } from "@/src/utils/dom/wait";
import { isNewYouTubeVideoLayout } from "@/src/utils/url";

import { buttonContainerId, playerControlsSelectors } from "./constants";

// ─── Module-level state ───────────────────────────────────────────

let fullscreenObserverActive = false;
let fullscreenObserver: Nullable<MutationObserver> = null;
let fullscreenDomHandler: Nullable<() => void> = null;

let theaterModeObserver: Nullable<MutationObserver> = null;
let theaterNavigationHandler: Nullable<() => void> = null;

let buttonContainerElement: Nullable<HTMLDivElement> = null;
let containerGeometryMutationObserver: Nullable<MutationObserver> = null;
let containerGeometryObserver: Nullable<ResizeObserver> = null;
let containerGeometryResizeHandler: Nullable<() => void> = null;
let observedPlayerElement: Nullable<HTMLDivElement> = null;

const rightControlsContainerId = "yte-right-controls-container";

// ─── Exported functions ───────────────────────────────────────────

export function ensureContainerPosition() {
	const container = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
	if (!container) return;
	const inTheaterMode = isInTheaterMode();
	const { parentElement: currentParent } = container;
	if (!currentParent) return;
	const isNewLayout = isNewYouTubeVideoLayout();
	const expectedParent =
		inTheaterMode ?
			isNewLayout ? document.querySelector("ytd-watch-grid")
			:	document.querySelector("ytd-watch-flexy")
		:	document.querySelector("div#primary > div#primary-inner");
	if (currentParent === expectedParent) {
		syncContainerGeometry();
		return;
	}
	if (inTheaterMode) {
		const parent = expectedParent as HTMLElement;
		const columns = parent?.querySelector("#columns");
		if (columns) parent.insertBefore(container, columns);
	} else {
		const player = expectedParent?.querySelector("#player");
		if (player) {
			player.insertAdjacentElement("afterend", container);
		} else {
			requestAnimationFrame(() => {
				ensureContainerPosition();
			});
			return;
		}
	}
	syncContainerGeometry();
}

export function getEffectivePlacement(placement: ButtonPlacement, fullscreenPlacement: FullscreenPlacement): ButtonPlacement {
	return isFullscreen() && fullscreenPlacement !== "same" ? fullscreenPlacement : placement;
}

export async function getOrCreateButtonContainer(inTheaterMode: boolean): Promise<Nullable<HTMLDivElement>> {
	let container = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
	if (container) {
		buttonContainerElement = container;
		return container;
	}
	container = createStyledElement({
		elementId: buttonContainerId,
		elementType: "div",
		styles: { display: "flex", height: "48px", justifyContent: "center" }
	});
	buttonContainerElement = container;
	if (inTheaterMode) {
		const isNewLayout = isNewYouTubeVideoLayout();
		const parent = isNewLayout ? document.querySelector<HTMLElement>("ytd-watch-grid") : document.querySelector<HTMLElement>("ytd-watch-flexy");
		if (!parent) return null;
		const columns = parent.querySelector("#columns");
		if (columns) {
			parent.insertBefore(container, columns);
			return container;
		}
		parent.append(container);
		return container;
	}
	const player = await waitForElement<HTMLDivElement>("div#primary > div#primary-inner > div#player");
	if (!player) return null;
	player.insertAdjacentElement("afterend", container);
	return container;
}

export async function getOrCreateRightControlsContainer(): Promise<Nullable<HTMLDivElement>> {
	const rightControls = await waitForElement<HTMLDivElement>(playerControlsSelectors.player_controls_right, 15000);
	if (!rightControls) return null;
	let container = rightControls.querySelector<HTMLDivElement>(`#${rightControlsContainerId}`);
	if (!container) {
		container = createStyledElement({
			elementId: rightControlsContainerId,
			elementType: "div",
			styles: { alignItems: "center", display: "flex" }
		});
		const leftSide = rightControls.querySelector<HTMLDivElement>(".ytp-right-controls-left");
		if (leftSide) leftSide.insertAdjacentElement("beforebegin", container);
		else rightControls.prepend(container);
	}
	return container;
}

export async function getPlacementRoot(placement: ButtonPlacement) {
	switch (placement) {
		case "below_player":
			return document.getElementById(buttonContainerId) as HTMLDivElement | null;
		case "feature_menu":
			return await waitForElement<HTMLDivElement>("#yte-feature-menu");
		case "player_controls_left":
			return await waitForElement<HTMLDivElement>(playerControlsSelectors.player_controls_left);
		case "player_controls_right":
			return await waitForElement<HTMLDivElement>(playerControlsSelectors.player_controls_right, 15000);
	}
}

export function getPlacementSelector(placement: ButtonPlacement): string | undefined {
	if (placement === "below_player") {
		return (
			isInTheaterMode() ?
				isNewYouTubeVideoLayout() ? "ytd-watch-grid"
				:	"ytd-watch-flexy"
			:	"div#primary > div#primary-inner > div#player"
		);
	}
	if (placement === "feature_menu") return "#yte-feature-menu";
	if (placement === "player_controls_left" || placement === "player_controls_right") return playerControlsSelectors[placement];
	return undefined;
}

export function isFullscreen(): boolean {
	return !!document.fullscreenElement || document.querySelector("ytd-app[fullscreen]") !== null;
}

export function isInTheaterMode(): boolean {
	return (
		document.querySelector<HTMLButtonElement>(isNewYouTubeVideoLayout() ? "ytd-watch-grid" : "ytd-watch-flexy")?.hasAttribute("theater") ?? false
	);
}

export async function placeButton(button: HTMLButtonElement, placement: Exclude<ButtonPlacement, "feature_menu">) {
	switch (placement) {
		case "below_player": {
			const inTheaterMode = isInTheaterMode();
			const container = await getOrCreateButtonContainer(inTheaterMode);
			if (!container) return;
			await startTheaterModeObserver();
			await startContainerGeometryObserver();
			const existingInContainer = container.querySelectorAll(`#${button.id}`);
			existingInContainer.forEach((b) => b.remove());
			container.append(button);
			break;
		}
		case "player_controls_left": {
			const leftControls = await waitForElement<HTMLDivElement>(".ytp-left-controls");
			if (!leftControls) return;
			const existingInContainer = leftControls.querySelectorAll(`#${button.id}`);
			existingInContainer.forEach((b) => b.remove());
			const timeDisplay = leftControls.querySelector<HTMLDivElement>(".ytp-time-display");
			if (timeDisplay) timeDisplay.insertAdjacentElement("beforebegin", button);
			break;
		}
		case "player_controls_right": {
			const container = await getOrCreateRightControlsContainer();
			if (!container) return;
			const existingInContainer = container.querySelectorAll(`#${button.id}`);
			existingInContainer.forEach((b) => b.remove());
			container.append(button);
			break;
		}
	}
}

export function startPlacementTracking(onFullscreenChange: () => void) {
	if (!fullscreenObserverActive) {
		fullscreenObserverActive = true;
		startFullscreenObserver(onFullscreenChange);
	}
}

export async function startTheaterModeObserver() {
	if (theaterModeObserver) return;
	const sizeButton = await waitForElement<HTMLButtonElement>("button.ytp-size-button");
	if (!sizeButton) return;
	const scheduleReposition = () => {
		requestAnimationFrame(() => {
			ensureContainerPosition();
		});
	};
	theaterModeObserver = new MutationObserver(scheduleReposition);
	theaterModeObserver.observe(sizeButton, { attributeFilter: ["class"], attributes: true, childList: true, subtree: true });
	const watchElement = document.querySelector<HTMLElement>("ytd-watch-flexy, ytd-watch-grid");
	if (watchElement) {
		theaterModeObserver.observe(watchElement, { attributeFilter: ["theater"], attributes: true });
	}
	theaterNavigationHandler = () => {
		stopTheaterModeObserver();
		stopContainerGeometryObserver();
	};
	document.addEventListener("yt-navigate-start", theaterNavigationHandler);
}

export function stopPlacementTracking() {
	stopContainerGeometryObserver();
	if (fullscreenObserverActive) {
		fullscreenObserverActive = false;
		stopFullscreenObserver();
	}
}

export function stopTheaterModeObserver() {
	if (theaterNavigationHandler) {
		document.removeEventListener("yt-navigate-start", theaterNavigationHandler);
		theaterNavigationHandler = null;
	}
	theaterModeObserver?.disconnect();
	theaterModeObserver = null;
}

// ─── Private helpers ──────────────────────────────────────────────

function onFullscreenChange() {
	fullscreenDomHandler?.();
}

async function startContainerGeometryObserver() {
	if (containerGeometryObserver) return;
	const player = await waitForElement<HTMLDivElement>("#movie_player", 15000);
	if (!player || containerGeometryObserver) return;
	containerGeometryObserver = new ResizeObserver(() => {
		requestAnimationFrame(syncContainerGeometry);
	});
	containerGeometryObserver.observe(player);
	observedPlayerElement = player;
	const watchElement = document.querySelector("ytd-watch-flexy, ytd-watch-grid");
	if (watchElement) {
		containerGeometryMutationObserver = new MutationObserver(() => {
			requestAnimationFrame(syncContainerGeometry);
		});
		containerGeometryMutationObserver.observe(watchElement, { attributes: true });
	}
	containerGeometryResizeHandler = () => syncContainerGeometry();
	window.addEventListener("resize", containerGeometryResizeHandler);
	syncContainerGeometry();
}

function startFullscreenObserver(callback: () => void) {
	fullscreenDomHandler = callback;
	const target = document.querySelector("ytd-app");
	if (target) {
		fullscreenObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === "attributes" && mutation.attributeName === "fullscreen") {
					callback();
				}
			}
		});
		fullscreenObserver.observe(target, { attributeFilter: ["fullscreen"], attributes: true });
	}
	document.addEventListener("fullscreenchange", onFullscreenChange, { passive: true });
}

function stopContainerGeometryObserver() {
	containerGeometryObserver?.disconnect();
	containerGeometryObserver = null;
	containerGeometryMutationObserver?.disconnect();
	containerGeometryMutationObserver = null;
	observedPlayerElement = null;
	if (containerGeometryResizeHandler) {
		window.removeEventListener("resize", containerGeometryResizeHandler);
		containerGeometryResizeHandler = null;
	}
}

function stopFullscreenObserver() {
	fullscreenObserver?.disconnect();
	fullscreenObserver = null;
	document.removeEventListener("fullscreenchange", onFullscreenChange);
	fullscreenDomHandler = null;
	fullscreenObserverActive = false;
}

function syncContainerGeometry() {
	const container = buttonContainerElement;
	if (!container?.isConnected) return;
	if (isFullscreen()) return;
	const player = document.querySelector<HTMLDivElement>("#movie_player");
	if (!player) return;
	if (observedPlayerElement !== player && containerGeometryObserver) {
		containerGeometryObserver.disconnect();
		containerGeometryObserver.observe(player);
		observedPlayerElement = player;
	}
	const playerRect = player.getBoundingClientRect();
	if (playerRect.width === 0) return;
	container.style.width = `${playerRect.width}px`;
	const currentMarginLeft = parseFloat(container.style.marginLeft) || 0;
	const naturalLeft = container.getBoundingClientRect().left - currentMarginLeft;
	container.style.marginLeft = `${playerRect.left - naturalLeft}px`;
}
