import type { YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import { isWatchPage, waitForSpecificMessage } from "@/src/utils/utilities";

export async function enableOpenYouTubeSettingsOnHover() {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: { options }
	} = optionsData;
	// Extract the necessary properties from the options object
	const { enable_open_youtube_settings_on_hover: enableOpenYouTubeSettingsOnHover } = options;
	// If the open YouTube settings on hover option is disabled, return
	if (!enableOpenYouTubeSettingsOnHover) return;
	const settingsButton = document.querySelector<HTMLButtonElement>(".ytp-button.ytp-settings-button");
	if (!settingsButton) return;
	const featureMenuButton = document.querySelector<HTMLButtonElement>("#yte-feature-menu-button");
	if (!featureMenuButton) return;
	const settingsMenu = document.querySelector<HTMLDivElement>("div.ytp-settings-menu:not(#yte-feature-menu)");
	if (!settingsMenu) return;
	const featureMenu = document.querySelector<HTMLDivElement>("div.ytp-settings-menu#yte-feature-menu");
	if (!featureMenu) return;
	// Get the player element
	const playerContainer = isWatchPage() ? document.querySelector<YouTubePlayerDiv>("div#player-container.ytd-watch-flexy") : null;
	// If player element is not available, return
	if (!playerContainer) return;
	const showSettings = () => {
		if (settingsMenu.style.display !== "none") return;
		settingsButton.click();
	};
	const hideSettings = () => {
		if (settingsMenu.style.display === "none") return;
		settingsButton.click();
	};
	const settingsButtonMouseLeaveListener = (event: Event) => {
		if (event.target === settingsButton) return;
		if (settingsMenu.contains(event.target as Node | null)) return;
		hideSettings();
	};
	eventManager.addEventListener(settingsButton, "mouseenter", showSettings, "openYouTubeSettingsOnHover");
	eventManager.addEventListener(settingsButton, "mouseleave", settingsButtonMouseLeaveListener, "openYouTubeSettingsOnHover");
	eventManager.addEventListener(settingsMenu, "mouseleave", hideSettings, "openYouTubeSettingsOnHover");
	eventManager.addEventListener(playerContainer, "mouseleave", hideSettings, "openYouTubeSettingsOnHover");
}
export function disableOpenYouTubeSettingsOnHover() {
	eventManager.removeEventListeners("openYouTubeSettingsOnHover");
}
