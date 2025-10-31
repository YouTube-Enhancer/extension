import type { YouTubePlayerDiv } from "@/src/types";

import { modifyElementsClassList, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";
const hideLiveStreamChatSelectors = ["div#chat-container", "div#chat-container #chat", "#full-bleed-container #panels-full-bleed-container"];
export async function disableHideLiveStreamChat() {
	const player = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	if (!player) return;
	const playerData = await player.getVideoData();
	if (!playerData.isLive) return;
	modifyElementsClassList("remove", "yte-hide-live-stream-chat", hideLiveStreamChatSelectors);
}

export async function enableHideLiveStreamChat() {
	const {
		data: {
			options: { enable_hide_live_stream_chat: enableHideLiveStreamChat }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enableHideLiveStreamChat) return;
	const player = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	if (!player) return;
	const playerData = await player.getVideoData();
	if (!playerData.isLive) return;
	modifyElementsClassList("add", "yte-hide-live-stream-chat", hideLiveStreamChatSelectors);
}
