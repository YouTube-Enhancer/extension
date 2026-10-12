import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { isShortsPage } from "@/src/utils/url";

let originalVolume: Nullable<number> = null;
/** The shorts video element the re-assert listener is attached to; keeps repeat setup idempotent. */
let reassertVideo: Nullable<HTMLVideoElement> = null;
/**
 * State of the shorts startup re-assert window. Refreshed on every successful apply so a volume
 * edit while enabled updates the target without stacking listeners.
 */
let reassertState: Nullable<{ deadline: number; nativeVolume: number; target: number }> = null;

/** Called from onDisable: the next enable has to attach a fresh listener, even on the same element. */
export function resetVolumeChangeListener() {
	eventManager.removeEventListeners("globalVolume");
	reassertVideo = null;
	reassertState = null;
}

export async function restorePlayerVolume(playerContainer: YouTubePlayerDiv) {
	if (!playerContainer.setVolume || originalVolume === null) return;
	await playerContainer.setVolume(originalVolume);
	originalVolume = null;
}

export async function setPlayerVolume(playerContainer: YouTubePlayerDiv, userVolume: number) {
	if (
		!playerContainer.getVolume ||
		!playerContainer.setVolume ||
		!playerContainer.isMuted ||
		!playerContainer.unMute
	)
		return;
	const [currentVolume, isMuted] = await Promise.all([
		playerContainer.getVolume(),
		playerContainer.isMuted()
	]);
	if (originalVolume === null) originalVolume = currentVolume;
	const clampedVolume = Math.max(0, Math.min(userVolume, 100));
	await playerContainer.setVolume(clampedVolume);
	if (isMuted && typeof playerContainer.unMute === "function") await playerContainer.unMute();
}

/**
 * Shorts re-apply YouTube's own persisted volume when a short starts playing, which can land after
 * the feature's verified apply and win the page (the full-page-reload race). While that startup
 * window is open the listener puts the configured volume back - but only when the incoming volume
 * equals the player's pre-apply volume, so a legitimate user change (which never returns to that
 * value) is never fought. Watch pages are excluded: a volume the user sets after navigation has to
 * stick there.
 */
export function setupVolumeReassertListener(
	playerContainer: YouTubePlayerDiv,
	target: number,
	nativeVolume: Nullable<number>
) {
	if (!isShortsPage()) return;
	if (nativeVolume === null || nativeVolume === undefined) return;
	const videoElement = playerContainer.querySelector<HTMLVideoElement>("video");
	if (!videoElement) return;
	// Target and window refresh per apply (a volume edit while enabled must be re-asserted), but the
	// native snapshot is kept from the first attach: later applies would read our own write back.
	reassertState = {
		deadline: Date.now() + 10_000,
		nativeVolume: reassertState?.nativeVolume ?? nativeVolume,
		target
	};
	if (reassertVideo === videoElement) return;
	reassertVideo = videoElement;
	eventManager.addEventListener(
		videoElement,
		"volumechange",
		({ currentTarget }) => {
			void (async () => {
				if (!currentTarget) return;
				const state = reassertState;
				if (!state || Date.now() > state.deadline) return;
				if (typeof playerContainer.getVolume !== "function") return;
				const newVolume = await playerContainer.getVolume();
				if (newVolume !== state.nativeVolume || newVolume === state.target) return;
				await playerContainer.setVolume(state.target);
			})();
		},
		"globalVolume"
	);
}
