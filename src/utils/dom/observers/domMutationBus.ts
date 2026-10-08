/**
 * DOM Mutation Bus
 *
 * A single {@link MutationObserver} on `document.body` that dispatches added-node
 * mutations to subscribers by CSS selector, and attribute mutations to subscribers
 * that opt in via `attributeFilter`. Deduplicates identical selectors and supports
 * per-subscriber parent scoping.
 *
 * The bus is always-alive: created on module import, disconnected in the
 * embedded script's teardown. Features subscribe/unsubscribe as they enable/disable.
 *
 * **Detached parents are supported.** When a subscriber passes `parent` that is not
 * connected to the document, the bus also observes that root so mutations inside a
 * detached subtree still deliver. Roots are refcounted and disconnected with the
 * last subscriber.
 *
 * @example
 * ```ts
 * import {
 *   disconnectFromDomMutations,
 *   subscribeToDomMutations,
 *   type UnsubscribeFromDomMutations
 * } from "@/src/utils/dom/observers/domMutationBus";
 *
 * // Wait for an element (transient — auto-unsubscribes after first match)
 * const off = subscribeToDomMutations("#movie_player", ([el]) => {
 *   console.log("Player found:", el);
 * }, { once: true });
 *
 * // Persistent subscription (unsubscribe on feature disable)
 * const unsub: UnsubscribeFromDomMutations = subscribeToDomMutations("[href]", (elements) => {
 *   for (const el of elements) processLink(el);
 * });
 * // later: unsub();
 *
 * // Attribute mutations on player chrome (fullscreen / theater / layout)
 * const offFs = subscribeToDomMutations("ytd-app", () => onFullscreenChange(), {
 *   attributeFilter: ["fullscreen"]
 * });
 * ```
 *
 * Exports are named for the bus so call sites stay clear and never collide with
 * local helpers or DOM API methods (`subscribe`, `disconnect`, `Unsubscribe`).
 *
 * @module domMutationBus
 */

import type { Nullable } from "@/src/types";

// ─── Types ──────────────────────────────────────────────────────

type DetachedRootState = {
	observer: MutationObserver;
	refCount: number;
};

/** Internal subscriber record. */
type Subscriber = {
	attributeFilter?: readonly string[];
	callback: (elements: Element[]) => void;
	/** Set when the subscriber's parent is detached; released on unsubscribe. */
	detachedParent?: Element;
	once?: boolean;
	parent?: ParentNode;
	selector: string;
};

/** Options for {@link subscribeToDomMutations}. */
type SubscribeToDomMutationsOptions = {
	/**
	 * When set, the subscriber receives attribute mutations on matching elements
	 * instead of added-node deliveries. The shared observer re-observes `document.body`
	 * with a union of every live attributeFilter.
	 */
	attributeFilter?: readonly string[];
	/** If true, automatically unsubscribe after the first delivery. */
	once?: boolean;
	/** If provided, only deliver matches that are descendants of this element. */
	parent?: ParentNode;
};

/** Function that removes a subscription. */
type UnsubscribeFromDomMutations = () => void;

// ─── State ──────────────────────────────────────────────────────

/** Map from CSS selector to the set of subscribers interested in that selector. */
const subscriberMap = new Map<string, Set<Subscriber>>();

/** Extra observers for subscriber parents that are not connected to the document. */
const detachedRoots = new Map<Element, DetachedRootState>();

/** The single shared observer, or null after {@link disconnectFromDomMutations}. */
let observer: Nullable<MutationObserver> = null;

/** Last attributeFilter the observer was configured with; avoids needless re-observes. */
let observedAttributeFilter: readonly string[] = [];

// ─── Core Logic ─────────────────────────────────────────────────

function collectAttributeFilters(): string[] {
	const filters = new Set<string>();
	for (const subscribers of subscriberMap.values()) {
		for (const subscriber of subscribers) {
			if (!subscriber.attributeFilter) continue;
			for (const name of subscriber.attributeFilter) filters.add(name);
		}
	}
	return [...filters].sort();
}

