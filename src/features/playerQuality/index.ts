import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { type Nullable, type YouTubePlayerDiv } from "@/src/types";
import { browserColorLog } from "@/src/utils/logging";
import { lookupItag } from "@/src/utils/player/itagDb";
import { chooseClosestQuality } from "@/src/utils/player/quality";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

import type { FpsPreference, PlayerQualityFallbackStrategy, YoutubePlayerQualityLevel } from "./types";

import { metadata } from "./index.metadata";

let currentQuality: Nullable<YoutubePlayerQualityLevel> = null;

function chooseBestFormat(closestQuality: string, fpsPreference: FpsPreference): Nullable<number> {
	const player = getPlayer();
	if (!player?.getAvailableQualityData) return null;

	const qualityData = player.getAvailableQualityData();
	const matching = qualityData.filter((q) => q.quality === closestQuality);
	if (!matching.length) return null;

	if (matching.length === 1) {
		return null;
	}

	const sorted = [...matching].sort((a, b) => {
		if (fpsPreference !== "default") {
			const aEntry = lookupItag(a.formatId);
			const bEntry = lookupItag(b.formatId);
			const aFps = aEntry?.fps ?? 30;
			const bFps = bEntry?.fps ?? 30;
			if (aFps !== bFps) {
				return fpsPreference === "higher" ? bFps - aFps : aFps - bFps;
			}
		}
		return 0;
	});

	const [best] = sorted;
	const entry = lookupItag(best.formatId);
	browserColorLog(
		`Selected format ${best.formatId} (${entry?.codec ?? "unknown"}, ${entry?.fps ?? "?"}fps) for ${closestQuality}`,
		"FgMagenta"
	);
	return best.formatId;
}

function getPlayer(): Nullable<YouTubePlayerDiv> {
	return (
		isWatchPage() || isLivePage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
		: null
	);
}

function makeApplyQualityTask(
	fallbackStrategy: PlayerQualityFallbackStrategy,
	quality: YoutubePlayerQualityLevel,
	fpsPreference: FpsPreference
): () => Promise<boolean> {
	return async (): Promise<boolean> => {
		const player = getPlayer();
		if (!player || !player.setPlaybackQuality || !player.getAvailableQualityLevels) return false;

		const availableLevels = (await player.getAvailableQualityLevels()) as YoutubePlayerQualityLevel[];
		if (!availableLevels.length || availableLevels[0] === "auto") return false;

		if (quality && quality !== "auto") {
			const closestQuality = chooseClosestQuality(quality, availableLevels, fallbackStrategy);
			if (!closestQuality) return false;

			const qualityFormatId = chooseBestFormat(closestQuality, fpsPreference);

			if (qualityFormatId) {
				await player.setPlaybackQualityRange(closestQuality, closestQuality, qualityFormatId);
			} else {
				await player.setPlaybackQualityRange(closestQuality);
			}

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
	onEnable: async ({ fallbackStrategy, fpsPreference, quality }) => {
		const player = getPlayer();
		if (player && player.getPlaybackQuality) {
			currentQuality = (await player.getPlaybackQuality()) as YoutubePlayerQualityLevel;
		}
		void registry.playerManager.executeWithRetries(
			metadata.id,
			[makeApplyQualityTask(fallbackStrategy, quality, fpsPreference ?? "default")],
			["applyQuality"],
			{
				maxAttempts: 30,
				onPlayerStateChange: true,
				pageTypes: ["watch", "live", "shorts"],
				waitForLoaded: true
			}
		);
	},
	onNavigate: ({ fallbackStrategy, fpsPreference, quality }) => {
		void registry.playerManager.executeWithRetries(
			metadata.id,
			[makeApplyQualityTask(fallbackStrategy, quality, fpsPreference ?? "default")],
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
