import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { waitForElement } from "@/src/utils/dom/wait";
import { isLivePage, isNewYouTubeVideoLayout, isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onDisable: () => {
		// A setup still waiting for its elements would otherwise pass its generation check and install listeners after this.
		setupGeneration++;
		eventManager.removeEventListeners("openYouTubeSettingsOnHover");
	},
	onEnable: async () => {
		await setupHoverListeners();
	},
	onNavigate: async () => {
		await setupHoverListeners();
	}
});

// Bumped by every setup; a setup that finds itself outdated after its waits leaves the listeners to the newer one.
// onEnable and onNavigate can run this concurrently on a page load, and two surviving sets would click the
// settings button twice per hover, which opens the menu and closes it again.
let setupGeneration = 0;

async function setupHoverListeners() {
	const generation = ++setupGeneration;
	eventManager.removeEventListeners("openYouTubeSettingsOnHover");
	const settingsButton = await waitForElement<HTMLButtonElement>(".ytp-button.ytp-settings-button");
	if (!settingsButton) return;
	const settingsMenu = await waitForElement<HTMLDivElement>(settingsPanelMenuSelector);
	if (!settingsMenu) return;
	// Get the player element
	const playerContainer =
		isWatchPage() || isLivePage() ?
			await waitForElement<HTMLDivElement>(isNewYouTubeVideoLayout() ? "div#player-container.ytd-watch-grid" : "div#player-container.ytd-watch-flexy")
		:	null;
	// If player element is not available, return
	if (!playerContainer) return;
	if (generation !== setupGeneration) return;
	const isSettingsOpen = () => settingsButton.getAttribute("aria-expanded") === "true";
	// Where the pointer last was. The menu's hover state and its mouseleave cannot be trusted at the moment YouTube
	// swaps the panel (opening the Quality or Playback speed submenu): the menu fires a mouseleave and stops matching
	// :hover although the pointer has not moved, and acting on that closed the submenu the moment it opened. The
	// pointer's position against the live menu and button rectangles is what decides instead.
	let pointer = { x: -1, y: -1 };
	const trackPointer = (event: MouseEvent) => {
		pointer = { x: event.clientX, y: event.clientY };
	};
	const pointerIsOver = (element: Element) => {
		const rect = element.getBoundingClientRect();
		return rect.width > 0 && pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
	};
	let hideTimeout: Nullable<ReturnType<typeof setTimeout>> = null;
	const cancelHide = () => {
		if (hideTimeout) {
			clearTimeout(hideTimeout);
			hideTimeout = null;
		}
	};
	const showSettings = () => {
		cancelHide();
		if (isSettingsOpen()) return;
		settingsButton.click();
	};
	const hideSettings = () => {
		hideTimeout = null;
		if (!isSettingsOpen()) return;
		if (pointerIsOver(settingsMenu) || pointerIsOver(settingsButton)) return;
		settingsButton.click();
	};
	// A short delay lets the pointer travel from the button into the menu.
	const scheduleHide = () => {
		cancelHide();
		hideTimeout = setTimeout(hideSettings, 50);
	};
	eventManager.addEventListener(document, "mousemove", trackPointer, "openYouTubeSettingsOnHover");
	eventManager.addEventListener(settingsButton, "mouseenter", showSettings, "openYouTubeSettingsOnHover");
	eventManager.addEventListener(settingsButton, "mouseleave", scheduleHide, "openYouTubeSettingsOnHover");
	eventManager.addEventListener(settingsMenu, "mouseenter", cancelHide, "openYouTubeSettingsOnHover");
	eventManager.addEventListener(settingsMenu, "mouseleave", scheduleHide, "openYouTubeSettingsOnHover");
	// A click inside the menu is the user working the menu; YouTube closes it itself when a choice calls for that.
	eventManager.addEventListener(settingsMenu, "click", cancelHide, "openYouTubeSettingsOnHover");
}
