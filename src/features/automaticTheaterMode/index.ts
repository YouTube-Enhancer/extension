import type { configuration } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { isNewYouTubeVideoLayout } from "@/src/utils/url";

import { metadata } from "./index.metadata";

// Clicks are spaced out so a toggle YouTube is still applying is not toggled straight back.
const CLICK_INTERVAL = 1000;
let lastClickAt = 0;

function clickSizeButton(): boolean {
	const sizeButton = document.querySelector<HTMLButtonElement>("button.ytp-size-button");
	if (!sizeButton) return false;
	sizeButton.click();
	return true;
}

async function disableMaximizeIfEnabled() {
	const maximizeFeature = registry.getFeature("automaticallyMaximizePlayer");
	if (!maximizeFeature) return;
	if (!registry.isFeatureEnabled("automaticallyMaximizePlayer")) return;
	await registry.updateFeatureEnabledState(
		"automaticallyMaximizePlayer",
		false,
		registry.getConfigOr(
			"automaticallyMaximizePlayer",
			maximizeFeature.defaults as configuration["automaticallyMaximizePlayer"]
		)
	);
}

function isInTheaterMode(): boolean {
	const isMaximized = document.body.getAttribute("yte-maximized") === "";
	if (isMaximized) return false;
	const container = document.querySelector<HTMLElement>(
		isNewYouTubeVideoLayout() ? "ytd-watch-grid" : "ytd-watch-flexy"
	);
	return container?.hasAttribute("theater") ?? false;
}

function makeTheaterTask(desired: boolean) {
	return (): boolean => {
		const current = isInTheaterMode();
		if (current === desired) return true;
		/**
		 * A click is not proof of success. YouTube flips the theater attribute in its own handler, and a maximized
		 * player uses the click to minimize instead, which also turns theater off. Only reading the desired mode ends
		 * the attempt, so a later tick clicks again once the player has settled.
		 */
		if (Date.now() - lastClickAt < CLICK_INTERVAL) return false;
		lastClickAt = Date.now();
		clickSizeButton();
		return false;
	};
}

export default createFeature({
	...metadata,
	onDisable: () => {
		void registry.playerRetry(metadata.id, [makeTheaterTask(false)], ["disableTheater"], {
			interval: 300,
			maxAttempts: 20,
			waitForLoaded: false
		});
	},
	onEnable: async () => {
		await disableMaximizeIfEnabled();
		void registry.playerRetry(metadata.id, [makeTheaterTask(true)], ["enableTheater"], {
			interval: 300,
			maxAttempts: 20,
			waitForLoaded: false
		});
	},
	onNavigate: () => {
		void registry.playerRetry(metadata.id, [makeTheaterTask(true)], ["enableTheater"], {
			interval: 300,
			maxAttempts: 20,
			waitForLoaded: false
		});
	}
});
