import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { waitForElement } from "@/src/utils/dom/wait";
import { isNewYouTubeVideoLayout, isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	dependencies: { includePages: ["watch", "live"] },
	onDisable: () => eventManager.removeEventListeners("openYouTubeSettingsOnHover"),
	onEnable: async () => {
		const settingsButton = await waitForElement<HTMLButtonElement>(".ytp-button.ytp-settings-button");
		if (!settingsButton) return;
		const featureMenuButton = await waitForElement<HTMLButtonElement>("#yte-feature-menu-button");
		if (!featureMenuButton) return;
		const settingsMenu = await waitForElement<HTMLDivElement>(settingsPanelMenuSelector);
		if (!settingsMenu) return;
		const featureMenu = await waitForElement<HTMLDivElement>("div.ytp-settings-menu#yte-feature-menu");
		if (!featureMenu) return;
		// Get the player element
		const playerContainer =
			isWatchPage() ?
				await waitForElement<HTMLDivElement>(
					isNewYouTubeVideoLayout() ? "div#player-container.ytd-watch-grid" : "div#player-container.ytd-watch-flexy"
				)
			:	null;
		// If player element is not available, return
		if (!playerContainer) return;
		const showSettings = () => {
			if (settingsMenu.style.display !== "none") return;
			settingsButton.click();
		};
		const hideSettings = (event: Event) => {
			if (settingsMenu.style.display === "none") return;
			if (event.target && (event.target as HTMLDivElement).classList.contains("ytp-popup-animating")) return;
			settingsButton.click();
		};
		const settingsButtonMouseLeaveListener = (event: Event) => {
			if (event.target === settingsButton) return;
			if (settingsMenu.contains(event.target as Nullable<Node>)) return;
			hideSettings(event);
		};
		eventManager.addEventListener(settingsButton, "mouseenter", showSettings, "openYouTubeSettingsOnHover");
		eventManager.addEventListener(settingsButton, "mouseleave", settingsButtonMouseLeaveListener, "openYouTubeSettingsOnHover");
		eventManager.addEventListener(settingsMenu, "mouseleave", hideSettings, "openYouTubeSettingsOnHover");
		eventManager.addEventListener(playerContainer, "mouseleave", hideSettings, "openYouTubeSettingsOnHover");
	}
});
