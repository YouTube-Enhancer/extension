import type { YouTubePlayerDiv } from "@/src/types";

import "./index.css";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { modifyElementClassList } from "@/src/utils/dom/classList";
import { playerShowsPageVideo } from "@/src/utils/dom/player";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	/**
	 * The hide is a plain body class, so removing it must not depend on the player. The disable path also runs when
	 * the includePages gate leaves "live" during an SPA navigation, and by then the player is no longer live: an
	 * isLive guard here returned early and left the class on the body.
	 */
	onDisable: () => {
		registry.playerManager.cleanup("hideLiveStreamChat");
		removeLiveChatHide();
	},
	onEnable: () => {
		applyLiveChatVisibility();
	},
	onNavigate: () => {
		applyLiveChatVisibility();
	}
});

/**
 * Applies the hide once the player has loaded the page's stream. Right after a load or an in-page navigation the
 * player's video data can still be empty or the previous video's, and a single read at that moment dropped the
 * hide for good on a stream that is live; the task keeps asking until the data belongs to the page's video.
 */
function applyLiveChatVisibility() {
	void registry.playerManager.executeWithRetries("hideLiveStreamChat", [applyLiveChatVisibilityTask], ["applyLiveChatVisibility"], {
		interval: 500,
		maxAttempts: 40,
		overallTimeout: 20_000,
		waitForLoaded: true
	});
}
async function applyLiveChatVisibilityTask(): Promise<boolean> {
	const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
	if (!player || !(await playerShowsPageVideo(player))) return false;
	const { isLive } = await player.getVideoData();
	if (isLive) {
		modifyElementClassList("add", {
			className: "yte-hide-live-stream-chat",
			element: document.body
		});
	} else {
		removeLiveChatHide();
	}
	return true;
}
function removeLiveChatHide() {
	modifyElementClassList("remove", {
		className: "yte-hide-live-stream-chat",
		element: document.body
	});
}
