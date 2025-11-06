import type { Nullable } from "@/src/types";

import { delay, getLayoutType, isShortsPage, isWatchPage, waitForAllElements, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";

let ambientModeWasEnabled = false;
const ambientModePathSelectors: Record<"shorts" | "watch", Record<"legacy" | "modern", string>> = {
	shorts: {
		legacy:
			"tp-yt-paper-item:has(svg path[d='M21 7v10H3V7h18m1-1H2v12h20V6zM11.5 2v3h1V2h-1zm1 17h-1v3h1v-3zM3.79 3 6 5.21l.71-.71L4.5 2.29 3.79 3zm2.92 16.5L6 18.79 3.79 21l.71.71 2.21-2.21zM19.5 2.29 17.29 4.5l.71.71L20.21 3l-.71-.71zm0 19.42.71-.71L18 18.79l-.71.71 2.21 2.21z'])",
		modern:
			"tp-yt-paper-item:has(svg path[d='M12 .5a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1Zm6.793.793-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5a1 1 0 10-1.414-1.414Zm-15 0a1 1 0 000 1.414l1.5 1.5a1 1 0 101.414-1.414l-1.5-1.5a1 1 0 00-1.414 0ZM19 6H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2ZM5 16V8h14v8H5Zm12.293 3.792a1.001 1.001 0 000 1.415l1.5 1.5a1 1 0 001.414-1.415l-1.5-1.5a1 1 0 00-1.414 0Zm-12 0-1.5 1.5a1 1 0 101.414 1.415l1.5-1.5a1 1 0 10-1.414-1.415ZM12 19.5a1 1 0 00-1 1v2a1 1 0 002 0v-2a1 1 0 00-1-1Z'])"
	},
	watch: {
		legacy:
			".ytp-menuitem:has(.ytp-menuitem-icon svg path[d='M21 7v10H3V7h18m1-1H2v12h20V6zM11.5 2v3h1V2h-1zm1 17h-1v3h1v-3zM3.79 3 6 5.21l.71-.71L4.5 2.29 3.79 3zm2.92 16.5L6 18.79 3.79 21l.71.71 2.21-2.21zM19.5 2.29 17.29 4.5l.71.71L20.21 3l-.71-.71zm0 19.42.71-.71L18 18.79l-.71.71 2.21 2.21z'])",
		modern:
			".ytp-menuitem:has(.ytp-menuitem-icon svg path[d='M12 .5C11.73 .5 11.48 .60 11.29 .79C11.10 .98 11 1.23 11 1.5V3.5C11 3.76 11.10 4.01 11.29 4.20C11.48 4.39 11.73 4.5 12 4.5C12.26 4.5 12.51 4.39 12.70 4.20C12.89 4.01 13 3.76 13 3.5V1.5C13 1.23 12.89 .98 12.70 .79C12.51 .60 12.26 .5 12 .5ZM3.79 1.29C3.61 1.46 3.51 1.70 3.50 1.94C3.48 2.19 3.56 2.43 3.72 2.63L3.79 2.70L5.29 4.20L5.37 4.27C5.56 4.42 5.80 4.50 6.04 4.49C6.29 4.47 6.52 4.37 6.70 4.20C6.87 4.02 6.97 3.79 6.99 3.54C7.00 3.30 6.92 3.06 6.77 2.86L6.70 2.79L5.20 1.29L5.13 1.22C4.93 1.06 4.69 .98 4.44 1.00C4.20 1.01 3.96 1.11 3.79 1.29ZM18.86 1.22L18.79 1.29L17.29 2.79L17.22 2.86C17.07 3.06 16.99 3.30 17.00 3.54C17.01 3.79 17.12 4.02 17.29 4.20C17.47 4.37 17.70 4.48 17.95 4.49C18.19 4.50 18.43 4.42 18.63 4.27L18.70 4.20L20.20 2.70L20.27 2.63C20.42 2.43 20.50 2.19 20.49 1.95C20.48 1.70 20.37 1.47 20.20 1.29C20.02 1.12 19.79 1.01 19.54 1.00C19.30 .99 19.06 1.07 18.86 1.22ZM19.20 6.01L19 6H5L4.79 6.01C4.30 6.06 3.84 6.29 3.51 6.65C3.18 7.02 2.99 7.50 3 8V16L3.01 16.20C3.05 16.66 3.26 17.08 3.58 17.41C3.91 17.73 4.33 17.94 4.79 17.99L5 18H19L19.20 17.98C19.66 17.94 20.08 17.73 20.41 17.41C20.73 17.08 20.94 16.66 20.99 16.20L21 16V8C20.99 7.50 20.81 7.02 20.48 6.66C20.15 6.29 19.69 6.06 19.20 6.01ZM5 16V8H19V16H5ZM17.29 19.79C17.11 19.96 17.01 20.20 17.00 20.44C16.98 20.69 17.06 20.93 17.22 21.13L17.29 21.20L18.79 22.70L18.86 22.77C19.06 22.92 19.30 23.00 19.54 22.99C19.79 22.98 20.02 22.87 20.20 22.70C20.37 22.52 20.48 22.29 20.49 22.04C20.50 21.80 20.42 21.56 20.27 21.36L20.20 21.29L18.70 19.79L18.63 19.72C18.43 19.56 18.19 19.48 17.94 19.50C17.70 19.51 17.46 19.61 17.29 19.79ZM5.37 19.72L5.29 19.79L3.79 21.29L3.72 21.36C3.57 21.56 3.49 21.80 3.50 22.04C3.51 22.29 3.62 22.52 3.79 22.70C3.97 22.87 4.20 22.98 4.45 22.99C4.69 23.00 4.93 22.92 5.13 22.77L5.20 22.70L6.70 21.20L6.77 21.13C6.92 20.93 7.00 20.69 6.99 20.45C6.97 20.20 6.87 19.97 6.70 19.79C6.52 19.62 6.29 19.52 6.04 19.50C5.80 19.49 5.56 19.57 5.37 19.72ZM12 19.5C11.73 19.5 11.48 19.60 11.29 19.79C11.10 19.98 11 20.23 11 20.5V22.5C11 22.76 11.10 23.01 11.29 23.20C11.48 23.39 11.73 23.5 12 23.5C12.26 23.5 12.51 23.39 12.70 23.20C12.89 23.01 13 22.76 13 22.5V20.5C13 20.23 12.89 19.98 12.70 19.79C12.51 19.60 12.26 19.5 12 19.5Z'])"
	}
};
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
	const layoutType = getLayoutType();
	const pageType =
		isWatchPage() ? "watch"
		: isShortsPage() ? "shorts"
		: null;
	if (!pageType) return;
	if (pageType === "watch") {
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
		const {
			[pageType]: { [layoutType]: ambientModeSelector }
		} = ambientModePathSelectors;
		const ambientModeMenuItem: Nullable<HTMLDivElement> = settingsPanelMenu.querySelector(ambientModeSelector);
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
	} else {
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
		const {
			[pageType]: { [layoutType]: ambientModeSelector }
		} = ambientModePathSelectors;
		// Wait for ambient mode item
		const ambientModeItem = await waitForElement<HTMLButtonElement>(ambientModeSelector);
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
