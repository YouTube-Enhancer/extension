import type { YouTubePlayer } from "youtube-player/dist/types";

import type { Nullable, Selector } from "@/src/types";

import { browserColorLog } from "@/src/utils/logging";
type WaitMode = "optional" | "required";
/**
 * Wait for all elements to appear in the document.
 *
 * @param selectors - Array of CSS selectors for the elements to wait for.
 * @param timeout - Max time (ms) to wait before giving up. Default: 15s.
 * @returns Promise that resolves with an array of the matching elements.
 */
export async function waitForAllElements(selectors: Selector[], timeout = 15000): Promise<Element[]> {
	browserColorLog(`Waiting for ${selectors.join(", ")}`, "FgMagenta");
	return new Promise((resolve, reject) => {
		const foundElements: Element[] = [];
		const observer = new MutationObserver(() => {
			for (let i = 0; i < selectors.length; i++) {
				if (!foundElements[i]) {
					const el = document.querySelector(selectors[i]);
					if (el) foundElements[i] = el;
				}
			}
			if (foundElements.length === selectors.length && foundElements.every(Boolean)) {
				observer.disconnect();
				resolve(foundElements);
			}
		});

		observer.observe(document.body, { childList: true, subtree: true });

		// Check immediately in case elements are already present
		for (let i = 0; i < selectors.length; i++) {
			if (!foundElements[i]) {
				const el = document.querySelector(selectors[i]);
				if (el) foundElements[i] = el;
			}
		}
		if (foundElements.length === selectors.length && foundElements.every(Boolean)) {
			observer.disconnect();
			resolve(foundElements);
		}

		setTimeout(() => {
			observer.disconnect();
			const missing = selectors.filter((_, i) => !foundElements[i]);
			if (missing.length) reject(new Error(`Timeout: Missing selectors: ${missing.join(", ")}`));
			else resolve(foundElements);
		}, timeout);
	});
}
export function waitForElement<T extends Element>(selector: string, mode?: WaitMode): Promise<Nullable<T>>;
export function waitForElement<T extends Element>(selector: string, timeout: number, mode?: WaitMode): Promise<Nullable<T>>;
export function waitForElement<T extends Element>(selector: string, parent: ParentNode, mode?: WaitMode): Promise<Nullable<T>>;
export function waitForElement<T extends Element>(selector: string, parent: ParentNode, timeout: number, mode?: WaitMode): Promise<Nullable<T>>;
/**
 * Wait for an element to be present in the DOM.
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
		const finish = (el: Nullable<T>) => {
			if (resolved) return;
			resolved = true;
			observer.disconnect();
			resolve(el);
		};
		const observer = new MutationObserver(() => {
			const el = parent.querySelector<T>(selector);
			if (el) finish(el);
		});
		observer.observe(parent, { childList: true, subtree: true });
		setTimeout(() => {
			observer.disconnect();
			if (mode === "required") {
				console.warn(`[waitForElement] Timeout after ${timeout}ms — element not found: ${selector}`);
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
 *
 * @returns A promise that resolves with the initialized player element
 *
 * @throws If the player is null/undefined or fails to become ready within the timeout
 */
export async function waitForPlayerLoaded(player: Nullable<YouTubePlayer>, timeout = 10000): Promise<YouTubePlayer> {
	if (!player) {
		throw new Error("Player does not exist");
	}
	const start = performance.now();
	return new Promise((resolve, reject) => {
		const check = (): void => {
			try {
				const state = player.getPlayerStateObject();
				if (!state.isUnstarted || (!state.isBuffering && state.isUnstarted)) {
					resolve(player);
					return;
				}
			} catch {}
			if (performance.now() - start >= timeout) {
				reject(new Error("Timed out waiting for player to load"));
				return;
			}
			requestAnimationFrame(check);
		};
		check();
	});
}
