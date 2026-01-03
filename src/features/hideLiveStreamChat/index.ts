import type { YouTubePlayerDiv } from "@/src/types";

import { modifyElementClassList, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";
export async function disableHideLiveStreamChat() {
	const player = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	if (!player) return;
	const playerData = await player.getVideoData();
	if (!playerData.isLive) return;
	modifyElementClassList("remove", {
		className: "yte-hide-live-stream-chat",
		element: document.body
	});
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
	modifyElementClassList("add", {
		className: "yte-hide-live-stream-chat",
		element: document.body
	});
}
