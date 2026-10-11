import type { YouTubePlayerDiv } from "@/src/types";

import "./index.css";

import { createFeature } from "@/src/features/_registry/createFeature";
import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { registry } from "@/src/features/_registry/featureRegistry";
import { modifyElementClassList } from "@/src/utils/dom/classList";
import { playerShowsPageVideo } from "@/src/utils/dom/player";

import { metadata } from "./index.metadata";

let isLiveVideo = false;
let fullscreenListenerAttached = false;

function addLiveChatHide(): void {
	modifyElementClassList("add", {
		className: "yte-hide-live-stream-chat",
		element: document.body
	});
}

function applyLiveChatVisibility(): void {
	void registry.playerRetry(
		"hideLiveStreamChat",
		[applyLiveChatVisibilityTask],
		["applyLiveChatVisibility"],
		{
			interval: 500,
			maxAttempts: 40,
			overallTimeout: 20_000,
			waitForLoaded: true
		}
	);
}

async function applyLiveChatVisibilityTask(): Promise<boolean> {
	const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
	if (!player || !(await playerShowsPageVideo(player))) return false;
	const { isLive } = await player.getVideoData();
	isLiveVideo = isLive;
	attachFullscreenListener();
	applyVisibilityForMode();
	return true;
}

function applyVisibilityForMode(): void {
	const { mode } = featureConfigManager.getLastOr("hideLiveStreamChat", metadata.defaults);
	if (!isLiveVideo) {
		removeLiveChatHide();
		return;
	}
	if (mode === "always") {
		addLiveChatHide();
		return;
	}
	if (document.fullscreenElement) {
		addLiveChatHide();
	} else {
		removeLiveChatHide();
	}
}

function attachFullscreenListener(): void {
	if (fullscreenListenerAttached) return;
	document.addEventListener("fullscreenchange", onFullscreenChange);
	fullscreenListenerAttached = true;
}

function detachFullscreenListener(): void {
	document.removeEventListener("fullscreenchange", onFullscreenChange);
	fullscreenListenerAttached = false;
}

function onFullscreenChange(): void {
	applyVisibilityForMode();
}

function removeLiveChatHide(): void {
	modifyElementClassList("remove", {
		className: "yte-hide-live-stream-chat",
		element: document.body
	});
}

export default createFeature({
	...metadata,
	/**
	 * The hide is a plain body class, so removing it must not depend on the player. The disable path also runs when
	 * the includePages gate leaves during an SPA navigation, and by then the player is no longer live: an
	 * isLive guard here returned early and left the class on the body.
	 */
	onConfigChange: () => {
		applyVisibilityForMode();
	},
	onDisable: () => {
		detachFullscreenListener();
		removeLiveChatHide();
		isLiveVideo = false;
	},
	onEnable: () => {
		applyLiveChatVisibility();
	},
	onNavigate: () => {
		isLiveVideo = false;
		applyLiveChatVisibility();
	}
});
