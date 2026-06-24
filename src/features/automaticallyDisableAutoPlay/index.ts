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

		if (current) {
			toggle.click();
			hasOverriddenDefault = true;
			return false;
		}

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
		if (current) {
			toggle.click();
		}
		return true;
	};
}

// Read the live autoplay state, re-querying so we never read a detached node.
function readAutoPlayState(): Nullable<boolean> {
	const toggle = document.querySelector(".ytp-autonav-toggle-button");
	return toggle ? toggle.getAttribute("aria-checked") === "true" : null;
}

export default createFeature({
	...metadata,
	onConfigChange: (config) => {
		// Switching the feature off should let it override again when re-enabled,
		// including when that happens off a watch page where onDisable never runs.
		if (!config.enabled) hasOverriddenDefault = false;
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
			maxAttempts: 10,
			waitForLoaded: true
		});
	}
});
