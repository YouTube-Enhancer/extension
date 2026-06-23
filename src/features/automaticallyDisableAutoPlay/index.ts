import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { delay } from "@/src/utils/async";
import { waitForElement, waitForPlayerLoaded } from "@/src/utils/dom/wait";
import { isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";

// The autoplay state before we first overrode it, so it can be restored if the
// feature is switched off.
let previousAutoPlayState: Nullable<boolean> = null;
// Override YouTube's default autoplay only once per session; later videos keep
// whatever the user chose.
let hasOverriddenDefault = false;

// Click the toggle until autoplay reaches `desired`, returning whether it got
// there. The control can be present in the DOM before YouTube wires up its click
// handler, so a single click is unreliable. Retry, re-querying the live element,
// until aria-checked actually changes.
async function clickToggleUntil(player: ParentNode, desired: boolean): Promise<boolean> {
	for (let attempt = 0; attempt < 24 && readAutoPlayState(player) !== desired; attempt++) {
		player.querySelector<HTMLButtonElement>(".ytp-autonav-toggle")?.click();
		await delay(300);
	}
	return readAutoPlayState(player) === desired;
}

// Resolve the player once it is ready enough to trust the autoplay toggle.
// waitForPlayerLoaded clears the initial unstarted/buffering load (where the
// toggle can read a premature "false"), then we wait for the toggle itself,
// which YouTube only adds a few seconds into playback. The settle loop in
// onEnable absorbs any aria-checked lag that remains.
async function getReadyPlayer(): Promise<Nullable<YouTubePlayerDiv>> {
	const player = await waitForElement<YouTubePlayerDiv>("div#movie_player");
	if (!player) return null;
	try {
		await waitForPlayerLoaded(player, 20000);
	} catch {
		return null;
	}
	const toggle = await waitForElement(".ytp-autonav-toggle-button", player, 15000);
	return toggle ? player : null;
}

// Read the live autoplay state, re-querying so we never read a detached node.
function readAutoPlayState(player: ParentNode): Nullable<boolean> {
	const toggle = player.querySelector(".ytp-autonav-toggle-button");
	return toggle ? toggle.getAttribute("aria-checked") === "true" : null;
}

export default createFeature({
	...metadata,
	onConfigChange: (config) => {
		// Switching the feature off should let it override again when re-enabled,
		// including when that happens off a watch page where onDisable never runs.
		if (!config.enabled) hasOverriddenDefault = false;
	},
	onDisable: async () => {
		// Restore only when the feature is switched off while on a watch page, not
		// when navigating away, which would otherwise wrongly re-enable autoplay.
		if (!isWatchPage() || previousAutoPlayState === null) return;
		const player = await getReadyPlayer();
		if (!player) return;
		await clickToggleUntil(player, previousAutoPlayState);
		previousAutoPlayState = null;
		hasOverriddenDefault = false;
	},
	onEnable: async () => {
		if (hasOverriddenDefault) return;
		const player = await getReadyPlayer();
		if (!player) return;
		// aria-checked can briefly read a premature "false" just after playback
		// starts; allow a short window for it to settle before trusting it.
		let current = readAutoPlayState(player);
		for (let attempt = 0; attempt < 10 && current === false; attempt++) {
			await delay(200);
			current = readAutoPlayState(player);
		}
		if (current === null) return;
		previousAutoPlayState ??= current;
		// If the click never lands (e.g. a YouTube re-render rebinds the control),
		// leave the session unmarked so the next video tries again instead of
		// silently giving up.
		if (current && !(await clickToggleUntil(player, false))) return;
		hasOverriddenDefault = true;
	}
});