function deliverToSubscriber(subscriber: Subscriber, matches: Element[], selector: string): void {
	const filteredMatches = subscriber.parent
		? matches.filter((el) => subscriber.parent!.contains(el))
		: matches;
	if (filteredMatches.length === 0) return;
	try {
		subscriber.callback(filteredMatches);
	} catch (error) {
		console.error(`[domMutationBus] Subscriber callback error for selector "${selector}":`, error);
	}
}

/**
 * Disconnect the observer and clear all subscriptions.
 * Called during embedded-script teardown.
 */
function disconnectFromDomMutations(): void {
	if (observer) {
		observer.disconnect();
		observer = null;
	}
	for (const { observer: rootObserver } of detachedRoots.values()) {
		rootObserver.disconnect();
	}
	detachedRoots.clear();
	subscriberMap.clear();
	observedAttributeFilter = [];
}

/**
 * Re-observe `document.body` when the live attributeFilter set changes.
 * MutationObserver cannot add or remove attributeFilter without re-observing.
 * Detached roots are re-observed with the same filter union.
 */
function ensureObserverOptions(): void {
	if (typeof document === "undefined" || !document.body) return;
	const attributeFilter = collectAttributeFilters();
	const filterChanged =
		attributeFilter.length !== observedAttributeFilter.length ||
		attributeFilter.some((name, i) => name !== observedAttributeFilter[i]);
	if (observer && !filterChanged) return;
	observer?.disconnect();
	observer = new MutationObserver(onMutations);
	observeRoot(observer, document.body);
	for (const root of detachedRoots.keys()) {
		const state = detachedRoots.get(root);
		if (!state) continue;
		state.observer.disconnect();
		observeRoot(state.observer, root);
	}
	observedAttributeFilter = attributeFilter;
}

function isAttached(node: Node): boolean {
	return node.isConnected || document.contains(node);
}

function observeRoot(observerInstance: MutationObserver, root: Element): void {
	const attributeFilter = collectAttributeFilters();
	observerInstance.observe(root, {
		attributes: attributeFilter.length > 0,
		...(attributeFilter.length > 0 ? { attributeFilter: [...attributeFilter] } : {}),
		childList: true,
		subtree: true
	});
}

/**
 * MutationObserver callback. Attribute records deliver to attributeFilter subscribers
 * whose selector matches the mutation target. Child-list records collect added Element
 * nodes, run `querySelectorAll` per unique selector per added node, then deliver to
 * child-list subscribers. Subscribers with `once: true` are removed after delivery.
 */
function onMutations(records: MutationRecord[]): void {
	if (subscriberMap.size === 0) return;

	const toRemove: Subscriber[] = [];

	for (const record of records) {
		if (record.type === "attributes" && record.target instanceof Element) {
			const { target } = record;
			const { attributeName } = record;
			if (!attributeName) continue;
			for (const [selector, subscribers] of subscriberMap) {
				for (const subscriber of subscribers) {
					if (!subscriber.attributeFilter?.includes(attributeName)) continue;
					if (!target.matches(selector)) continue;
					deliverToSubscriber(subscriber, [target], selector);
					if (subscriber.once) toRemove.push(subscriber);
				}
			}
			continue;
		}

		if (record.type !== "childList") continue;

		const addedNodes: Element[] = [];
		for (const node of record.addedNodes) {
			if (node instanceof Element) addedNodes.push(node);
		}
		if (addedNodes.length === 0) continue;

		for (const [selector, subscribers] of subscriberMap) {
			const hasChildListSubscribers = [...subscribers].some((s) => !s.attributeFilter);
			if (!hasChildListSubscribers) continue;

			const matches = new Set<Element>();
			for (const node of addedNodes) {
				if (node.matches(selector)) matches.add(node);
				const descendants = node.querySelectorAll(selector);
				for (let i = 0; i < descendants.length; i++) matches.add(descendants[i]);
			}
			if (matches.size === 0) continue;
			const matchList = Array.from(matches);

			for (const subscriber of subscribers) {
				// Attribute subscribers are driven by attribute records, not added nodes.
				if (subscriber.attributeFilter) continue;
				deliverToSubscriber(subscriber, matchList, selector);
				if (subscriber.once) toRemove.push(subscriber);
			}
		}
	}

	for (const subscriber of toRemove) {
		removeSubscriber(subscriber);
	}
}

