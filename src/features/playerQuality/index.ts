import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { browserColorLog } from "@/src/utils/logging";
import { lookupItag } from "@/src/utils/player/itagDb";
import { chooseClosestQuality } from "@/src/utils/player/quality";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

import type {
	FpsPreference,
	PlayerQualityFallbackStrategy,
	PlayerQualityRequestApi,
	YoutubePlayerQualityLevel
} from "./types";

import { metadata } from "./index.metadata";

/**
 * How long the streamed format is allowed to lag behind a request this feature made. A quality switch
 * buffers, and that buffering re-runs the enforcement tasks while getVideoStats()/getPlaybackQuality() still
 * report the previous format, so those two signals are only trusted again once the switch had time to land.
 */
const OWN_SWITCH_SETTLE_MS = 2000;
/** Player event that fires whenever the playback quality changes, no matter who asked for the change. */
const QUALITY_CHANGE_EVENT = "onPlaybackQualityChange";
/**
 * How long a position captured for a quality switch stays worth putting back (bug #1228): the switch
 * this feature asks for lands inside this window, and the restart it can cause comes with it.
 */
const POSITION_HOLD_MS = 5000;
/** Playback that reached at least this far is worth restoring; a restart the switch caused lands below it. */
const POSITION_MIN_RESTORE_SECONDS = 1;

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

/** The apply/verify pair of the enforcement run in force; {@link runEnforcement} hands it to the retry seam. */
type EnforceTasks = [() => Promise<boolean>, () => Promise<boolean>];

/**
 * The tasks of the run currently in force, kept so a pin the player drops *after* it landed can be
 * re-applied by re-running them instead of rebuilding anything. playerSpeed reaches the same seam the
 * same way for a rate the player resets (handleRateChange → reapplyEnforcedSpeed → registry.playerRetry),
 * which is why a speed survived an event that used to take the quality pin with it.
 */
let enforcementTasks: Nullable<EnforceTasks> = null;
/**
 * How often one page may re-apply a pin the player dropped. The player resets the request a few times at
 * most; past this the fight is not worth having (playerSpeed bounds its re-applies the same way).
 */
const MAX_AUTOMATIC_REAPPLIES = 5;
let automaticReapplies = 0;
/**
 * The position a quality switch is being watched for (bug #1228). Armed when this feature asks for a
 * change, raised by {@link holdPlaybackPosition} for as long as the window lasts, and dropped once the
 * switch has settled or the restart it caused has been put back. Nothing else in the feature reads it.
 */
let positionHold: Nullable<{ target: number; until: number }> = null;

/**
 * Opens the position window for a switch this feature is about to ask for (bug #1228). The target starts
 * at where playback is now and is only ever raised while the window lasts, so a restart the switch causes
 * shows up as a drop back below {@link POSITION_MIN_RESTORE_SECONDS}. A live stream's playhead is not a
 * position that can restart from 0:00, so it never gets a window.
 */
async function armPositionHold(player: YouTubePlayerDiv): Promise<void> {
	if (isLivePage()) {
		positionHold = null;
		return;
	}
	const { getVideoData } = player as unknown as {
		getVideoData?: () => undefined | { isLive?: boolean };
	};
	if (typeof getVideoData === "function" && getVideoData.call(player)?.isLive) {
		positionHold = null;
		return;
	}
	let time = 0;
	try {
		const current = await player.getCurrentTime();
		if (Number.isFinite(current)) time = current;
	} catch {
		time = 0;
	}
	positionHold = {
		target: Math.max(positionHold?.target ?? 0, time),
		until: Math.max(positionHold?.until ?? 0, Date.now() + POSITION_HOLD_MS)
	};
}

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
	return (
		enforcement.verifiedOnce &&
		!enforcement.overrideDetected &&
		!enforcement.pendingOwnApply &&
		!isAdShowing()
	);
}

function chooseBestFormat(
	closestQuality: string,
	preferPremium: boolean,
	fpsPreference: FpsPreference
): Nullable<number> {
	const player = getPlayer();
	if (!player?.getAvailableQualityData) return null;

	const qualityData = player.getAvailableQualityData();
	// Entries without a format id cannot be requested by format; the level alone is applied then.
	const matching = qualityData.filter(
		(q) => q.quality === closestQuality && typeof q.formatId === "number"
	);
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
	return isWatchPage() || isLivePage()
		? document.querySelector<YouTubePlayerDiv>("div#movie_player")
		: isShortsPage()
			? document.querySelector<YouTubePlayerDiv>("div#shorts-player")
			: null;
}

