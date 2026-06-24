import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { isNewYouTubeVideoLayout } from "@/src/utils/url";

import { metadata } from "./index.metadata";

function clickSizeButton(): boolean {
	const sizeButton = document.querySelector<HTMLButtonElement>("button.ytp-size-button");
	if (!sizeButton) return false;
	sizeButton.click();
	return true;
}

function isInTheaterMode(): boolean {
	const isMaximized = document.body.getAttribute("yte-maximized") === "";
	if (isMaximized) return false;
	const container = document.querySelector<HTMLElement>(isNewYouTubeVideoLayout() ? "ytd-watch-grid" : "ytd-watch-flexy");
	return container?.hasAttribute("theater") ?? false;
}

function makeTheaterTask(desired: boolean) {
	return (): boolean => {
		const current = isInTheaterMode();
		if (current === desired) return true;
		return clickSizeButton();
	};
}

export default createFeature({
	...metadata,
	onDisable: () => {
		void registry.playerManager.executeWithRetries(metadata.id, [makeTheaterTask(false)], ["disableTheater"], {
			interval: 300,
			maxAttempts: 20,
			waitForLoaded: false
		});
	},
	onEnable: () => {
		void registry.playerManager.executeWithRetries(metadata.id, [makeTheaterTask(true)], ["enableTheater"], {
			interval: 300,
			maxAttempts: 20,
			waitForLoaded: false
		});
	},
	onNavigate: () => {
		void registry.playerManager.executeWithRetries(metadata.id, [makeTheaterTask(true)], ["enableTheater"], {
			interval: 300,
			maxAttempts: 20,
			waitForLoaded: false
		});
	}
});
