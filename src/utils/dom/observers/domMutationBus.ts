/**
 * DOM Mutation Bus
 *
 * A single {@link MutationObserver} on `document.body` that dispatches added-node
 * mutations to subscribers by CSS selector. Deduplicates identical selectors
 * and supports per-subscriber parent scoping.
 *
 * The bus is always-alive: created on module import, disconnected in the
 * embedded script's teardown. Features subscribe/unsubscribe as they enable/disable.
 *
 * **Detached subtrees are not supported.** The bus observes `document.body` — elements
 * added outside the body will not trigger subscriber callbacks.
 *
 * @example
 * ```ts
 * import { subscribe } from "@/src/utils/dom/observers/domMutationBus";
 *
 * // Wait for an element (transient — auto-unsubscribes after first match)
 * const unsubscribe = subscribe("#movie_player", ([el]) => {
 *   console.log("Player found:", el);
 * }, { once: true });
 *
 * // Persistent subscription (unsubscribe on feature disable)
 * const unsub = subscribe("[href]", (elements) => {
 *   for (const el of elements) processLink(el);
 * });
 * // later: unsub();
 * ```
 *
 * @module domMutationBus
 */

import type { Nullable } from "@/src/types";

// ─── Types ──────────────────────────────────────────────────────

/** Options for {@link subscribe}. */
type SubscribeOptions = {
	/** If true, automatically unsubscribe after the first delivery. */
	once?: boolean;
	/** If provided, only deliver matches that are descendants of this element. */
	parent?: ParentNode;
};

/** Internal subscriber record. */
type Subscriber = {
	callback: (elements: Element[]) => void;
	once?: boolean;
	parent?: ParentNode;
	selector: string;
};

/** Function that removes a subscription. */
type Unsubscribe = () => void;

// ─── State ──────────────────────────────────────────────────────

/** Map from CSS selector to the set of subscribers interested in that selector. */
const subscriberMap = new Map<string, Set<Subscriber>>();

/** The single shared observer, or null after {@link disconnect}. */
let observer: Nullable<MutationObserver> = null;

// ─── Core Logic ─────────────────────────────────────────────────

/**
 * Disconnect the observer and clear all subscriptions.
 * Called during embedded-script teardown.
 */
function disconnect(): void {
	if (observer) {
		observer.disconnect();
		observer = null;
	}
	subscriberMap.clear();
}

/**
 * MutationObserver callback. Collects added Element nodes, runs
 * `querySelectorAll` per unique selector per added node (per-addedNode
 * precision), then delivers matches to subscribers. Subscribers with a
 * `parent` option are filtered by `parent.contains(el)`. Subscribers
 * with `once: true` are removed after delivery.
 */
function onMutations(records: MutationRecord[]): void {
	if (subscriberMap.size === 0) return;

	// Collect all added Element nodes
	const addedNodes: Element[] = [];
	for (const record of records) {
		for (const node of record.addedNodes) {
			if (node instanceof Element) {
				addedNodes.push(node);
			}
		}
	}

	if (addedNodes.length === 0) return;

	// For each unique selector, find matches across all addedNodes
	const selectorResults = new Map<string, Element[]>();

	for (const selector of subscriberMap.keys()) {
		const matches = new Set<Element>();

		for (const node of addedNodes) {
			if (node.matches(selector)) {
				matches.add(node);
			}
			const descendants = node.querySelectorAll(selector);
			for (let i = 0; i < descendants.length; i++) {
				matches.add(descendants[i]);
			}
		}

		if (matches.size > 0) {
			selectorResults.set(selector, Array.from(matches));
		}
	}

	// Deliver to subscribers
	const toRemove: Subscriber[] = [];

	for (const [selector, subscribers] of subscriberMap) {
		const matches = selectorResults.get(selector);
		if (!matches || matches.length === 0) continue;

		for (const subscriber of subscribers) {
			const filteredMatches = subscriber.parent ? matches.filter((el) => subscriber.parent!.contains(el)) : matches;

			if (filteredMatches.length === 0) continue;

			try {
				subscriber.callback(filteredMatches);
			} catch (error) {
				console.error(`[domMutationBus] Subscriber callback error for selector "${selector}":`, error);
			}

			if (subscriber.once) {
				toRemove.push(subscriber);
			}
		}
	}

	for (const subscriber of toRemove) {
		unsubscribe(subscriber);
	}
}

/**
 * Subscribe to DOM mutations matching a CSS selector.
 *
 * The bus runs `addedNode.querySelectorAll(selector)` on every added Element
 * per mutation batch. If multiple subscribers register the same selector,
 * `querySelectorAll` runs once and results are shared (deduplication).
 *
 * @param selector - CSS selector to match against added nodes.
 * @param callback - Receives an array of matching elements from the mutation batch.
 * @param options  - `{ once: true }` to auto-unsubscribe after first delivery;
 *                   `{ parent: el }` to only deliver descendants of `el`.
 * @returns An {@link Unsubscribe} function. Call it to remove the subscription.
 */
function subscribe(selector: string, callback: (elements: Element[]) => void, options?: SubscribeOptions): Unsubscribe {
	const subscriber: Subscriber = {
		callback,
		once: options?.once,
		parent: options?.parent,
		selector
	};

	let subscribers = subscriberMap.get(selector);
	if (!subscribers) {
		subscribers = new Set();
		subscriberMap.set(selector, subscribers);
	}
	subscribers.add(subscriber);

	return () => unsubscribe(subscriber);
}

/** Remove a subscriber from the map. Cleans up the selector entry when empty. */
function unsubscribe(subscriber: Subscriber): void {
	const subscribers = subscriberMap.get(subscriber.selector);
	if (subscribers) {
		subscribers.delete(subscriber);
		if (subscribers.size === 0) {
			subscriberMap.delete(subscriber.selector);
		}
	}
}

// ─── Initialization ─────────────────────────────────────────────

if (typeof document !== "undefined" && document.body) {
	observer = new MutationObserver(onMutations);
	observer.observe(document.body, { childList: true, subtree: true });
}

// ─── Exports ────────────────────────────────────────────────────

export { disconnect, subscribe };
export type { SubscribeOptions, Unsubscribe };
