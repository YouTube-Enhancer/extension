import { createFeature } from "@/src/features/_registry/createFeature";
import { waitForElement } from "@/src/utils/dom/wait";
import { isNewYouTubeVideoLayout } from "@/src/utils/url";

import { metadata } from "./index.metadata";
export default createFeature({
	...metadata,
	onDisable: async () => {
		// Get the size button
		const sizeButton = await waitForElement<HTMLButtonElement>("button.ytp-size-button");
		// If the size button is not available return
		if (!sizeButton) return;
		const inTheaterMode =
			document.querySelector<HTMLButtonElement>(isNewYouTubeVideoLayout() ? "ytd-watch-grid" : "ytd-watch-flexy")?.hasAttribute("theater") ?? false;
		if (inTheaterMode) {
			sizeButton.click();
		}
	},
	onEnable: async () => {
		// Get the size button
		const sizeButton = await waitForElement<HTMLButtonElement>("button.ytp-size-button");
		// If the size button is not available return
		if (!sizeButton) return;
		const inTheaterMode =
			document.querySelector<HTMLButtonElement>(isNewYouTubeVideoLayout() ? "ytd-watch-grid" : "ytd-watch-flexy")?.hasAttribute("theater") ?? false;
		if (!inTheaterMode) {
			sizeButton.click();
		}
	}
});
