import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { type ElementClassPair, modifyElementsClassList } from "@/src/utils/dom/classList";
import {
	subscribeToDomMutations,
	type UnsubscribeFromDomMutations
} from "@/src/utils/dom/observers/domMutationBus";
import { waitForAllElements } from "@/src/utils/dom/wait";

import "./index.css";
import { metadata } from "./index.metadata";

const DISPOSER_NAME = "restoreFullscreenScrolling-watchRootReapply";
/**
 * One re-apply flight at a time; concurrent deliveries (nav + bus) collapse into it.
 * Released after the element wait has had a chance to settle, so a burst of replacements
 * does not queue an unbounded number of concurrent passes.
 */
let reapplyInFlight = false;
/**
 * How long to wait for the watch root before giving up on a single pass. Under full-suite
 * load the live watch page can take well over 30 s to attach `ytd-watch-flexy`; the old
 * 10 s x 3 budget gave up before the element existed, so the class was never applied and
 * the tests that poll for it (45 s) failed. 40 s x 3 = 120 s matches the hideLiveStreamChat
 * budget and clears the slowest load.
 */
const ELEMENT_WAIT_TIMEOUT_MS = 40_000;
const ELEMENT_WAIT_RETRIES = 3;

function addFullscreenScrollClasses() {
	void waitForAllElements(
		["ytd-watch-flexy", "ytd-app"],
		ELEMENT_WAIT_TIMEOUT_MS,
		ELEMENT_WAIT_RETRIES
	).then(() => {
		modifyElementsClassList("add", getFullscreenScrollPairs());
		return undefined;
	});
}

/**
 * Re-apply the classes whenever the watch root attaches or re-attaches. YouTube replaces
 * `ytd-watch-flexy` during skeleton / metadata re-renders (recurring on live and on a
 * watch->home->watch round trip under load), and a class applied to the replaced node is
 * lost. onNavigate's one-shot waitForAllElements resolves against whichever nodes exist at
 * that instant, so it cannot recover once the node swaps afterwards; this bus subscription
 * keeps the mark tied to the live node for as long as the feature stays enabled.
 */
function ensureWatchRootReapply(): void {
	reapplyInFlight = false;
	const reapply = () => {
		if (reapplyInFlight) return;
		reapplyInFlight = true;
		addFullscreenScrollClasses();
		// Release once the element wait has had a chance to settle, so a burst of
		// replacements does not queue an unbounded number of concurrent passes.
		setTimeout(() => {
			reapplyInFlight = false;
		}, 250);
	};
	const unsubscribers: UnsubscribeFromDomMutations[] = [
		subscribeToDomMutations("ytd-watch-flexy", reapply),
		subscribeToDomMutations("ytd-app", reapply)
	];
	registry.on(metadata.id, DISPOSER_NAME, () => {
		for (const unsubscribe of unsubscribers) unsubscribe();
	});
}

function getFullscreenScrollPairs(): ElementClassPair[] {
	return [
		{
			className: "yte-ytd-watch-flexy-restore-fullscreen-scrolling",
			element: document.querySelector("ytd-watch-flexy")
		},
		{
			className: "yte-ytd-app-restore-fullscreen-scrolling",
			element: document.querySelector("ytd-app")
		}
	];
}

export default createFeature({
	...metadata,
	onDisable: () => {
		// Removal does not need to wait: if the watch root is not attached yet there is no
		// class to remove, and if it is, clear it immediately. Waiting here would leave the
		// class on screen for up to the full retry budget after the feature is turned off.
		modifyElementsClassList("remove", getFullscreenScrollPairs());
	},
	onEnable: () => {
		addFullscreenScrollClasses();
		ensureWatchRootReapply();
		// A re-enable can land while YouTube is mid-skeleton-replace, so the one-shot add
		// above can hit a node that is about to be swapped. The bus subscription only fires
		// on the *next* attach; this immediate re-apply catches a node that was replaced in
		// the instant between the two.
		setTimeout(addFullscreenScrollClasses, 100);
	},
	onNavigate: () => {
		addFullscreenScrollClasses();
	}
});
