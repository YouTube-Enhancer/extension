import type { YouTubePlayer } from "youtube-player/dist/types";

import type { Nullable, Selector } from "@/src/types";

import { subscribe, type Unsubscribe } from "@/src/utils/dom/observers/domMutationBus";
import { browserColorLog } from "@/src/utils/logging";
type WaitMode = "optional" | "required";
/**
 * Wait for all elements to appear in the document.
 *
 * Resolves as soon as every selector matches, or after exhausting retries.
 * Uses the shared DOM Mutation Bus (no private MutationObserver); the retry
 * loop still catches elements that arrive without a body mutation.
 *
 * @param selectors - Array of CSS selectors for the elements to wait for.
 * @param timeout   - ms to wait between retries. Default: 5000.
 * @param retries   - How many additional attempts after the first check. Default: 5.
 *                    Total max wait = timeout × (retries + 1) = 30 s with defaults.
 * @returns Promise that resolves with a (possibly sparse) array of the matching elements.
 */
export async function waitForAllElements(
	selectors: Selector[],
	timeout = 5000,
	retries = 5
): Promise<Element[]> {
	browserColorLog(`Waiting for ${selectors.join(", ")}`, "FgMagenta");
	return new Promise((resolve) => {
		const foundElements: Element[] = [];
		const unsubscribes: Unsubscribe[] = [];
		const subscribed = selectors.map(() => false);
		let resolved = false;

		const finish = () => {
			if (resolved) return;
			resolved = true;
			for (const unsubscribe of unsubscribes) unsubscribe();
			if (retryTimer !== undefined) {
				clearTimeout(retryTimer);
				retryTimer = undefined;
			}
			const missing = selectors.filter((_, i) => !foundElements[i]);
			if (missing.length) {
				console.warn(
					`[waitForAllElements] Gave up after ${retries + 1} attempts — missing: ${missing.join(", ")}`
				);
			}
			resolve(foundElements);
		};

		const check = () => {
			for (let i = 0; i < selectors.length; i++) {
				if (!foundElements[i]) {
					const el = document.querySelector(selectors[i]);
					if (el) foundElements[i] = el;
				}
			}
			if (foundElements.length === selectors.length && foundElements.every(Boolean)) {
				finish();
			}
		};

		const armBusSubscriptions = () => {
			for (const [index, selector] of selectors.entries()) {
				if (foundElements[index] || subscribed[index]) continue;
				subscribed[index] = true;
				unsubscribes.push(
					subscribe(
						selector,
						(elements) => {
							if (foundElements[index]) return;
							const [firstMatch] = elements;
							if (firstMatch) foundElements[index] = firstMatch;
							check();
						},
						{ once: false }
					)
				);
			}
		};

		let retryTimer: ReturnType<typeof setTimeout> | undefined;
		let attempts = 0;

		const scheduleRetry = () => {
			if (attempts >= retries || resolved) {
				finish();
				return;
			}
			attempts++;
			retryTimer = setTimeout(() => {
				check();
				armBusSubscriptions();
				if (!resolved) scheduleRetry();
			}, timeout);
		};

		// Immediate check, then arm the shared bus for anything still missing
		check();
		if (!resolved) {
			armBusSubscriptions();
			scheduleRetry();
		}
	});
}
export function waitForElement<T extends Element>(
	selector: string,
	mode?: WaitMode
): Promise<Nullable<T>>;
export function waitForElement<T extends Element>(
	selector: string,
	timeout: number,
	mode?: WaitMode
): Promise<Nullable<T>>;
export function waitForElement<T extends Element>(
	selector: string,
	parent: ParentNode,
	mode?: WaitMode
): Promise<Nullable<T>>;
export function waitForElement<T extends Element>(
	selector: string,
	parent: ParentNode,
	timeout: number,
	mode?: WaitMode
): Promise<Nullable<T>>;
/**
 * Wait for an element to be present in the DOM.
 *
 * Uses the DOM Mutation Bus internally — a single shared MutationObserver on
 * document.body, deduplicated across all call sites. Observed node: always
 * document.body. Detached subtrees are not supported.
 *
 * @param {selector} string selector
 * @param {arg2} number | ParentNode | WaitMode = document
 * @param {arg3} number | WaitMode = 2500
 * @param {arg4} WaitMode = "required"
 * @returns {Promise<Nullable<T>>}
 */
