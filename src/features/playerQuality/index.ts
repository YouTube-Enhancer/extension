import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { type Nullable, type YouTubePlayerDiv } from "@/src/types";
import { browserColorLog } from "@/src/utils/logging";
import { lookupItag } from "@/src/utils/player/itagDb";
import { chooseClosestQuality } from "@/src/utils/player/quality";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

import type { FpsPreference, PlayerQualityFallbackStrategy, PlayerQualityRequestApi, YoutubePlayerQualityLevel } from "./types";

import { metadata } from "./index.metadata";

/**
 * How long the streamed format is allowed to lag behind a request this feature made. A quality switch
 * buffers, and that buffering re-runs the enforcement tasks while getVideoStats()/getPlaybackQuality() still
 * report the previous format, so those two signals are only trusted again once the switch had time to land.
 */
const OWN_SWITCH_SETTLE_MS = 2000;
/** Player event that fires whenever the playback quality changes, no matter who asked for the change. */
const QUALITY_CHANGE_EVENT = "onPlaybackQualityChange";

let currentQuality: Nullable<YoutubePlayerQualityLevel> = null;
let qualityChangeTarget: Nullable<YouTubePlayerDiv> = null;

type EnforcementState = {
	appliedFormatId: Nullable<number>;
	appliedQuality: Nullable<string>;
	overrideDetected: boolean;
	pendingOwnApply: boolean;
	requestedQuality: Nullable<string>;
	settleUntil: number;
	verifiedOnce: boolean;
};

const enforcement: EnforcementState = {
	appliedFormatId: null,
	appliedQuality: null,
	overrideDetected: false,
	pendingOwnApply: false,
	requestedQuality: null,
	settleUntil: 0,
	verifiedOnce: false
};

function attachQualityChangeListener(player: YouTubePlayerDiv): void {
	if (qualityChangeTarget === player) return;
	detachQualityChangeListener();
	player.addEventListener(QUALITY_CHANGE_EVENT, handleQualityChange);
	qualityChangeTarget = player;
}

/**
 * Enforcement only ever stands down once it has been seen working: before that a mismatch is just the player
 * still starting up. Ads are excluded because the ad player reports its own quality, and so is the moment the
 * feature is placing its own request.
 */
function canDetectForeignQuality(): boolean {
	return enforcement.verifiedOnce && !enforcement.overrideDetected && !enforcement.pendingOwnApply && !isAdShowing();
}

