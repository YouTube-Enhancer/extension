import type { Nullable } from "@/src/types";

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
		toggle.click();
		return false;
	};
}
function makeEnableTask(): () => boolean {
	let settleAttempts = 0;

	return (): boolean => {
		if (hasOverriddenDefault) return true;
		const toggle = document.querySelector<HTMLButtonElement>(".ytp-autonav-toggle");
		if (!toggle) return false;
		const current = readAutoPlayState();

		// aria-checked can briefly read a premature "false" just after playback
		// starts; wait for a non-false value before trusting it.
		if (current === false || current === null) {
			settleAttempts++;
			if (settleAttempts < 10) return false;
			// After 10 retries the state is genuinely off (or unreachable).
			previousAutoPlayState ??= false;
			hasOverriddenDefault = true;
			return true;
		}

		previousAutoPlayState ??= current;

		// Only count the override as done once the toggle actually reports the new state: a click that was
		// dropped would otherwise end the work with autoplay still on.
		if (!turnAutoPlayOff(toggle)) return false;
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
		const current = readAutoPlayState();
		if (!current) return true;
		// Same as the enable task: a dropped click leaves autoplay on, so this keeps retrying instead of
		// reporting success on a click that changed nothing.
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
}

/**
 * Clicks the autoplay toggle and reports whether autoplay ended up off. YouTube flips aria-checked in its own
 * click handler, so a click that landed shows immediately; a click aimed at a player YouTube has not finished
 * wiring up - which is what an in-page navigation onto a watch page leaves behind - is dropped and leaves the
 * toggle on, so the caller has to try again on a later attempt rather than treat the click as done.
 */
function turnAutoPlayOff(toggle: HTMLButtonElement): boolean {
	// Stop after a few dropped clicks so a toggle that never responds cannot be clicked forever.
	if (toggleClickAttempts >= MAX_TOGGLE_CLICK_ATTEMPTS) return true;
	if (Date.now() - lastToggleClickAt >= TOGGLE_CLICK_INTERVAL) {
		lastToggleClickAt = Date.now();
		toggleClickAttempts++;
		toggle.click();
	}
	return readAutoPlayState() === false;
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
