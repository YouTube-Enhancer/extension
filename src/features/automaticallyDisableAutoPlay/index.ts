import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { waitForElement } from "@/src/utils/dom/wait";

import { metadata } from "./index.metadata";
let previousAutoPlayState: Nullable<boolean> = null;

export default createFeature({
	...metadata,
	onDisable: async () => {
		const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player", 1000);
		if (!playerContainer) return;
		const autoPlayButtonElem = await waitForElement<HTMLButtonElement>(".ytp-autonav-toggle", playerContainer, 1000);
		if (!autoPlayButtonElem) return;
		const autoPlayButtonElemChecked = autoPlayButtonElem.querySelector(".ytp-autonav-toggle-button");
		if (!autoPlayButtonElemChecked) return;
		if (previousAutoPlayState === null) return;
		const current = autoPlayButtonElemChecked.getAttribute("aria-checked") === "true";
		if (current !== previousAutoPlayState) {
			autoPlayButtonElem.click();
		}
	},
	onEnable: async () => {
		const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player", 1000);
		if (!playerContainer) return;
		const autoPlayButtonElem = await waitForElement<HTMLButtonElement>(".ytp-autonav-toggle", playerContainer, 1000);
		if (!autoPlayButtonElem) return;
		const autoPlayButtonElemChecked = autoPlayButtonElem.querySelector(".ytp-autonav-toggle-button");
		if (!autoPlayButtonElemChecked) return;
		const current = autoPlayButtonElemChecked.getAttribute("aria-checked") === "true";
		previousAutoPlayState = current;
		if (current) {
			autoPlayButtonElem.click();
		}
	}
});
