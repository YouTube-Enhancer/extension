import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { type Nullable, type YouTubePlayerDiv } from "@/src/types";
import { browserColorLog } from "@/src/utils/logging";
import { chooseClosestQuality } from "@/src/utils/player/quality";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

import type { PlayerQualityFallbackStrategy, YoutubePlayerQualityLevel } from "./types";

import { metadata } from "./index.metadata";

let currentQuality: Nullable<YoutubePlayerQualityLevel> = null;

function getPlayer(): Nullable<YouTubePlayerDiv> {
	return (
		isWatchPage() || isLivePage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
		: null
	);
}

function makeApplyQualityTask(
	fallbackStrategy: PlayerQualityFallbackStrategy,
	quality: YoutubePlayerQualityLevel
): () => Promise<boolean> {
	return async (): Promise<boolean> => {
		const player = getPlayer();
		if (!player || !player.setPlaybackQuality || !player.getAvailableQualityLevels) return false;

		const availableLevels = (await player.getAvailableQualityLevels()) as YoutubePlayerQualityLevel[];
		if (!availableLevels.length || availableLevels[0] === "auto") return false;

		if (quality && quality !== "auto") {
			const closestQuality = chooseClosestQuality(quality, availableLevels, fallbackStrategy);
			if (!closestQuality) return false;

			browserColorLog(`Setting player quality to ${closestQuality}`, "FgMagenta");
			await player.setPlaybackQualityRange(closestQuality);
			player.dataset.defaultQuality = closestQuality;
			const playbackQuality = await player.getPlaybackQuality();
			return playbackQuality === closestQuality;
		}

		return true;
	};
}

function makeRestoreQualityTask(): () => Promise<boolean> {
	return async (): Promise<boolean> => {
		if (!currentQuality) return true;
		const player = getPlayer();
		if (!player || !player.setPlaybackQuality) return false;
		await player.setPlaybackQualityRange(currentQuality);
		player.dataset.defaultQuality = currentQuality;
		return true;
	};
}

export default createFeature({
	...metadata,
	onDisable: () => {
		void registry.playerManager.executeWithRetries(metadata.id, [makeRestoreQualityTask()], ["restoreQuality"], {
			maxAttempts: 10,
			pageTypes: ["watch", "live", "shorts"],
			waitForLoaded: true
		});
	},
	onEnable: async ({ fallbackStrategy, quality }) => {
		const player = getPlayer();
		if (player && player.getPlaybackQuality) {
			currentQuality = (await player.getPlaybackQuality()) as YoutubePlayerQualityLevel;
		}
		void registry.playerManager.executeWithRetries(
			metadata.id,
			[makeApplyQualityTask(fallbackStrategy, quality)],
			["applyQuality"],
			{
				maxAttempts: 30,
				onPlayerStateChange: true,
				pageTypes: ["watch", "live", "shorts"],
				waitForLoaded: true
			}
		);
	},
	onNavigate: ({ fallbackStrategy, quality }) => {
		void registry.playerManager.executeWithRetries(
			metadata.id,
			[makeApplyQualityTask(fallbackStrategy, quality)],
			["applyQuality"],
			{
				maxAttempts: 30,
				onPlayerStateChange: true,
				pageTypes: ["watch", "live", "shorts"],
				waitForLoaded: true
			}
		);
	}
});
