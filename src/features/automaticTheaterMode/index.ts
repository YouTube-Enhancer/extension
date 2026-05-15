import { createFeature } from "@/src/features/_registry/createFeature";
import { theaterModeButtonPathD } from "@/src/utils/dom/selectors";
import { waitForElement } from "@/src/utils/dom/wait";
import { getLayoutType } from "@/src/utils/url";

import { metadata } from "./index.metadata";
export default createFeature({
	...metadata,
	dependencies: { includePages: ["watch", "live"] },
	onDisable: async () => {
		// Get the size button
		const sizeButton = await waitForElement<HTMLButtonElement>("button.ytp-size-button");
		// If the size button is not available return
		if (!sizeButton) return;
		const layoutType = getLayoutType();
		const inTheaterMode =
			document.querySelector<HTMLButtonElement>(`button.ytp-size-button svg path[d='${theaterModeButtonPathD[layoutType]}']`) !== null;
		if (inTheaterMode) {
			sizeButton.click();
		}
	},
	onEnable: async () => {
		// Get the size button
		const sizeButton = await waitForElement<HTMLButtonElement>("button.ytp-size-button");
		// If the size button is not available return
		if (!sizeButton) return;
		const layoutType = getLayoutType();
		const inTheaterMode =
			document.querySelector<HTMLButtonElement>(`button.ytp-size-button svg path[d='${theaterModeButtonPathD[layoutType]}']`) !== null;
		if (!inTheaterMode) {
			sizeButton.click();
		}
	}
});
