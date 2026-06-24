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

function chooseBestFormat(closestQuality: string, preferPremium: boolean, fpsPreference: FpsPreference): Nullable<number> {
	const player = getPlayer();
	if (!player?.getAvailableQualityData) return null;

	const qualityData = player.getAvailableQualityData();
	const matching = qualityData.filter((q) => q.quality === closestQuality);
	if (!matching.length) return null;

	if (matching.length === 1) {
		const entry = lookupItag(matching[0].formatId);
		browserColorLog(
			`Selected format ${matching[0].formatId} (${entry?.codec ?? "unknown"}, ${entry?.fps ?? "?"}fps${matching[0].paygatedQualityDetails ? " premium" : ""}) for ${closestQuality}`,
			"FgMagenta"
		);
		return matching[0].formatId;
	}

	const sorted = [...matching].sort((a, b) => {
		if (preferPremium) {
			const aPremium = !!a.paygatedQualityDetails;
			const bPremium = !!b.paygatedQualityDetails;
			if (aPremium !== bPremium) return aPremium ? -1 : 1;
		}
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
		`Selected format ${best.formatId} (${entry?.codec ?? "unknown"}, ${entry?.fps ?? "?"}fps${best.paygatedQualityDetails ? " premium" : ""}) for ${closestQuality}`,
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

function makeApplyQualityTasks(
	fallbackStrategy: PlayerQualityFallbackStrategy,
	quality: YoutubePlayerQualityLevel,
	preferPremium: boolean,
	fpsPreference: FpsPreference
): [() => Promise<boolean>, () => Promise<boolean>] {
	let appliedQuality: Nullable<string> = null;
	let appliedFormatId: Nullable<number> = null;

	const applyTask = async (): Promise<boolean> => {
		const player = getPlayer();
		if (!player || !player.setPlaybackQuality || !player.getAvailableQualityLevels) return false;
		const currentQuality = await player.getPlaybackQuality();
		if (!currentQuality || currentQuality === "unknown") return false;

		const availableLevels = (await player.getAvailableQualityLevels()) as YoutubePlayerQualityLevel[];
		if (!availableLevels.length) return false;

		if (!quality || quality === "auto") return true;

		const closestQuality = chooseClosestQuality(quality, availableLevels, fallbackStrategy);
		if (!closestQuality) return false;

		const qualityFormatId = chooseBestFormat(closestQuality, preferPremium, fpsPreference);

		if (qualityFormatId) {
			await player.setPlaybackQualityRange(closestQuality, closestQuality, qualityFormatId);
		} else {
			await player.setPlaybackQualityRange(closestQuality, closestQuality);
		}
		if (player.setPlaybackQuality) {
			await player.setPlaybackQuality(closestQuality);
		}

		player.dataset.defaultQuality = closestQuality;
		appliedQuality = closestQuality;
		appliedFormatId = qualityFormatId;
		return true;
	};

	const verifyTask = async (): Promise<boolean> => {
		if (!appliedQuality) return false;
		const player = getPlayer();
		if (!player) return false;
		if (appliedFormatId) {
			const stats = player.getVideoStats();
			return stats.fmt === appliedFormatId;
		}
		const playbackQuality = await player.getPlaybackQuality();
		return playbackQuality === appliedQuality;
	};

	return [applyTask, verifyTask];
}

function makeRestoreQualityTask(): () => Promise<boolean> {
	return async (): Promise<boolean> => {
		if (!currentQuality) return true;
		const player = getPlayer();
		if (!player || !player.setPlaybackQuality) return false;
		await player.setPlaybackQualityRange(currentQuality, currentQuality);
		if (player.setPlaybackQuality) {
			await player.setPlaybackQuality(currentQuality);
		}
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
	onEnable: async ({ fallbackStrategy, fpsPreference, preferPremium, quality }) => {
		const player = getPlayer();
		if (player && player.getPlaybackQuality) {
			currentQuality = (await player.getPlaybackQuality()) as YoutubePlayerQualityLevel;
		}
		const [applyTask, verifyTask] = makeApplyQualityTasks(fallbackStrategy, quality, preferPremium ?? false, fpsPreference ?? "default");
		void registry.playerManager.executeWithRetries(metadata.id, [applyTask, verifyTask], ["applyQuality", "verifyQuality"], {
			maxAttempts: 30,
			onPlayerStateChange: true,
			pageTypes: ["watch", "live", "shorts"],
			waitForLoaded: true
		});
	},
	onNavigate: ({ fallbackStrategy, fpsPreference, preferPremium, quality }) => {
		const [applyTask, verifyTask] = makeApplyQualityTasks(fallbackStrategy, quality, preferPremium ?? false, fpsPreference ?? "default");
		void registry.playerManager.executeWithRetries(metadata.id, [applyTask, verifyTask], ["applyQuality", "verifyQuality"], {
			maxAttempts: 30,
			onPlayerStateChange: true,
			pageTypes: ["watch", "live", "shorts"],
			waitForLoaded: true
		});
	}
});
