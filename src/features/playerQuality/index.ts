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

type EnforcementState = {
	appliedFormatId: Nullable<number>;
	appliedQuality: Nullable<string>;
	overrideDetected: boolean;
	pendingOwnApply: boolean;
	verifiedOnce: boolean;
};

const enforcement: EnforcementState = {
	appliedFormatId: null,
	appliedQuality: null,
	overrideDetected: false,
	pendingOwnApply: false,
	verifiedOnce: false
};

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

async function hasForeignQuality(player: YouTubePlayerDiv): Promise<boolean> {
	if (!enforcement.appliedQuality || enforcement.pendingOwnApply) return false;

	const stats = player.getVideoStats();
	if (enforcement.appliedFormatId != null && typeof stats?.fmt === "number") {
		return stats.fmt !== enforcement.appliedFormatId;
	}

	const playbackQuality = await player.getPlaybackQuality();
	return !!playbackQuality && playbackQuality !== "unknown" && playbackQuality !== enforcement.appliedQuality;
}

function isAdShowing(): boolean {
	return !!document.querySelector(".ad-showing, .ytp-ad-player-overlay");
}

function makeApplyQualityTasks(
	fallbackStrategy: PlayerQualityFallbackStrategy,
	quality: YoutubePlayerQualityLevel,
	preferPremium: boolean,
	fpsPreference: FpsPreference
): [() => Promise<boolean>, () => Promise<boolean>] {
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

		if (enforcement.verifiedOnce && !isAdShowing() && (await hasForeignQuality(player))) {
			markManualOverride();
			return true;
		}

		const qualityFormatId = chooseBestFormat(closestQuality, preferPremium, fpsPreference);

		try {
			enforcement.pendingOwnApply = true;
			if (qualityFormatId) {
				await player.setPlaybackQualityRange(closestQuality, closestQuality, qualityFormatId);
			} else {
				await player.setPlaybackQualityRange(closestQuality, closestQuality);
			}
			if (player.setPlaybackQuality) {
				await player.setPlaybackQuality(closestQuality);
			}
		} finally {
			enforcement.pendingOwnApply = false;
		}

		player.dataset.defaultQuality = closestQuality;
		enforcement.appliedQuality = closestQuality;
		enforcement.appliedFormatId = qualityFormatId;
		return true;
	};

	const verifyTask = async (): Promise<boolean> => {
		if (enforcement.overrideDetected || isAdShowing()) return true;
		if (!enforcement.appliedQuality) return false;
		const player = getPlayer();
		if (!player) return false;
		let verified: boolean;
		if (enforcement.appliedFormatId) {
			const stats = player.getVideoStats();
			verified = stats.fmt === enforcement.appliedFormatId;
		} else {
			const playbackQuality = await player.getPlaybackQuality();
			verified = playbackQuality === enforcement.appliedQuality;
		}
		enforcement.verifiedOnce = enforcement.verifiedOnce || verified;
		return verified;
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

function markManualOverride(): void {
	if (enforcement.overrideDetected) return;
	enforcement.overrideDetected = true;
	browserColorLog("Manual quality change detected - suspending enforcement until navigation or config change", "FgYellow");
	registry.playerManager.cleanup(metadata.id);
}

function resetEnforcementState(): void {
	enforcement.appliedFormatId = null;
	enforcement.appliedQuality = null;
	enforcement.overrideDetected = false;
	enforcement.pendingOwnApply = false;
	enforcement.verifiedOnce = false;
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
		resetEnforcementState();
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
		resetEnforcementState();
		const [applyTask, verifyTask] = makeApplyQualityTasks(fallbackStrategy, quality, preferPremium ?? false, fpsPreference ?? "default");
		void registry.playerManager.executeWithRetries(metadata.id, [applyTask, verifyTask], ["applyQuality", "verifyQuality"], {
			maxAttempts: 30,
			onPlayerStateChange: true,
			pageTypes: ["watch", "live", "shorts"],
			waitForLoaded: true
		});
	}
});
