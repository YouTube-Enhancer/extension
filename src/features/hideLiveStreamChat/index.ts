import type { YouTubePlayerDiv } from "@/src/types";

import { modifyElementsClassList, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";

export async function enableHideLiveStreamChat() {
	const {
		data: {
			options: { enable_hide_live_stream_chat: enableHideLiveStreamChat }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enableHideLiveStreamChat) return;
	await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);
	const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
	if (!player) return;
	if (!(await player.getVideoData()).isLive) return;
	modifyElementsClassList("add", [
		{
			className: "yte-hide-live-stream-chat",
			element: document.querySelector("div#chat-container")
		},
		{
			className: "yte-hide-live-stream-chat",
			element: document.querySelector("div#chat-container #chat")
		},
		{
			className: "yte-hide-live-stream-chat",
			element: document.querySelector("#full-bleed-container #panels-full-bleed-container")
		}
	]);
}

export async function disableHideLiveStreamChat() {
	const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
	if (!player) return;
	if (!(await player.getVideoData()).isLive) return;
	modifyElementsClassList("remove", [
		{
			className: "yte-hide-live-stream-chat",
			element: document.querySelector("div#chat-container")
		},
		{
			className: "yte-hide-live-stream-chat",
			element: document.querySelector("div#chat-container #chat")
		},
		{
			className: "yte-hide-live-stream-chat",
			element: document.querySelector("#full-bleed-container #panels-full-bleed-container")
		}
	]);
}
