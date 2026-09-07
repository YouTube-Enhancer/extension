import type { Nullable } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { getLayoutType, isShortsPage, isWatchPage } from "@/src/utils/url";

import { ambientModePathSelectors } from "./constants";
import { metadata } from "./index.metadata";

let ambientModeWasEnabled: Nullable<boolean> = null;
function isAmbientEnabled(): boolean {
	const flexy = document.querySelector<HTMLElement>("ytd-watch-flexy");
	if (flexy) return flexy.hasAttribute("cinematics-active");
	const grid = document.querySelector<HTMLElement>("ytd-watch-grid");
	if (grid) return grid.hasAttribute("cinematics-active");
	return false;
}

function makeAmbientToggleTask(desiredState: boolean): () => boolean {
	return (): boolean => {
		const layoutType = getLayoutType();
		const pageType =
			isWatchPage() ? "watch"
			: isShortsPage() ? "shorts"
			: null;
		if (!pageType) return false;
		const {
			[pageType]: { [layoutType]: ambientModeSelector }
		} = ambientModePathSelectors;
		if (!desiredState && ambientModeWasEnabled === null) {
			ambientModeWasEnabled = isAmbientEnabled();
		}
		if (pageType === "watch") {
			const settingsButton = document.querySelector<HTMLButtonElement>("button.ytp-settings-button");
			const settingsMenu = document.querySelector<HTMLDivElement>(settingsPanelMenuSelector);
			if (!settingsButton || !settingsMenu) return false;
			const settingsPanelMenu = settingsMenu.querySelector<HTMLDivElement>("div.ytp-panel-menu");
			if (!settingsPanelMenu) return false;
			if (!settingsPanelMenu.hasChildNodes()) {
				settingsMenu.classList.add("hidden");
				settingsButton.click();
				settingsButton.click();
				return false;
			}
			const ambientModeMenuItem = document.querySelector<HTMLDivElement>(ambientModeSelector);
			if (!ambientModeMenuItem) {
				settingsMenu.classList.remove("hidden");
				return false;
			}
			const ambientModeEnabled = isAmbientEnabled();
			if (ambientModeEnabled !== desiredState) {
				ambientModeMenuItem.click();
			}
			settingsMenu.classList.remove("hidden");
			return isAmbientEnabled() === desiredState;
		}
		// Shorts page
		const shortsPlayer = document.querySelector("#shorts-player");
		if (!shortsPlayer) return false;
		const menuButton = document.querySelector<HTMLButtonElement>("div#menu-button ytd-menu-renderer yt-button-shape button");
		const popupContainer = document.querySelector<HTMLDivElement>("ytd-popup-container");
		if (!menuButton || !popupContainer) return false;
		const {
			style: { display: originalDisplay }
		} = popupContainer;
		popupContainer.style.display = "none";
		menuButton.click();
		const popup = document.querySelector<HTMLDivElement>("tp-yt-iron-dropdown");
		const ambientModeItem = document.querySelector<HTMLButtonElement>(ambientModeSelector);
		if (!popup || !ambientModeItem) {
			popupContainer.style.display = originalDisplay;
			return false;
		}
		const ambientModeItemToggle = ambientModeItem.querySelector<HTMLInputElement>("tp-yt-paper-toggle-button");
		if (!ambientModeItemToggle) {
			popupContainer.style.display = originalDisplay;
			return false;
		}
		const ambientModeEnabled = isAmbientEnabled();
		if (ambientModeEnabled !== desiredState) {
			ambientModeItem.click();
		}
		menuButton.click();
		popupContainer.style.display = originalDisplay || "";
		return isAmbientEnabled() === desiredState;
	};
}

export default createFeature({
	...metadata,
	onDisable: () => {
		if (!ambientModeWasEnabled) return;
		void registry.playerManager.executeWithRetries("automaticallyDisableAmbientMode", [makeAmbientToggleTask(true)], ["restoreAmbient"], {
			interval: 500,
			maxAttempts: 20,
			waitForLoaded: false
		});
	},
	onEnable: () => {
		void registry.playerManager.executeWithRetries("automaticallyDisableAmbientMode", [makeAmbientToggleTask(false)], ["disableAmbient"], {
			interval: 500,
			maxAttempts: 20,
			waitForLoaded: false
		});
	},
	onNavigate: () => {
		void registry.playerManager.executeWithRetries("automaticallyDisableAmbientMode", [makeAmbientToggleTask(false)], ["disableAmbient"], {
			interval: 500,
			maxAttempts: 20,
			waitForLoaded: false
		});
	}
});
