import type { Nullable } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { getLayoutType, isShortsPage, isWatchPage } from "@/src/utils/url";

import {
	ambientModePathSelectors,
	shortsAmbientModeItemSelector,
	shortsAmbientSwitchSelector,
	shortsMenuButtonSelector,
	shortsOpenSheetSelector,
	shortsSheetItemSelector
} from "./constants";
import { metadata } from "./index.metadata";

let ambientModeWasEnabled: Nullable<boolean> = null;
function isAmbientEnabled(): boolean {
	const flexy = document.querySelector<HTMLElement>("ytd-watch-flexy");
	if (flexy) return flexy.hasAttribute("cinematics-active");
	const grid = document.querySelector<HTMLElement>("ytd-watch-grid");
	if (grid) return grid.hasAttribute("cinematics-active");
	return false;
}

/**
 * The task the player manager retries until it reports done. On shorts a sheet without the ambient row means there
 * is nothing to do, except at start-up, where YouTube fills the sheet before it adds the row: `rowMayComeLate` lets
 * the first few such sheets count as not ready yet.
 */
function makeAmbientToggleTask(desiredState: boolean, { rowMayComeLate = false } = {}): () => boolean | Promise<boolean> {
	let sheetsWithoutRow = 0;
	const acceptMissingRow = () => !rowMayComeLate || ++sheetsWithoutRow > 5;
	return () => {
		if (isWatchPage()) return toggleWatchAmbientMode(desiredState);
		if (isShortsPage()) return toggleShortsAmbientMode(desiredState, acceptMissingRow);
		return false;
	};
}

/** Polls `read` every 50 ms until it returns a value, or gives up after `timeout`. */
async function pollFor<T>(read: () => Nullable<T> | undefined, timeout: number): Promise<Nullable<T>> {
	const start = Date.now();
	for (;;) {
		const value = read();
		if (value !== null && value !== undefined) return value;
		if (Date.now() - start >= timeout) return null;
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
}

/**
 * The shorts page keeps its ambient mode switch in the "more" sheet of the reel, which YouTube fills a moment after
 * the button is pressed, so the sheet is opened out of sight, read, clicked when the switch is not where it should
 * be, and closed again. YouTube offers the switch in the dark theme only, on the reel a page loads on and not on the
 * reels scrolled to after it, so a sheet without it means there is nothing to do once `acceptMissingRow` says so.
 */
async function toggleShortsAmbientMode(desiredState: boolean, acceptMissingRow: () => boolean): Promise<boolean> {
	if (!document.documentElement.hasAttribute("dark")) return true;
	const menuButton = document.querySelector<HTMLButtonElement>(shortsMenuButtonSelector);
	const popupContainer = document.querySelector<HTMLElement>("ytd-popup-container");
	if (!menuButton || !popupContainer) return false;
	const {
		style: { display: originalDisplay }
	} = popupContainer;
	popupContainer.style.display = "none";
	try {
		const findFilledSheet = () => {
			const openSheet = document.querySelector(shortsOpenSheetSelector);
			return openSheet?.querySelector(shortsSheetItemSelector) ? openSheet : null;
		};
		// A sheet that is already open, filled or still filling, is waited for rather than toggled shut by another press.
		if (!document.querySelector(shortsOpenSheetSelector)) menuButton.click();
		const sheet = await pollFor(findFilledSheet, 3000);
		if (!sheet) {
			// A sheet that opened but never filled is closed again, so the next attempt starts from a closed one.
			if (document.querySelector(shortsOpenSheetSelector)) menuButton.click();
			return false;
		}
		const ambientModeSwitch = sheet.querySelector(shortsAmbientModeItemSelector)?.querySelector<HTMLElement>(shortsAmbientSwitchSelector);
		if (!ambientModeSwitch) {
			menuButton.click();
			return acceptMissingRow();
		}
		const readSwitch = () => ambientModeSwitch.getAttribute("aria-checked") === "true";
		if (!desiredState && ambientModeWasEnabled === null) ambientModeWasEnabled = readSwitch();
		if (readSwitch() === desiredState) {
			menuButton.click();
			return true;
		}
		// The switch reports its new state at once, and YouTube closes the sheet on its own a moment later.
		ambientModeSwitch.click();
		return readSwitch() === desiredState;
	} finally {
		await pollFor(() => (document.querySelector(shortsOpenSheetSelector) ? null : true), 1500);
		popupContainer.style.display = originalDisplay;
	}
}

function toggleWatchAmbientMode(desiredState: boolean): boolean {
	const {
		watch: { [getLayoutType()]: ambientModeSelector }
	} = ambientModePathSelectors;
	if (!desiredState && ambientModeWasEnabled === null) {
		ambientModeWasEnabled = isAmbientEnabled();
	}
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

export default createFeature({
	...metadata,
	onDisable: () => {
		if (!ambientModeWasEnabled) return;
		void registry.playerManager.executeWithRetries("automaticallyDisableAmbientMode", [makeAmbientToggleTask(true)], ["restoreAmbient"], {
			interval: 500,
			maxAttempts: 20,
			pageTypes: ["watch", "shorts"],
			waitForLoaded: false
		});
	},
	onEnable: () => {
		// onEnable also runs at page start-up, where a shorts sheet can fill before it carries the ambient row.
		void registry.playerManager.executeWithRetries(
			"automaticallyDisableAmbientMode",
			[makeAmbientToggleTask(false, { rowMayComeLate: true })],
			["disableAmbient"],
			{
				interval: 500,
				maxAttempts: 20,
				pageTypes: ["watch", "shorts"],
				waitForLoaded: false
			}
		);
	},
	onNavigate: () => {
		void registry.playerManager.executeWithRetries("automaticallyDisableAmbientMode", [makeAmbientToggleTask(false)], ["disableAmbient"], {
			interval: 500,
			maxAttempts: 20,
			pageTypes: ["watch", "shorts"],
			waitForLoaded: false
		});
	}
});
