import type { Nullable } from "@/src/types";

import { delay, isShortsPage, isWatchPage, waitForAllElements, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";

let ambientModeWasEnabled = false;

const AMBIENT_MODE_PATH_SELECTOR =
	"path[d='M21 7v10H3V7h18m1-1H2v12h20V6zM11.5 2v3h1V2h-1zm1 17h-1v3h1v-3zM3.79 3 6 5.21l.71-.71L4.5 2.29 3.79 3zm2.92 16.5L6 18.79 3.79 21l.71.71 2.21-2.21zM19.5 2.29 17.29 4.5l.71.71L20.21 3l-.71-.71zm0 19.42.71-.71L18 18.79l-.71.71 2.21 2.21z']";

export async function disableAutomaticallyDisableAmbientMode(): Promise<void> {
	if (!ambientModeWasEnabled) return;
	await toggleAmbientMode(true);
}

export async function enableAutomaticallyDisableAmbientMode(): Promise<void> {
	const {
		data: {
			options: { enable_automatically_disable_ambient_mode }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_automatically_disable_ambient_mode) return;
	await toggleAmbientMode(false);
}

async function toggleAmbientMode(desiredState: boolean): Promise<void> {
	if (isWatchPage()) {
		await waitForAllElements(["div#player", "div#player-container", "div.ytp-settings-menu:not(#yte-feature-menu)"]);
		const settingsButton: Nullable<HTMLButtonElement> = document.querySelector("button.ytp-settings-button");
		const settingsMenu: Nullable<HTMLDivElement> = document.querySelector("div.ytp-settings-menu:not(#yte-feature-menu)");
		if (!settingsMenu) return;
		const settingsPanelMenu: Nullable<HTMLDivElement> = settingsMenu?.querySelector("div.ytp-panel-menu");
		if (!settingsButton || !settingsPanelMenu) return;
		if (!settingsPanelMenu.hasChildNodes()) {
			settingsMenu.classList.add("hidden");
			settingsButton.click();
			settingsButton.click();
		}
		const ambientModeMenuItem: Nullable<HTMLDivElement> = settingsPanelMenu.querySelector(
			`.ytp-menuitem:has(.ytp-menuitem-icon svg ${AMBIENT_MODE_PATH_SELECTOR})`
		);
		if (!ambientModeMenuItem) {
			settingsMenu.classList.remove("hidden");
			return;
		}
		const ambientModeEnabled = ambientModeMenuItem.getAttribute("aria-checked") === "true";
		if (ambientModeEnabled !== desiredState) {
			ambientModeMenuItem.click();
		}
		if (!desiredState) ambientModeWasEnabled = ambientModeEnabled;
		settingsMenu.classList.remove("hidden");
	} else if (isShortsPage()) {
		await waitForAllElements(["#shorts-player"]);
		const menuButton = await waitForElement<HTMLButtonElement>("div#menu-button ytd-menu-renderer yt-button-shape button");
		if (!menuButton) return console.log("Menu button not found");
		const popupContainer = await waitForElement<HTMLDivElement>("ytd-popup-container");
		if (!popupContainer) return console.log("Popup container not found");
		const {
			style: { display: originalDisplay }
		} = popupContainer;
		popupContainer.style.display = "none";
		// Click menu button to hydrate the menu
		menuButton.click();
		// Wait for the popup to appear
		const popup = await waitForElement<HTMLDivElement>("ytd-popup-container tp-yt-iron-dropdown");
		if (!popup) {
			popupContainer.style.display = originalDisplay;
			return console.log("Popup not found");
		}
		// Wait for ambient mode item
		const ambientModeItem = await waitForElement<HTMLButtonElement>(
			`div ytd-menu-popup-renderer tp-yt-paper-listbox > :has(tp-yt-paper-item svg ${AMBIENT_MODE_PATH_SELECTOR})`
		);
		if (!ambientModeItem) {
			popupContainer.style.display = originalDisplay;
			return console.log("Ambient mode item not found");
		}
		// Wait for the toggle inside the ambient mode item
		const ambientModeItemToggle = await waitForElement<HTMLInputElement>("tp-yt-paper-toggle-button");
		if (!ambientModeItemToggle) {
			popupContainer.style.display = originalDisplay;
			return console.log("Ambient mode item toggle not found");
		}
		// Determine current state
		const ambientModeEnabled = ambientModeItemToggle.getAttribute("checked") === "";
		if (!desiredState) ambientModeWasEnabled = ambientModeEnabled;
		// Toggle if needed
		if (ambientModeEnabled !== desiredState) {
			ambientModeItem.click();
			await delay(25);
			menuButton.click();
		} else {
			menuButton.click();
			// Restore display
			popupContainer.style.display = originalDisplay || "";
		}
	}
}