function releaseDetachedRoot(root: Element): void {
	const existing = detachedRoots.get(root);
	if (!existing) return;
	existing.refCount -= 1;
	if (existing.refCount > 0) return;
	existing.observer.disconnect();
	detachedRoots.delete(root);
}

/** Remove a subscriber from the map. Cleans up the selector entry when empty. */
function removeSubscriber(subscriber: Subscriber): void {
	const subscribers = subscriberMap.get(subscriber.selector);
	if (subscribers) {
		subscribers.delete(subscriber);
		if (subscribers.size === 0) {
			subscriberMap.delete(subscriber.selector);
		}
	}
	if (subscriber.detachedParent) {
		releaseDetachedRoot(subscriber.detachedParent);
		subscriber.detachedParent = undefined;
	}
	if (subscriber.attributeFilter) ensureObserverOptions();
}

function retainDetachedRoot(root: Element): void {
	const existing = detachedRoots.get(root);
	if (existing) {
		existing.refCount += 1;
		return;
	}
	const rootObserver = new MutationObserver(onMutations);
	observeRoot(rootObserver, root);
	detachedRoots.set(root, { observer: rootObserver, refCount: 1 });
}

/**
 * Subscribe to DOM mutations matching a CSS selector.
 *
 * By default this receives added Element nodes under `document.body`. When
 * `attributeFilter` is provided the subscriber receives attribute mutations on
 * elements that match the selector instead (shared observer re-observes with the
 * union of live filters).
 *
 * When `parent` is detached from the document, the bus also observes that root so
 * the subscription still fires inside the detached subtree.
 *
 * @param selector - CSS selector to match against added nodes or attribute targets.
 * @param callback - Receives an array of matching elements from the mutation batch.
 * @param options  - `{ once: true }` to auto-unsubscribe after first delivery;
 *                   `{ parent: el }` to only deliver descendants of `el`;
 *                   `{ attributeFilter: ["theater"] }` for attribute mutations.
 * @returns An {@link UnsubscribeFromDomMutations} function. Call it to remove the subscription.
 */
function subscribeToDomMutations(
	selector: string,
	callback: (elements: Element[]) => void,
	options?: SubscribeToDomMutationsOptions
): UnsubscribeFromDomMutations {
	const parent = options?.parent;
	const detachedParent = parent instanceof Element && !isAttached(parent) ? parent : undefined;

	const subscriber: Subscriber = {
		attributeFilter: options?.attributeFilter,
		callback,
		detachedParent,
		once: options?.once,
		parent,
		selector
	};

	let subscribers = subscriberMap.get(selector);
	if (!subscribers) {
		subscribers = new Set();
		subscriberMap.set(selector, subscribers);
	}
	subscribers.add(subscriber);

	if (detachedParent) retainDetachedRoot(detachedParent);
	if (options?.attributeFilter) ensureObserverOptions();

	return () => removeSubscriber(subscriber);
}

// ─── Initialization ─────────────────────────────────────────────

ensureObserverOptions();

// ─── Exports ────────────────────────────────────────────────────

/** Capability of the bus: detached subscriber parents are observed. */
export const domMutationBusCapabilities = {
	supportsDetachedSubtrees: true
} as const;

export { disconnectFromDomMutations, subscribeToDomMutations };
export type { SubscribeToDomMutationsOptions, UnsubscribeFromDomMutations };