export function waitForElement<T extends Element>(
	selector: string,
	arg2: number | ParentNode | WaitMode = document,
	arg3: number | WaitMode = 2500,
	arg4: WaitMode = "required"
): Promise<Nullable<T>> {
	let parent: ParentNode = document;
	let timeout = 2500;
	let mode: WaitMode = "required";
	if (typeof arg2 === "string") {
		// waitForElement(selector, "optional")
		mode = arg2;
		timeout = mode === "optional" ? 125 : 2500;
	} else if (typeof arg2 === "number") {
		// waitForElement(selector, 500, "optional")
		timeout = arg2;
		mode = typeof arg3 === "string" ? arg3 : "required";
	} else {
		// parent passed
		parent = arg2;
		if (typeof arg3 === "number") {
			timeout = arg3;
			mode = arg4;
		} else {
			mode = arg3;
			timeout = mode === "optional" ? 125 : 2500;
		}
	}

	return new Promise((resolve) => {
		const existing = parent.querySelector<T>(selector);
		if (existing) return resolve(existing);

		let resolved = false;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;
		const finish = (el: Nullable<T>) => {
			if (resolved) return;
			resolved = true;
			if (timeoutId !== undefined) {
				clearTimeout(timeoutId);
				timeoutId = undefined;
			}
			unsubscribe();
			resolve(el);
		};

		const unsubscribe = subscribe(
			selector,
			(elements) => {
				const match = elements.find((el) => parent.contains(el)) as T | undefined;
				if (match) finish(match);
			},
			{ parent }
		);

		timeoutId = setTimeout(() => {
			if (mode === "required") {
				console.warn(
					`[waitForElement] Timeout after ${timeout}ms — element not found: ${selector}`
				);
			}
			finish(null);
		}, timeout);
	});
}
/**
 * Waits until the YouTube player has fully initialized and is no longer in the "unstarted" state.
 *
 * This uses `getPlayerStateObject()` as the readiness signal, which becomes stable once the player
 * has loaded media state and is ready for interaction (e.g. audio tracks, playback state, etc.).
 *
 * @param player - The YouTube movie player element (`#movie_player`)
 * @param timeout - Maximum time to wait in milliseconds before rejecting (default: 10000ms)
 * @param options.isCancelled - Optional predicate; when it returns true the wait rejects and stops polling.
 *
 * @returns A promise that resolves with the initialized player element
 *
 * @throws If the player is null/undefined or fails to become ready within the timeout
 */
export async function waitForPlayerLoaded(
	player: Nullable<YouTubePlayer>,
	timeout = 10000,
	options?: { isCancelled?: () => boolean }
): Promise<YouTubePlayer> {
	if (!player) {
		throw new Error("Player does not exist");
	}
	const start = performance.now();
	return new Promise((resolve, reject) => {
		const check = (): void => {
			if (options?.isCancelled?.()) {
				reject(new Error("Cancelled waiting for player to load"));
				return;
			}
			let loaded = false;
			try {
				const state = player.getPlayerStateObject();
				if (!state.isUnstarted || (!state.isBuffering && state.isUnstarted)) {
					loaded = true;
				}
			} catch {}
			if (!loaded) {
				const video = (player as unknown as HTMLElement).querySelector("video");
				if (video && video.readyState >= 2) {
					loaded = true;
				}
			}
			if (loaded) {
				resolve(player);
				return;
			}
			if (performance.now() - start >= timeout) {
				reject(new Error("Timed out waiting for player to load"));
				return;
			}
			requestAnimationFrame(check);
		};
		check();
	});
}
