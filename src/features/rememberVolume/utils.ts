import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { registry } from "@/src/features/_registry/featureRegistry";
import { waitForPagePlayer } from "@/src/utils/dom/pageReadiness";
import { waitForElement } from "@/src/utils/dom/wait";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

const stateAPI = registry.getStateAPI("rememberVolume");

/** The video element a listener is currently attached to; keeps repeated setup calls idempotent. */
let attachedVideo: Nullable<HTMLVideoElement> = null;

/** Called from onDisable: the next enable has to attach a fresh listener, even on the same element. */
export function resetVolumeChangeListener() {
	attachedVideo = null;
}

/**
 * Attach the recording listener for the current page. `nativeVolume` is the volume the player
 * reported before the restore was applied; on shorts it doubles as the discriminator between
 * YouTube re-applying its own persisted volume (which returns to that value and must be
 * re-asserted against) and a legitimate volume change (which goes anywhere else).
 */
export async function setupVolumeChangeListener(options?: { nativeVolume?: Nullable<number> }) {
	const IsWatchPage = isWatchPage();
	const IsLivePage = isLivePage();
	const IsShortsPage = isShortsPage();
	if (!IsWatchPage && !IsLivePage && !IsShortsPage) return;
	const playerContainer = await waitForPagePlayer();
	if (!playerContainer) return;
	// The video element renders after the player shell on live pages; wait for it (scoped to the
	// player) instead of missing the attach window entirely when the shell is up but the media
	// element is not yet in the document.
	const videoElement = await waitForElement<HTMLVideoElement>(
		"div > video",
		playerContainer,
		10_000,
		"optional"
	);
	if (!videoElement) return;
	// The reapply retry calls this every tick until its task succeeds; a fresh closure per call
	// would defeat the event manager's dedup and stack recording listeners for the page session.
	if (attachedVideo === videoElement) return;
	attachedVideo = videoElement;
	// YouTube re-applies its own persisted volume when a short starts playing, which can land
	// after the restore has already been applied and verified. While that startup window is open
	// the listener re-asserts the remembered value - but only when the incoming volume equals the
	// player's pre-restore volume, so a legitimate change (which never returns to that value) is
	// never fought. Watch pages are excluded entirely: the SPA-restore tests set a new volume
	// immediately after navigation and it must stick.
	const { nativeVolume } = options ?? {};
	const restoreDeadline = IsShortsPage ? Date.now() + 10_000 : 0;
	eventManager.addEventListener(
		videoElement,
		"volumechange",
		({ currentTarget }) => {
			void (async () => {
				if (!currentTarget) return;
				const newVolume = await playerContainer.getVolume();
				if (IsWatchPage || IsLivePage) {
					stateAPI.setState((prev) => ({ ...prev, watchPageVolume: newVolume }));
				} else if (IsShortsPage) {
					const { shortsPageVolume: remembered } = stateAPI.getState();
					stateAPI.setState((prev) => ({ ...prev, shortsPageVolume: newVolume }));
					if (
						remembered &&
						newVolume !== remembered &&
						nativeVolume !== undefined &&
						newVolume === nativeVolume &&
						Date.now() < restoreDeadline
					) {
						await playerContainer.setVolume(remembered);
					}
				}
			})();
		},
		"rememberVolume"
	);
}
