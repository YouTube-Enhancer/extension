import { afterEach, beforeAll, describe, expect, test } from "vitest";

/** The subset of a MutationRecord the bus reads off a child-list mutation. */
type TestMutationRecord = {
	addedNodes?: unknown[];
	removedNodes?: unknown[];
	type: string;
};

/**
 * The bus needs two platform globals Node does not have: a MutationObserver it constructs when the
 * module loads, and a document.body for that observer to watch. The class below stands in for the
 * first and keeps the callback it was constructed with, so a test can hand the bus a mutation record
 * directly instead of waiting on a real DOM to produce one - the same `Object.defineProperty` global
 * shim the content-script unit tests use for `document`.
 */
class TestMutationObserver {
	public static readonly instances: TestMutationObserver[] = [];
	public readonly callback: (records: TestMutationRecord[]) => void;
	constructor(callback: (records: TestMutationRecord[]) => void) {
		this.callback = callback;
		TestMutationObserver.instances.push(this);
	}
	public disconnect(): void {}
	public observe(_root: unknown, _options?: unknown): void {}
}

Object.defineProperty(globalThis, "MutationObserver", {
	configurable: true,
	value: TestMutationObserver
});
Object.defineProperty(globalThis, "document", {
	configurable: true,
	value: { body: {} }
});

describe("domMutationBus", () => {
	let subscribe: typeof import("./domMutationBus").subscribeToDomMutations;
	const unsubscribes: Array<() => void> = [];

	/** Feeds one child-list mutation through the observer the shared bus was built with. */
	const dispatch = (records: TestMutationRecord[]): void => {
		const { instances } = TestMutationObserver;
		const [sharedObserver] = instances;
		sharedObserver.callback(records);
	};
	const childList = (removed: Element[], added: Element[]): TestMutationRecord => ({
		addedNodes: added,
		removedNodes: removed,
		type: "childList"
	});
	const node = (matches: boolean): Element =>
		({ matches: () => matches, nodeType: 1 }) as unknown as Element;

	beforeAll(async () => {
		// Imported after the globals above are in place: the module builds its observer on load.
		subscribe = (await import("./domMutationBus")).subscribeToDomMutations;
	});

	afterEach(() => {
		for (const unsubscribe of unsubscribes.splice(0)) unsubscribe();
	});

	/** Without this the removed-only assertions below would also pass on a dead dispatcher. */
	test("delivers an added node to a default subscriber", () => {
		const deliveries: Element[][] = [];
		unsubscribes.push(subscribe(".yte-overlay", (elements) => deliveries.push(elements)));
		const row = node(true);
		dispatch([childList([], [row])]);
		expect(deliveries).toEqual([[row]]);
	});

	test("delivers a removed node to a subscriber that opted into removed", () => {
		const deliveries: Element[][] = [];
		unsubscribes.push(
			subscribe(".yte-overlay", (elements) => deliveries.push(elements), { removed: true })
		);
		const overlay = node(true);
		dispatch([childList([overlay], [])]);
		expect(deliveries).toEqual([[overlay]]);
	});

	test("does not deliver an added node to a subscriber that opted into removed", () => {
		const deliveries: Element[][] = [];
		unsubscribes.push(
			subscribe(".yte-overlay", (elements) => deliveries.push(elements), { removed: true })
		);
		dispatch([childList([], [node(true)])]);
		expect(deliveries).toEqual([]);
	});

	test("does not deliver a removed node to a default subscriber", () => {
		const deliveries: Element[][] = [];
		unsubscribes.push(subscribe(".yte-overlay", (elements) => deliveries.push(elements)));
		dispatch([childList([node(true)], [])]);
		expect(deliveries).toEqual([]);
	});

	test("skips a removed node that does not match the subscriber's selector", () => {
		const deliveries: Element[][] = [];
		unsubscribes.push(
			subscribe(".yte-overlay", (elements) => deliveries.push(elements), { removed: true })
		);
		dispatch([childList([node(false)], [])]);
		expect(deliveries).toEqual([]);
	});
});
