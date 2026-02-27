import type { YouTubePlayerDiv } from "@/src/types";

import { isWatchPage, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";

export async function disableAutomaticallyDisableAutoPlay() {
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player", 8000);
	if (!playerContainer) return;
	const autoPlayButtonElem = await waitForElement<HTMLButtonElement>("#movie_player .ytp-autonav-toggle", 8000);
	if (!autoPlayButtonElem) return;
	const autoPlayButtonElemChecked = autoPlayButtonElem.querySelector(".ytp-autonav-toggle-button");
	if (!autoPlayButtonElemChecked) return;
	const isAutoPlayOn = autoPlayButtonElemChecked.getAttribute("aria-checked") === "false";
	if (!isAutoPlayOn) return;
	autoPlayButtonElem.click();
}

export async function enableAutomaticallyDisableAutoPlay() {
	const {
		data: {
			options: {
				automaticallyDisableAutoPlay: { enabled }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enabled) return;
	if (!isWatchPage()) return;
	const playerContainer = await waitForElement<YouTubePlayerDiv>("div#movie_player", 8000);
	if (!playerContainer) return;
	const autoPlayButtonElem = await waitForElement<HTMLButtonElement>("#movie_player .ytp-autonav-toggle", 8000);
	if (!autoPlayButtonElem) return;
	const autoPlayButtonElemChecked = autoPlayButtonElem.querySelector(".ytp-autonav-toggle-button");
	if (!autoPlayButtonElemChecked) return;
	const isAutoPlayOn = autoPlayButtonElemChecked.getAttribute("aria-checked") === "true";
	if (!isAutoPlayOn) return;
	autoPlayButtonElem.click();
}