function chooseBestFormat(closestQuality: string, preferPremium: boolean, fpsPreference: FpsPreference): Nullable<number> {
	const player = getPlayer();
	if (!player?.getAvailableQualityData) return null;

	const qualityData = player.getAvailableQualityData();
	// Entries without a format id cannot be requested by format; the level alone is applied then.
	const matching = qualityData.filter((q) => q.quality === closestQuality && typeof q.formatId === "number");
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

function detachQualityChangeListener(): void {
	if (!qualityChangeTarget) return;
	qualityChangeTarget.removeEventListener(QUALITY_CHANGE_EVENT, handleQualityChange);
	qualityChangeTarget = null;
}

function getPlayer(): Nullable<YouTubePlayerDiv> {
	return (
		isWatchPage() || isLivePage() ? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage() ? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
		: null
	);
}

/**
 * Runs on every quality change the player announces. The event itself carries the quality that plays now,
 * which lags behind the request that caused it, so the decision is taken on the requested quality instead.
 */
function handleQualityChange(): void {
	const player = getPlayer();
	if (!player) return;
	if (hasForeignQualityRequest(player)) markManualOverride();
}

async function hasForeignQuality(player: YouTubePlayerDiv): Promise<boolean> {
	/**
	 * The request is the signal that moves first. It is the only one that is not stale while the player is still
	 * buffering its way to a newly requested quality.
	 */
	if (hasForeignQualityRequest(player)) return true;
	if (!enforcement.appliedQuality || !canDetectForeignQuality() || Date.now() < enforcement.settleUntil) return false;

	const stats = player.getVideoStats();
	if (enforcement.appliedFormatId != null && typeof stats?.fmt === "number") {
		return stats.fmt !== enforcement.appliedFormatId;
	}

	const playbackQuality = await player.getPlaybackQuality();
	return !!playbackQuality && playbackQuality !== "unknown" && playbackQuality !== enforcement.appliedQuality;
}

/**
 * Whether the quality the player was last asked to play is not the one this feature asked for. Reads nothing
 * asynchronous, so it can also serve as the last check before the feature overwrites that request.
 */
function hasForeignQualityRequest(player: YouTubePlayerDiv): boolean {
	if (!enforcement.requestedQuality || !canDetectForeignQuality()) return false;
	const requestedQuality = readRequestedQuality(player);
	return !!requestedQuality && requestedQuality !== enforcement.requestedQuality;
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
		/**
		 * Suspension lasts until a navigation or a config change resets the state. Until then neither a retry run
		 * still in flight nor one started by a later player state change may enforce anything.
		 */
		if (enforcement.overrideDetected) return true;
		/**
		 * While an ad shows, the player answers for the ad: an "unknown" quality, the ad's level list and the ad's
		 * request. Applying those now would then be compared against the content video. Wait for the content instead;
		 * the player-state hook runs this again when the ad ends, even after this loop has used up its attempts.
		 */
		if (isAdShowing()) return false;
		const player = getPlayer();
		if (!player || !player.setPlaybackQuality || !player.getAvailableQualityLevels) return false;
		attachQualityChangeListener(player);
		const currentQuality = await player.getPlaybackQuality();
		/**
		 * A player that has not started reports no playback quality but already holds the video's levels, and a
		 * quality range set on it takes effect when playback starts. It is only trusted once it holds the video the
		 * page is on, so a player still carrying the previous video after a navigation waits for a later attempt.
		 */
		if ((!currentQuality || currentQuality === "unknown") && !playerHoldsCurrentVideo(player)) return false;

		const availableLevels = (await player.getAvailableQualityLevels()) as YoutubePlayerQualityLevel[];
		if (!availableLevels.length) return false;

		if (!quality || quality === "auto") return true;

		const closestQuality = chooseClosestQuality(quality, availableLevels, fallbackStrategy);
		if (!closestQuality) return false;

		if (await hasForeignQuality(player)) {
			markManualOverride();
			return true;
		}

		const qualityFormatId = chooseBestFormat(closestQuality, preferPremium, fpsPreference);

		/**
		 * Everything above awaits, and this task also runs on the player state change a manual switch causes, so the
		 * request is read once more right before it would be overwritten.
		 */
		if (hasForeignQualityRequest(player)) {
			markManualOverride();
			return true;
		}

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
			/**
			 * Read back inside the guarded window. The player composes a request with its own limits, so what it
			 * reports as requested, not the level that was asked for, is what later reads compare against. A player
			 * that has not taken the request yet (unstarted, or still on an ad) reads back "auto"; that is no
			 * baseline, so the verify task records one once the level is seen playing.
			 */
			const requestedQuality = readRequestedQuality(player);
			enforcement.requestedQuality = requestedQuality && requestedQuality !== "auto" ? requestedQuality : null;
		} finally {
			enforcement.pendingOwnApply = false;
			enforcement.settleUntil = Date.now() + OWN_SWITCH_SETTLE_MS;
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
		if (verified && !enforcement.requestedQuality) {
			enforcement.requestedQuality = readRequestedQuality(player) ?? enforcement.appliedQuality;
		}
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

/**
 * The quality the player was last asked to play. setPlaybackQualityRange() - the call behind both the
 * quality menu and the public player API - updates this synchronously, while getPlaybackQuality() and
 * getVideoStats() only change once the switch has landed. Players that do not expose it fall back to null.
 */
/** Whether the player reports the video the page is on, rather than the one it played before a navigation. */
function playerHoldsCurrentVideo(player: YouTubePlayerDiv): boolean {
	const { getVideoData } = player as unknown as { getVideoData?: () => undefined | { video_id?: string } };
	if (typeof getVideoData !== "function") return false;
	const videoId = getVideoData.call(player)?.video_id;
	if (!videoId) return false;
	const { pathname, searchParams } = new URL(window.location.href);
	return searchParams.get("v") === videoId || pathname.endsWith(`/${videoId}`);
}
function readRequestedQuality(player: YouTubePlayerDiv): Nullable<string> {
	const { getPreferredQuality } = player as PlayerQualityRequestApi & YouTubePlayerDiv;
	if (typeof getPreferredQuality !== "function") return null;
	try {
		const requestedQuality: unknown = getPreferredQuality.call(player);
		return typeof requestedQuality === "string" && requestedQuality !== "" && requestedQuality !== "unknown" ? requestedQuality : null;
	} catch {
		return null;
	}
}

function resetEnforcementState(): void {
	detachQualityChangeListener();
	enforcement.appliedFormatId = null;
	enforcement.appliedQuality = null;
	enforcement.overrideDetected = false;
	enforcement.pendingOwnApply = false;
	enforcement.requestedQuality = null;
	enforcement.settleUntil = 0;
	enforcement.verifiedOnce = false;
}

export default createFeature({
	...metadata,
	onDisable: () => {
		// The enable run leaves a player state hook behind. Left alone it re-runs enforcement on the next state
		// change, which supersedes the restore run below before it has done anything, so it goes first.
		registry.playerManager.cleanup(metadata.id);
		detachQualityChangeListener();
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
