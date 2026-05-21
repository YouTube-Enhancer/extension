import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { waitForElement } from "@/src/utils/dom/wait";
import { isLivePage, isNewYouTubeVideoLayout, isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	dependencies: { includePages: ["watch", "live"] },
	onDisable: () => eventManager.removeEventListeners("openYouTubeSettingsOnHover"),
	onEnable: async () => {
		const settingsButton = await waitForElement<HTMLButtonElement>(".ytp-button.ytp-settings-button");
		if (!settingsButton) return;
		const settingsMenu = await waitForElement<HTMLDivElement>(settingsPanelMenuSelector);
		if (!settingsMenu) return;
		// Get the player element
		const playerContainer =
			isWatchPage() || isLivePage() ?
				await waitForElement<HTMLDivElement>(
					isNewYouTubeVideoLayout() ? "div#player-container.ytd-watch-grid" : "div#player-container.ytd-watch-flexy"
				)
			:	null;
		// If player element is not available, return
		if (!playerContainer) return;
		const isSettingsOpen = () => settingsButton.getAttribute("aria-expanded") === "true";
		let isHoveringButtonOrMenu = false;
		const showSettings = () => {
			if (isSettingsOpen()) return;
			settingsButton.click();
		};
		const hideSettings = () => {
			if (!isSettingsOpen()) return;
			if (!isHoveringButtonOrMenu) settingsButton.click();
		};
		const onMouseEnter = () => {
			isHoveringButtonOrMenu = true;
			showSettings();
		};
		const onMouseLeave = () => {
			isHoveringButtonOrMenu = false;
			// Give a tiny delay to allow moving into the menu
			setTimeout(hideSettings, 50);
		};
		eventManager.addEventListener(settingsButton, "mouseenter", onMouseEnter, "openYouTubeSettingsOnHover");
		eventManager.addEventListener(settingsButton, "mouseleave", onMouseLeave, "openYouTubeSettingsOnHover");
		eventManager.addEventListener(settingsMenu, "mouseenter", () => (isHoveringButtonOrMenu = true), "openYouTubeSettingsOnHover");
		eventManager.addEventListener(
			settingsMenu,
			"mouseleave",
			() => {
				isHoveringButtonOrMenu = false;
				setTimeout(hideSettings, 50);
			},
			"openYouTubeSettingsOnHover"
		);
	}
});
