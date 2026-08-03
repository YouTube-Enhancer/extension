import type { configuration } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { isWatchPage } from "@/src/utils/url";

import type { PlaylistLengthParameters } from "./utils";

import { PlaylistLengthController } from "./controller";
import { metadata } from "./index.metadata";

let controller: null | PlaylistLengthController = null;

function cleanupPlaylistLength() {
	controller?.destroy();
	controller = null;
}

async function setupPlaylistLength(config: configuration["playlistLength"]) {
	const params: PlaylistLengthParameters = {
		pageType: isWatchPage() ? "watch" : "playlist",
		playlistLengthGetMethod: config.lengthGetMethod,
		playlistWatchTimeGetMethod: config.watchTimeGetMethod
	};

	controller = new PlaylistLengthController(params);
	await controller.initialize();
}

export default createFeature({
	...metadata,
	onConfigChange: async (config) => {
		if (!config.enabled) return;
		await registry.updateFeatureEnabledState("playlistLength", false, config);
		await registry.updateFeatureEnabledState("playlistLength", true, config);
	},
	onDisable: cleanupPlaylistLength,
	onEnable: async (config) => {
		await setupPlaylistLength(config);
	},
	onNavigate: async () => {
		cleanupPlaylistLength();
		await setupPlaylistLength(registry.configManager.getLast("playlistLength"));
	}
});
