import { createFeature } from "@/src/features/_registry/createFeature";
import { waitForElement } from "@/src/utils/dom/wait";
import { isNewYouTubeVideoLayout } from "@/src/utils/url";

import { metadata } from "./index.metadata";
async function disableTheaterMode() {
	const isMaximized = document.body.getAttribute("yte-maximized") === "";
	if (isMaximized) return;
	// Get the size button
	const sizeButton = await waitForElement<HTMLButtonElement>("button.ytp-size-button");
	// If the size button is not available return
	if (!sizeButton) return;
	const inTheaterMode =
		document.querySelector<HTMLButtonElement>(isNewYouTubeVideoLayout() ? "ytd-watch-grid" : "ytd-watch-flexy")?.hasAttribute("theater") ?? false;
	if (inTheaterMode) {
		sizeButton.click();
	}
}

async function enableTheaterMode() {
	const isMaximized = document.body.getAttribute("yte-maximized") === "";
	if (isMaximized) return;
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

export default createFeature({
	...metadata,
	onDisable: () => disableTheaterMode(),
	onEnable: () => enableTheaterMode(),
	onNavigate: () => enableTheaterMode()
});