/**
 * Runs on every quality change the player announces. The event itself carries the quality that plays now,
 * which lags behind the request that caused it, so the decision is taken on the requested quality instead.
 *
 * This is the quality half of the asymmetry bug #1492: playerSpeed's ratechange listener not only watches,
 * it *re-arms* the retry when the player resets the rate, so a speed comes back. The quality listener used
 * to only ever suspend; a pin the player dropped after it landed had nothing left to bring it back, because
 * the apply/verify run had already succeeded and taken its state hook with it.
 */
function handleQualityChange(): void {
	const player = getPlayer();
	if (!player) return;
	if (hasForeignQualityRequest(player)) {
		markManualOverride();
		return;
	}
	if (hasDroppedPin(player)) reapplyDroppedPin();
}

/**
 * Whether the player stopped honouring a pin this feature had already landed: the request reads back as
 * auto (or as nothing) once the enforced level had time to settle. Auto is also what the request reads
 * while our own switch is still in flight, so the pending-apply flag and the settle window keep that case
 * out — without them every pin would look dropped the moment it was asked for.
 */
function hasDroppedPin(player: YouTubePlayerDiv): boolean {
	if (enforcement.overrideDetected || enforcement.pendingOwnApply) return false;
	// Both are only ever set once the pin has actually landed; before that the running apply is the answer.
	if (!enforcement.appliedQuality || !enforcement.requestedQuality) return false;
	if (isAdShowing()) return false;
	if (Date.now() < enforcement.settleUntil) return false;
	const { getPreferredQuality } = player as PlayerQualityRequestApi & YouTubePlayerDiv;
	// Without the request API a dropped pin cannot be told apart from an unknown one; do not guess.
	if (typeof getPreferredQuality !== "function") return false;
	const requestedQuality = readRequestedQuality(player);
	return !requestedQuality || requestedQuality === "auto";
}

async function hasForeignQuality(player: YouTubePlayerDiv): Promise<boolean> {
	/**
	 * Override detection is request/pin only. Streamed format (ABR) changes continuously for the
	 * same level and used to look like a manual switch. Auto preferred quality is not foreign —
	 * the pin simply has not stuck yet and applyTask should try again.
	 */
	if (hasForeignQualityRequest(player)) return true;
	if (
		!enforcement.appliedQuality ||
		!canDetectForeignQuality() ||
		Date.now() < enforcement.settleUntil
	)
		return false;

	const playbackQuality = await player.getPlaybackQuality();
	return (
		!!playbackQuality &&
		playbackQuality !== "unknown" &&
		playbackQuality !== "auto" &&
		playbackQuality !== enforcement.appliedQuality
	);
}

/**
 * Whether the quality the player was last asked to play is not the one this feature asked for.
 * Streamed format (ABR) is ignored. Auto (or missing) preferred quality means nothing is pinned
 * right now — re-apply rather than treat that as a user switch. Only a different non-auto pin
 * counts as foreign.
 */
function hasForeignQualityRequest(player: YouTubePlayerDiv): boolean {
	if (!enforcement.requestedQuality || !canDetectForeignQuality()) return false;
	const requestedQuality = readRequestedQuality(player);
	if (!requestedQuality || requestedQuality === "auto") return false;
	return requestedQuality !== enforcement.requestedQuality;
}

/**
 * Keeps the playback position across a quality switch this feature asked for (bug #1228: the switch
 * restarts the media at 0:00). Nothing in this feature's change path reloads the page or replaces the
 * player element — `setPlaybackQualityRange()`/`setPlaybackQuality()` only re-request the stream — so the
 * restart happens inside the player and is repaired here through the same player API the feature already
 * calls: `getCurrentTime()` to notice it, `seekTo()` to put it back.
 *
 * Returns false while the window is still open, so the verify task that is already ticking keeps this run
 * alive long enough to see the restart; true once there is nothing left to watch (no window, expired, or
 * the position was put back), which lets the run finish as before.
 */
