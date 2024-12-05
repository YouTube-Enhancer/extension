import { isWatchPage, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";
let ambientModeWasEnabled = false;

export async function enableAutomaticallyDisableAmbientMode() {
	const {
		data: {
			options: { enable_automatically_disable_ambient_mode }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_automatically_disable_ambient_mode) return;
	if (!isWatchPage()) return;
	await waitForAllElements([
		"div#player",
		"div#player-wide-container",
		"div#video-container",
		"div#player-container",
		"div.ytp-settings-menu:not(#yte-feature-menu)"
	]);
	const settingsButton = document.querySelector<HTMLButtonElement>("button.ytp-settings-button");
	const settingsMenu = document.querySelector<HTMLDivElement>("div.ytp-settings-menu:not(#yte-feature-menu)");
	const settingsPanelMenu = settingsMenu?.querySelector<HTMLDivElement>("div.ytp-panel-menu");
	if (!settingsButton || !settingsMenu || !settingsPanelMenu) return;
	// If the settings panel menu is empty, emulate a click on the settings button to hydrate the settings menu with the necessary elements
	if (!settingsPanelMenu.hasChildNodes()) {
		// Hide the settings menu temporarily
		settingsMenu.classList.add("hidden");
		// Click on the settings button to open the settings menu
		settingsButton.click();
		// Click on the settings button again to close the settings menu
		settingsButton.click();
	}
	// Get the ambient mode menu item element
	const ambientModeMenuItem = settingsPanelMenu.querySelector<HTMLDivElement>(
		".ytp-menuitem:has(.ytp-menuitem-icon svg path[d='M21 7v10H3V7h18m1-1H2v12h20V6zM11.5 2v3h1V2h-1zm1 17h-1v3h1v-3zM3.79 3 6 5.21l.71-.71L4.5 2.29 3.79 3zm2.92 16.5L6 18.79 3.79 21l.71.71 2.21-2.21zM19.5 2.29 17.29 4.5l.71.71L20.21 3l-.71-.71zm0 19.42.71-.71L18 18.79l-.71.71 2.21 2.21z'])"
	);
	// If ambient mode menu item is not available, return
	if (!ambientModeMenuItem) return settingsMenu.classList.remove("hidden");
	const ambientModeEnabled = ambientModeMenuItem.getAttribute("aria-checked") === "true";
	// If ambient mode was not enabled, return
	if (!ambientModeEnabled) return settingsMenu.classList.remove("hidden");
	ambientModeWasEnabled = ambientModeEnabled;
	// Disable ambient mode
	ambientModeMenuItem.click();
	settingsMenu.classList.remove("hidden");
}

export async function disableAutomaticallyDisableAmbientMode() {
	// If ambient mode wasn't enabled, return
	if (!ambientModeWasEnabled) return;
	await waitForAllElements([
		"div#player",
		"div#player-wide-container",
		"div#video-container",
		"div#player-container",
		"div.ytp-settings-menu:not(#yte-feature-menu)"
	]);
	const settingsButton = document.querySelector<HTMLButtonElement>("button.ytp-settings-button");
	const settingsMenu = document.querySelector<HTMLDivElement>("div.ytp-settings-menu:not(#yte-feature-menu)");
	const settingsPanelMenu = settingsMenu?.querySelector<HTMLDivElement>("div.ytp-panel-menu");
	if (!settingsButton || !settingsMenu || !settingsPanelMenu) return;
	// If the settings panel menu is empty, emulate a click on the settings button to hydrate the settings menu with the necessary elements
	if (!settingsPanelMenu.hasChildNodes()) {
		settingsMenu.classList.add("hidden");
		// Click on the settings button to open the settings menu in a hidden state
		settingsButton.click();
		// Click on the settings button again to close the settings menu
		settingsButton.click();
	}
	const ambientModeMenuItem = settingsPanelMenu.querySelector<HTMLDivElement>(
		".ytp-menuitem:has(.ytp-menuitem-icon svg path[d='M21 7v10H3V7h18m1-1H2v12h20V6zM11.5 2v3h1V2h-1zm1 17h-1v3h1v-3zM3.79 3 6 5.21l.71-.71L4.5 2.29 3.79 3zm2.92 16.5L6 18.79 3.79 21l.71.71 2.21-2.21zM19.5 2.29 17.29 4.5l.71.71L20.21 3l-.71-.71zm0 19.42.71-.71L18 18.79l-.71.71 2.21 2.21z'])"
	);
	// If ambient mode menu item is not available, return
	if (!ambientModeMenuItem) return settingsMenu.classList.remove("hidden");
	// Enable ambient mode
	ambientModeMenuItem.click();
}
