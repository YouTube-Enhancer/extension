import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import "./index.css";

import { createFeature } from "@/src/features/_registry/createFeature";
import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { registry } from "@/src/features/_registry/featureRegistry";
import { isFullscreen } from "@/src/features/buttonController/placementTransition";
import { modifyElementClassList } from "@/src/utils/dom/classList";
import {
	subscribeToDomMutations,
	type UnsubscribeFromDomMutations
} from "@/src/utils/dom/observers/domMutationBus";
import { playerShowsPageVideo } from "@/src/utils/dom/player";

import { metadata } from "./index.metadata";

let isLiveVideo = false;
let fullscreenBusUnsubscribe: Nullable<UnsubscribeFromDomMutations> = null;

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
			// Live pre-roll ads can run for minutes; the player reports the ad's video id until they end,
			// so the isLive check only becomes answerable once the content resumes. 40 x 3 s = 120 s.
			interval: 3000,
			maxAttempts: 40,
			overallTimeout: 120_000,
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
	/**
	 * Fullscreen is the same definition the button placement layer uses: the Fullscreen API element or
	 * YouTube's own fullscreen attribute, which is what drives the page when the API is unavailable.
	 */
	if (isFullscreen()) {
		addLiveChatHide();
	} else {
		removeLiveChatHide();
	}
}

/**
 * YouTube mirrors every fullscreen transition onto ytd-app's fullscreen attribute, including the
 * attribute-only mode it falls back to when the Fullscreen API is unavailable, while the API's
 * fullscreenchange event fires only for real API transitions. The attribute subscription sees both
 * ways in, which is also how the button placement layer tracks fullscreen.
 */
function attachFullscreenListener(): void {
	if (fullscreenBusUnsubscribe) return;
	fullscreenBusUnsubscribe = subscribeToDomMutations("ytd-app", () => applyVisibilityForMode(), {
		attributeFilter: ["fullscreen"]
	});
}

function detachFullscreenListener(): void {
	fullscreenBusUnsubscribe?.();
	fullscreenBusUnsubscribe = null;
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
