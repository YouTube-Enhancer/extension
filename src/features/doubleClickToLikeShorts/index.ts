import type { YouTubePlayerDiv } from "@/src/types";

import { setupDoubleClickToLikeShorts } from "@/src/features/doubleClickToLikeShorts/utils";
import eventManager from "@/src/utils/EventManager";
import { isShortsPage, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

export async function enableDoubleClickToLikeShorts() {
	if (!isShortsPage()) return;
	
	const {
		data: {
			options: { enable_double_click_to_like_shorts }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	
	if (!enable_double_click_to_like_shorts) return;
	
	await waitForAllElements(["#shorts-player"]);
	const shortsContainer = document.querySelector<YouTubePlayerDiv>("#shorts-player");
	
	if (!shortsContainer) return;
	setupDoubleClickToLikeShorts(shortsContainer);
}

export function disableDoubleClickToLikeShorts() {
	eventManager.removeEventListeners("doubleClickToLikeShorts");
}
