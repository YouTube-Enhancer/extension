import type { YouTubePlayerDiv } from "@/src/types";

import "./index.css";

import { createFeature } from "@/src/features/_registry/createFeature";
import { modifyElementClassList } from "@/src/utils/dom/classList";
import { waitForElement } from "@/src/utils/dom/wait";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onDisable: async () => {
		const player = await waitForElement<YouTubePlayerDiv>("div#movie_player");
		if (!player) return;
		const playerData = await player.getVideoData();
		if (!playerData.isLive) return;
		removeLiveChatHide();
	},
	onEnable: async () => {
		await applyLiveChatVisibility();
	},
	onNavigate: async () => {
		await applyLiveChatVisibility();
	}
});

async function applyLiveChatVisibility() {
	const player = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	if (!player) return;
	const playerData = await player.getVideoData();
	if (playerData.isLive) {
		modifyElementClassList("add", {
			className: "yte-hide-live-stream-chat",
			element: document.body
		});
	} else {
		removeLiveChatHide();
	}
}
function removeLiveChatHide() {
	modifyElementClassList("remove", {
		className: "yte-hide-live-stream-chat",
		element: document.body
	});
}