async function holdPlaybackPosition(player: YouTubePlayerDiv): Promise<boolean> {
	if (!positionHold) return true;
	if (Date.now() > positionHold.until) {
		positionHold = null;
		return true;
	}
	const { getCurrentTime, seekTo } = player as unknown as {
		getCurrentTime?: () => Promise<number>;
		seekTo?: (seconds: number, allowSeekAhead: boolean) => Promise<void>;
	};
	if (typeof getCurrentTime !== "function" || typeof seekTo !== "function") {
		positionHold = null;
		return true;
	}
	let time = 0;
	try {
		const current = await getCurrentTime.call(player);
		if (Number.isFinite(current)) time = current;
	} catch {
		return true;
	}
	// Playback only ever moves forward between restarts, so the target tracks where it has got to.
	if (time > positionHold.target) positionHold.target = time;
	// The bug is a reset to 0:00: only a collapse back to the start is repaired, so a user seeking
	// backwards inside the window is never dragged forward again.
	if (time >= POSITION_MIN_RESTORE_SECONDS || positionHold.target < POSITION_MIN_RESTORE_SECONDS)
		return false;
	const { target: restoreTo } = positionHold;
	positionHold = null;
	browserColorLog(
		`Playback restarted at ${time.toFixed(1)}s by the quality switch - restoring ${restoreTo.toFixed(1)}s`,
		"FgYellow"
	);
	try {
		await seekTo.call(player, restoreTo, true);
	} catch {
		// The player refused the seek (still switching); the next tick inside the window tries again.
		return false;
	}
	return true;
}

function isAdShowing(): boolean {
	return !!document.querySelector(".ad-showing, .ytp-ad-player-overlay");
}

/** Quality setting that means "do not pin a level"; the player keeps its own ABR choice. */
function isUnpinnedQuality(quality: "" | YoutubePlayerQualityLevel): boolean {
	return !quality || quality === "auto";
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
		// Unpinned quality: leave the player's own ABR alone; there is nothing to apply or verify.
		if (isUnpinnedQuality(quality)) return true;
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
		if ((!currentQuality || currentQuality === "unknown") && !playerHoldsCurrentVideo(player))
			return false;

		const availableLevels =
			(await player.getAvailableQualityLevels()) as YoutubePlayerQualityLevel[];
		if (!availableLevels.length) return false;

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

		// The switch below can restart the media at 0:00 (#1228); watch the position across it.
		await armPositionHold(player);

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
			enforcement.requestedQuality =
				requestedQuality && requestedQuality !== "auto" ? requestedQuality : null;
		} finally {
			enforcement.pendingOwnApply = false;
			enforcement.settleUntil = Date.now() + OWN_SWITCH_SETTLE_MS;
		}

		player.dataset.defaultQuality = closestQuality;
		enforcement.appliedQuality = closestQuality;
		enforcement.appliedFormatId = qualityFormatId;
		browserColorLog(
			`Requested ${closestQuality}${qualityFormatId ? ` (format ${qualityFormatId})` : ""}`,
			"FgMagenta"
		);
		return true;
	};

	const verifyTask = async (): Promise<boolean> => {
		if (enforcement.overrideDetected || isAdShowing()) return true;
		// Unpinned quality has nothing to verify; returning false here kept the retry loop spinning forever.
		if (isUnpinnedQuality(quality)) return true;
		if (!enforcement.appliedQuality) return false;
		const player = getPlayer();
		if (!player) return false;

		const recordRequestedBaseline = () => {
			enforcement.verifiedOnce = true;
			if (enforcement.requestedQuality) return;
			const requestedQuality = readRequestedQuality(player);
			enforcement.requestedQuality =
				requestedQuality && requestedQuality !== "auto"
					? requestedQuality
					: enforcement.appliedQuality;
		};

		/**
		 * Our chosen format streaming is the strongest signal the pin landed. ABR can still move
		 * to another format for the same level later without that being a manual override.
		 */
		let verified = false;
		if (enforcement.appliedFormatId != null) {
			const stats = player.getVideoStats();
			verified = typeof stats?.fmt === "number" && stats.fmt === enforcement.appliedFormatId;
		}
		if (!verified) {
			/**
			 * Same level (playback or pin) is enough: ABR may stream a different format for that level,
			 * and a format-only check re-ran the retry loop then treated the next ABR shift as manual.
			 */
			const playbackQuality = await player.getPlaybackQuality();
			const preferredQuality = readRequestedQuality(player);
			verified =
				playbackQuality === enforcement.appliedQuality ||
				preferredQuality === enforcement.appliedQuality;
		}
		if (verified) recordRequestedBaseline();
		/**
		 * The pin can be right while the switch that put it there restarts the media (#1228). The hold
		 * answers false until its window has passed, so this task — the one still ticking — stays on the
		 * job long enough to notice that restart and put the position back.
		 */
		const positionHeld = await holdPlaybackPosition(player);
		return verified && positionHeld;
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
	browserColorLog(
		"Manual quality change detected - suspending enforcement until navigation or config change",
		"FgYellow"
	);
	registry.cleanupPlayerRetry(metadata.id);
}

