import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { YouTubePlayerDiv } from "@/src/types";

import {
	FeaturePlayerManager,
	type PlayerRetryConfig
} from "@/src/features/_registry/featurePlayerManager";

const mocks = vi.hoisted(() => ({
	getPagePlayerElement: vi.fn<() => unknown>(),
	invalidatePageReadiness: vi.fn(),
	subscribeToDomMutations: vi.fn<() => () => void>(),
	whenReady: vi.fn<() => Promise<unknown>>()
}));

vi.mock("@/src/utils/dom/readiness", () => ({
	// `@/src/utils/url` (an import of the module under test) pulls `refineLiveFlagFromPlayer`
	// from here, so the stub has to satisfy that specifier too.
	getPagePlayerElement: mocks.getPagePlayerElement,
	invalidatePageReadiness: mocks.invalidatePageReadiness,
	refineLiveFlagFromPlayer: vi.fn(),
	whenReady: mocks.whenReady
}));
vi.mock("@/src/utils/dom/observers/domMutationBus", () => ({
	subscribeToDomMutations: mocks.subscribeToDomMutations
}));

/** Lets the continuation's readiness await and the first retry tick settle. */
async function flush(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => setTimeout(resolve, 0));
}
function listenerCalls(player: YouTubePlayerDiv, event: string): unknown[] {
	return vi.mocked(player.addEventListener).mock.calls.filter(([name]) => name === event);
}
function makeFakePlayer(): YouTubePlayerDiv {
	return {
		addEventListener: vi.fn(),
		classList: { contains: vi.fn(() => false) },
		removeEventListener: vi.fn()
	} as unknown as YouTubePlayerDiv;
}
/** One attempt, no waiting: the run ends unsuccessful, which is the case the hook has to outlive. */
const RUN: PlayerRetryConfig = {
	interval: 1,
	maxAttempts: 1,
	onPlayerStateChange: true,
	overallTimeout: 50,
	skipPageGate: true,
	waitForLoaded: false
};

/**
 * The state hook is the only thing that re-runs a feature's player tasks after the loop has ended
 * unsuccessful, and on a fresh document the player is usually absent when the hook is set up (the
 * run's readiness wait is fail-open, so it can settle while `div#movie_player` is still missing).
 * These cover the two attach paths of `setupStateHook` plus the supersede guard the late attach runs
 * under — the path a cold-load enablement takes.
 */
describe("featurePlayerManager state hook attach", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getPagePlayerElement.mockReturnValue(null);
		mocks.subscribeToDomMutations.mockReturnValue(() => {});
		mocks.whenReady.mockResolvedValue(null);
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	test("attaches in place when the player already exists at setup", async () => {
		const manager = new FeaturePlayerManager();
		const player = makeFakePlayer();
		mocks.getPagePlayerElement.mockReturnValue(player);

		await manager.executeWithRetries("playerSpeed", [() => false], ["setSpeed"], RUN);
		await flush();

		expect(listenerCalls(player, "onStateChange")).toHaveLength(1);
		expect(mocks.subscribeToDomMutations).toHaveBeenCalledWith(
			"div#movie_player, div#shorts-player",
			expect.any(Function),
			{ attributeFilter: ["class"] }
		);
		// Present player: no readiness continuation is armed.
		expect(mocks.whenReady).toHaveBeenCalledTimes(1);
	});

	test("late attach: the one-shot continuation attaches once the player appears", async () => {
		const manager = new FeaturePlayerManager();
		const player = makeFakePlayer();
		// Fail-open pre-run wait settles with no player, then the continuation finds one.
		mocks.whenReady.mockResolvedValueOnce(null).mockResolvedValueOnce(player);

		const results = await manager.executeWithRetries(
			"playerSpeed",
			[() => false],
			["setSpeed"],
			RUN
		);
		await flush();

		expect(results).toEqual([false]);
		expect(listenerCalls(player, "onStateChange")).toHaveLength(1);
		expect(mocks.subscribeToDomMutations).toHaveBeenCalledWith(
			"div#movie_player, div#shorts-player",
			expect.any(Function),
			{ attributeFilter: ["class"] }
		);
		// Pre-run wait + the continuation's readiness wait.
		expect(mocks.whenReady).toHaveBeenCalledTimes(2);
	});

	test("late attach: cancel during the continuation keeps the listener off", async () => {
		const manager = new FeaturePlayerManager();
		const player = makeFakePlayer();
		mocks.whenReady.mockResolvedValueOnce(null).mockImplementationOnce(() => {
			// A cleanup (disable, navigation) lands while the continuation is still waiting.
			manager.cancelRetries("playerSpeed");
			return Promise.resolve(player);
		});

		await manager.executeWithRetries("playerSpeed", [() => false], ["setSpeed"], RUN);
		await flush();

		expect(listenerCalls(player, "onStateChange")).toHaveLength(0);
		expect(mocks.subscribeToDomMutations).not.toHaveBeenCalled();
	});
});
