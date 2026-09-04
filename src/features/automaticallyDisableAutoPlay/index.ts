import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";

// The autoplay state before we first overrode it, so it can be restored if the
// feature is switched off.
let previousAutoPlayState: Nullable<boolean> = null;
// Override YouTube's default autoplay only once per session; later videos keep
// whatever the user chose.
let hasOverriddenDefault = false;
// When the toggle was last clicked and how often, so the two retry loops a navigation starts (onEnable and
// onNavigate) cannot click in quick succession and toggle autoplay straight back on.
let lastToggleClickAt = 0;
let toggleClickAttempts = 0;
const MAX_TOGGLE_CLICK_ATTEMPTS = 3;
const TOGGLE_CLICK_INTERVAL = 1000;
// YouTube re-initialises the toggle from the account's setting shortly after a navigation, which can undo an
// override that had already taken, so "off" has to hold for this many reads (300 ms apart) before the work is done.
let stableOffReads = 0;
const STABLE_OFF_READS = 6;
// A real click on the toggle is the user's choice, which ends the override for the session: without this the
// stability check above would treat the user's click like a YouTube reset and switch autoplay off again.
let userChoseAutoPlay = false;
let watchedToggle: Nullable<{ element: HTMLButtonElement; handler: (event: MouseEvent) => void }> = null;

// The toggle's own click handler calls these on the player; they are not part of the public player API.
type AutonavPlayer = YouTubePlayerDiv & { setAutonav?: (enabled: boolean) => void; setAutonavState?: (state: number) => void };
function unwatchToggle(): void {
	if (!watchedToggle) return;
	watchedToggle.element.removeEventListener("click", watchedToggle.handler, { capture: true });
	watchedToggle = null;
}
function watchToggleForUserClicks(toggle: HTMLButtonElement): void {
	if (watchedToggle?.element === toggle) return;
	unwatchToggle();
	const handler = (event: MouseEvent) => {
		if (event.isTrusted) userChoseAutoPlay = true;
	};
	toggle.addEventListener("click", handler, { capture: true });
	watchedToggle = { element: toggle, handler };
}
const AUTONAV_STATE_OFF = 1;
const AUTONAV_STATE_ON = 2;

/**
 * YouTube's newer control bar sometimes folds the toggle away with an inline `display: none`, and while it is
 * folded the button is inert: a click, real or scripted, changes nothing. The player keeps the autonav API the
 * toggle drives, so that is what is used then. The click stays the first choice where it works, since only the
 * click persists the choice to the account.
 */
function isToggleFolded(toggle: HTMLButtonElement): boolean {
	return toggle.style.display === "none" || getComputedStyle(toggle).display === "none";
}
// Restore autoplay to the state before the feature first intervened.
function makeDisableTask(): () => boolean {
	return (): boolean => {
		if (!isWatchPage() || previousAutoPlayState === null) return true;
		const toggle = document.querySelector<HTMLButtonElement>(".ytp-autonav-toggle");
		if (!toggle) return false;
		const current = readAutoPlayState();
		if (current === previousAutoPlayState) {
			previousAutoPlayState = null;
			hasOverriddenDefault = false;
			resetToggleClicks();
			return true;
		}
		setAutoPlay(toggle, previousAutoPlayState);
		return false;
	};
}
function makeEnableTask(): () => boolean {
	let settleAttempts = 0;

	return (): boolean => {
		if (hasOverriddenDefault) return true;
		const toggle = document.querySelector<HTMLButtonElement>(".ytp-autonav-toggle");
		if (!toggle) return false;
		watchToggleForUserClicks(toggle);
		const current = readAutoPlayState();

		if (current === null) {
			settleAttempts++;
			if (settleAttempts < 10) return false;
			// After 10 retries the state is unreachable.
			previousAutoPlayState ??= false;
			hasOverriddenDefault = true;
			return true;
		}
		// aria-checked can briefly read a premature "false" just after playback starts; wait for a non-false
		// value before trusting it. A "true" is what the user had, so it is remembered as soon as it shows.
		if (current) previousAutoPlayState ??= true;
		else {
			settleAttempts++;
			if (settleAttempts < 10) return false;
		}
		// Only count the override as done once the toggle reports "off" and keeps reporting it: a click that
		// was dropped, or a state YouTube resets a moment later, would otherwise end the work with autoplay on.
		if (!turnAutoPlayOff(toggle)) return false;
		previousAutoPlayState ??= false;
		hasOverriddenDefault = true;
		return true;
	};
}

