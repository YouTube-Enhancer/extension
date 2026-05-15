import type { YouTubePlayerDiv } from "@/src/types";

import "./index.css";

import { createFeature } from "@/src/features/_registry/createFeature";
import { modifyElementClassList } from "@/src/utils/dom/classList";
import { waitForElement } from "@/src/utils/dom/wait";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	dependencies: { includePages: ["live"] },
	onDisable: async () => {
		const player = await waitForElement<YouTubePlayerDiv>("div#movie_player");
		if (!player) return;
		const playerData = await player.getVideoData();
		if (!playerData.isLive) return;
		modifyElementClassList("remove", {
			className: "yte-hide-live-stream-chat",
			element: document.body
		});
	},
	onEnable: async () => {
		const player = await waitForElement<YouTubePlayerDiv>("div#movie_player");
		if (!player) return;
		const playerData = await player.getVideoData();
		if (!playerData.isLive) return;
		modifyElementClassList("add", {
			className: "yte-hide-live-stream-chat",
			element: document.body
		});
	}
});