/**
 * The quality the player was last asked to play. setPlaybackQualityRange() - the call behind both the
 * quality menu and the public player API - updates this synchronously, while getPlaybackQuality() and
 * getVideoStats() only change once the switch has landed. Players that do not expose it fall back to null.
 */
/** Whether the player reports the video the page is on, rather than the one it played before a navigation. */
function playerHoldsCurrentVideo(player: YouTubePlayerDiv): boolean {
	const { getVideoData } = player as unknown as {
		getVideoData?: () => undefined | { video_id?: string };
	};
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
		return typeof requestedQuality === "string" &&
			requestedQuality !== "" &&
			requestedQuality !== "unknown"
			? requestedQuality
			: null;
	} catch {
		return null;
	}
}

/**
 * Re-applies a pin the player dropped, through the same `registry.playerRetry` call enable and navigation
 * make, with the same tasks — the shape playerSpeed's reapplyEnforcedSpeed uses for a rate the player
 * reset. Nothing new: the retry seam is the restore flow this feature already had.
 */
function reapplyDroppedPin(): void {
	if (!enforcementTasks || automaticReapplies >= MAX_AUTOMATIC_REAPPLIES) return;
	automaticReapplies++;
	browserColorLog("Quality pin dropped by the player - re-applying it", "FgYellow");
	runEnforcement(enforcementTasks);
}

function resetEnforcementState(): void {
	detachQualityChangeListener();
	automaticReapplies = 0;
	positionHold = null;
	enforcement.appliedFormatId = null;
	enforcement.appliedQuality = null;
	enforcement.overrideDetected = false;
	enforcement.pendingOwnApply = false;
	enforcement.requestedQuality = null;
	enforcement.settleUntil = 0;
	enforcement.verifiedOnce = false;
}

/**
 * The single enforcement path. Enable, navigation and a dropped-pin re-apply all hand their apply/verify
 * pair to the retry seam here, so the pin is put in place by the same code whichever of the three started
 * it; the pair is kept so a later re-apply re-runs exactly what the page is enforcing.
 */
function runEnforcement(tasks: EnforceTasks): void {
	enforcementTasks = tasks;
	void registry.playerRetry(metadata.id, tasks, ["applyQuality", "verifyQuality"], {
		maxAttempts: 30,
		onPlayerStateChange: true,
		pageTypes: ["watch", "live", "shorts"],
		waitForLoaded: true
	});
}

export default createFeature({
	...metadata,
	onDisable: () => {
		// Lifecycle already aborted this feature's player retries and state hook before onDisable runs
		detachQualityChangeListener();
		enforcementTasks = null;
		positionHold = null;
		void registry.playerRetry(metadata.id, [makeRestoreQualityTask()], ["restoreQuality"], {
			maxAttempts: 10,
			pageTypes: ["watch", "live", "shorts"],
			waitForLoaded: true
		});
	},
	onEnable: async ({ fallbackStrategy, fpsPreference, preferPremium, quality }) => {
		resetEnforcementState();
		browserColorLog(`Enforcing quality ${quality} (fallback ${fallbackStrategy})`, "FgMagenta");
		const player = getPlayer();
		if (player && player.getPlaybackQuality) {
			currentQuality = (await player.getPlaybackQuality()) as YoutubePlayerQualityLevel;
		}
		runEnforcement(
			makeApplyQualityTasks(
				fallbackStrategy,
				quality,
				preferPremium ?? false,
				fpsPreference ?? "default"
			)
		);
	},
	onNavigate: ({ fallbackStrategy, fpsPreference, preferPremium, quality }) => {
		resetEnforcementState();
		runEnforcement(
			makeApplyQualityTasks(
				fallbackStrategy,
				quality,
				preferPremium ?? false,
				fpsPreference ?? "default"
			)
		);
	}
});