function makeNavigateTask(): () => boolean {
	// Only override on the first session navigation; once the user has made their
	// choice, later videos keep whatever they chose.
	return (): boolean => {
		if (hasOverriddenDefault) return true;
		const toggle = document.querySelector<HTMLButtonElement>(".ytp-autonav-toggle");
		if (!toggle) return false;
		watchToggleForUserClicks(toggle);
		if (readAutoPlayState() === null) return false;
		// Same as the enable task: a dropped click leaves autoplay on and YouTube may reset the toggle a moment
		// after the navigation, so this keeps retrying until "off" holds instead of trusting the first reading.
		return turnAutoPlayOff(toggle);
	};
}
// Read the live autoplay state, re-querying so we never read a detached node.
function readAutoPlayState(): Nullable<boolean> {
	const toggle = document.querySelector(".ytp-autonav-toggle-button");
	return toggle ? toggle.getAttribute("aria-checked") === "true" : null;
}

function resetToggleClicks(): void {
	lastToggleClickAt = 0;
	toggleClickAttempts = 0;
	stableOffReads = 0;
	userChoseAutoPlay = false;
}

function setAutoPlay(toggle: HTMLButtonElement, enabled: boolean, preferPlayer = false): void {
	if ((preferPlayer || isToggleFolded(toggle)) && setAutoPlayThroughPlayer(enabled)) return;
	toggle.click();
}

function setAutoPlayThroughPlayer(enabled: boolean): boolean {
	const player = document.querySelector<AutonavPlayer>("#movie_player");
	if (!player) return false;
	if (typeof player.setAutonav === "function") player.setAutonav(enabled);
	else if (typeof player.setAutonavState === "function") player.setAutonavState(enabled ? AUTONAV_STATE_ON : AUTONAV_STATE_OFF);
	else return false;
	return true;
}

/**
 * Clicks the autoplay toggle and reports whether autoplay ended up off. YouTube flips aria-checked in its own
 * click handler, so a click that landed shows immediately; a click aimed at a player YouTube has not finished
 * wiring up - which is what an in-page navigation onto a watch page leaves behind - is dropped and leaves the
 * toggle on, so the caller has to try again on a later attempt rather than treat the click as done.
 */
function turnAutoPlayOff(toggle: HTMLButtonElement): boolean {
	if (userChoseAutoPlay) return true;
	if (readAutoPlayState() === false) {
		stableOffReads++;
		return stableOffReads >= STABLE_OFF_READS;
	}
	stableOffReads = 0;
	// Stop after a few dropped clicks so a toggle that never responds cannot be clicked forever.
	if (toggleClickAttempts >= MAX_TOGGLE_CLICK_ATTEMPTS) return true;
	if (Date.now() - lastToggleClickAt >= TOGGLE_CLICK_INTERVAL) {
		lastToggleClickAt = Date.now();
		toggleClickAttempts++;
		// A click that was dropped twice is not going to land on the third try; the player API is used instead.
		setAutoPlay(toggle, false, toggleClickAttempts >= MAX_TOGGLE_CLICK_ATTEMPTS);
	}
	return false;
}

export default createFeature({
	...metadata,
	onConfigChange: (config) => {
		// Switching the feature off should let it override again when re-enabled,
		// including when that happens off a watch page where onDisable never runs.
		if (!config.enabled) {
			hasOverriddenDefault = false;
			resetToggleClicks();
		}
	},
	onDisable: () => {
		unwatchToggle();
		void registry.playerManager.executeWithRetries(metadata.id, [makeDisableTask()], ["disableAutoPlay"], {
			interval: 300,
			maxAttempts: 24,
			waitForLoaded: true
		});
	},
	onEnable: () => {
		void registry.playerManager.executeWithRetries(metadata.id, [makeEnableTask()], ["enableAutoPlay"], {
			interval: 300,
			maxAttempts: 30,
			waitForLoaded: true
		});
	},
	onNavigate: () => {
		void registry.playerManager.executeWithRetries(metadata.id, [makeNavigateTask()], ["navigateAutoPlay"], {
			interval: 300,
			maxAttempts: 30,
			waitForLoaded: true
		});
	}
});
