import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { type Nullable } from "@/src/types";
import { playlistItemsSelector } from "@/src/utils/dom/selectors";
import { waitForElement } from "@/src/utils/dom/wait";
import { isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";
import { initializePlaylistLength, type PlaylistLengthParameters } from "./utils";
let documentObserver: Nullable<MutationObserver> = null;
let resizeObserver: Nullable<ResizeObserver> = null;

async function initPlaylistLength({
	pageType,
	playlistLengthGetMethod,
	playlistWatchTimeGetMethod
}: PlaylistLengthParameters): Promise<MutationObserver | null> {
	documentObserver?.disconnect();
	try {
		return await initializePlaylistLength({
			pageType,
			playlistLengthGetMethod,
			playlistWatchTimeGetMethod
		});
	} catch (e) {
		console.warn("[playlistLength] Failed to initialize with primary method, falling back to HTML method:", e);
		if (playlistLengthGetMethod === "html") return null;

		return initPlaylistLength({
			pageType,
			playlistLengthGetMethod: "html",
			playlistWatchTimeGetMethod
		});
	}
}

function observePlaylistItems(params: PlaylistLengthParameters) {
	const selector = playlistItemsSelector();
	documentObserver?.disconnect();
	documentObserver = new MutationObserver(() => {
		if (!document.querySelector(selector)) return;
		documentObserver?.disconnect();
		void runInit(params);
	});
	documentObserver.observe(document.documentElement, {
		childList: true,
		subtree: true
	});
}

async function runInit(params: PlaylistLengthParameters) {
	documentObserver = await initPlaylistLength(params);
}

export default createFeature({
	...metadata,
	onConfigChange: async (config) => {
		if (!config.enabled) return;
		await registry.updateFeatureEnabledState("playlistLength", false, config);
		await registry.updateFeatureEnabledState("playlistLength", true, config);
	},
	onDisable: () => {
		eventManager.removeEventListeners("playlistLength");
		documentObserver?.disconnect();
		documentObserver = null;
		resizeObserver?.disconnect();
		resizeObserver = null;
		document.querySelector("#yte-playlist-length-ui")?.remove();
	},
	onEnable: async ({ lengthGetMethod: playlistLengthGetMethod, watchTimeGetMethod: playlistWatchTimeGetMethod }) => {
		const pageType = isWatchPage() ? "watch" : "playlist";
		const params: PlaylistLengthParameters = {
			pageType,
			playlistLengthGetMethod,
			playlistWatchTimeGetMethod
		};
		await waitForElement(playlistItemsSelector());
		await runInit(params);
		observePlaylistItems(params);
		resizeObserver?.disconnect();
		resizeObserver = new ResizeObserver(() => {
			void runInit(params);
		});
		resizeObserver.observe(document.documentElement);
	}
});
