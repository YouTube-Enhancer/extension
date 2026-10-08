import type {
	CoreFeatureKeys,
	FeatureKeys,
	FeatureKeysWithState,
	PageType
} from "@/src/features/_registry/types";
import type { Nullable } from "@/src/types";

import { FeatureManagerBase } from "@/src/features/_registry/featureManagerBase";
import {
	getPagePlayerElement,
	invalidatePageReadiness,
	whenReady
} from "@/src/utils/dom/readiness";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

export type PlayerRetryConfig = {
	interval?: number;
	maxAttempts?: number;
	/**
	 * Minimum ms between attempt starts. Use for click-spacing budgets (autoplay toggle)
	 * where firing faster than this drops clicks or double-toggles.
	 */
	minIntervalBetweenAttempts?: number;
	onPlayerStateChange?: boolean;
	overallTimeout?: number;
	pageTypes?: PageType[];
	/** Caller-owned cancellation (menu bind teardown, one-shot work). Linked to the run. */
	signal?: AbortSignal;
	/** Skip the page-type gate (navigation signature retries run on any page). */
	skipPageGate?: boolean;
	waitForLoaded?: boolean;
};

/**
 * Retry runs are keyed by feature id; core features (featureMenu) and the
 * navigation signature key share the same machinery.
 */
export type PlayerRetryKey = "navigation" | CoreFeatureKeys | FeatureKeys;

export type PlayerTask = () => boolean | Promise<boolean>;

type ActiveRetryState = {
	aborted: boolean;
	attempts: number;
	externalSignal: Nullable<AbortSignal>;
	intervalId: Nullable<ReturnType<typeof setInterval>>;
	lastAttemptAt: number;
	observer: Nullable<MutationObserver>;
	startTime: number;
	taskResults: boolean[];
	tasks: { fn: PlayerTask; name: string }[];
	token: AbortSignal;
};

type PlayerStateHookEntry = {
	adObserver: Nullable<MutationObserver>;
	cooldownId: Nullable<ReturnType<typeof setTimeout>>;
	featureId: PlayerRetryKey;
	handler: () => void;
	lastRun: number;
	token: AbortSignal;
	trigger: () => void;
};

const DEFAULT_CONFIG: Required<
	Omit<PlayerRetryConfig, "minIntervalBetweenAttempts" | "signal" | "skipPageGate">
> & {
	minIntervalBetweenAttempts: number;
	skipPageGate: boolean;
} = {
	interval: 500,
	maxAttempts: 30,
	minIntervalBetweenAttempts: 0,
	onPlayerStateChange: false,
	overallTimeout: 15000,
	pageTypes: ["watch", "live"],
	skipPageGate: false,
	waitForLoaded: true
};

export class FeaturePlayerManager extends FeatureManagerBase {
	private activeRetries = new Map<PlayerRetryKey, ActiveRetryState>();
	/** Lifecycle cancel tokens: aborted by cleanup/cancelRetries before onDisable. */
	private featureTokens = new Map<PlayerRetryKey, AbortController>();
	// Bumped by every abort; a run still waiting for the player compares against it before it registers.
	private runGenerations = new Map<PlayerRetryKey, number>();
	private stateHooks = new Map<PlayerRetryKey, PlayerStateHookEntry>();

	/**
	 * Abort every retry (and state hook) for a key, or for all keys. The lifecycle token is
	 * aborted here so tasks and onPlayerStateChange re-queues that check the token stop.
	 * Call before onDisable: a restore retry that onDisable itself queues is deliberate
	 * post-disable work and gets a fresh token.
	 */
	cancelRetries(key?: PlayerRetryKey): void {
		if (key) {
			this.featureTokens.get(key)?.abort();
			this.featureTokens.delete(key);
			this.abortRetry(key);
			this.removeStateHook(key);
			return;
		}
		invalidatePageReadiness();
		const keys = new Set<PlayerRetryKey>([
			...this.featureTokens.keys(),
			...this.activeRetries.keys(),
			...this.runGenerations.keys(),
			...this.stateHooks.keys()
		]);
		for (const id of keys) {
			this.cancelRetries(id);
		}
	}

	/** @deprecated Use cancelRetries. Kept as the registry/lifecycle call name. */
	cleanup(featureId?: PlayerRetryKey): void {
		this.cancelRetries(featureId);
	}

	async executeWithRetries(
		featureId: PlayerRetryKey,
		tasks: PlayerTask[],
		taskNames: string[],
		config?: PlayerRetryConfig
	): Promise<boolean[]> {
		const resolved = { ...DEFAULT_CONFIG, ...config };
		const externalSignal = config?.signal ?? null;

		// Supersede any prior run for this key; keep the lifecycle token (dispose aborts it).
		this.abortRetry(featureId);
		const generation = this.runGenerations.get(featureId);
		const token = this.getRetrySignal(featureId);

		const isCancelled = (): boolean =>
			this.runGenerations.get(featureId) !== generation ||
			token.aborted ||
			(externalSignal?.aborted ?? false);

		if (externalSignal?.aborted || token.aborted) {
			return tasks.map(() => false);
		}

		if (!resolved.skipPageGate && !this.isOnAllowedPage(resolved.pageTypes)) {
			return tasks.map(() => false);
		}

		/**
		 * Wait for the player before the first attempt, but do not require it. A failed wait still
		 * starts the retry loop: tasks that need the player return false and try again on the next
		 * tick. Returning here meant one early whenReady timeout left the feature dead for the rest
		 * of the page (no state hook, no further attempts).
		 */
		if (resolved.waitForLoaded) {
			await whenReady("pagePlayerReady", { isCancelled, timeout: resolved.overallTimeout });
		} else {
			await whenReady("pagePlayer", { isCancelled, timeout: resolved.overallTimeout });
		}

		// A cleanup (navigation, disable) or a newer run for the feature superseded this one while it waited.
		if (isCancelled()) {
			return tasks.map(() => false);
		}

		const state: ActiveRetryState = {
			aborted: false,
			attempts: 0,
			externalSignal,
			intervalId: null,
			lastAttemptAt: 0,
			observer: null,
			startTime: Date.now(),
			taskResults: tasks.map(() => false),
			tasks: tasks.map((fn, i) => ({ fn, name: taskNames[i] ?? `task_${i}` })),
			token
		};

		this.activeRetries.set(featureId, state);

		const onExternalAbort = (): void => {
			if (this.activeRetries.get(featureId) === state) {
				this.abortRetry(featureId);
			}
		};
		externalSignal?.addEventListener("abort", onExternalAbort, { once: true });

		return new Promise<boolean[]>((resolve) => {
			const settle = (): void => {
				externalSignal?.removeEventListener("abort", onExternalAbort);
				resolve(state.taskResults);
			};

			const tick = async (): Promise<void> => {
				if (state.aborted || isCancelled()) {
					settle();
					return;
				}

				if (!resolved.skipPageGate && !this.isOnAllowedPage(resolved.pageTypes)) {
					this.abortRetry(featureId);
					settle();
					return;
				}

				const { minIntervalBetweenAttempts: minGap } = resolved;
				if (minGap > 0 && state.lastAttemptAt > 0) {
					const elapsed = Date.now() - state.lastAttemptAt;
					if (elapsed < minGap) {
						state.intervalId = setTimeout(() => {
							void tick();
						}, minGap - elapsed);
						return;
					}
				}

				state.attempts++;
				state.lastAttemptAt = Date.now();

				const promises = state.tasks.map(async (task, i) => {
					if (state.taskResults[i]) return;
					try {
						const result = await task.fn();
						if (result) state.taskResults[i] = true;
					} catch {
						// task threw — will retry next tick
					}
				});

				await Promise.all(promises);

				/**
				 * A newer run, a cleanup, or an aborted token may have cancelled this run while its
				 * tasks were executing. Finishing here would bump the generation a second time, and
				 * the newer run, still waiting for the player, would then give up on its tasks.
				 */
				if (state.aborted || isCancelled()) {
					settle();
					return;
				}

				const allDone = state.taskResults.every(Boolean);
				const timedOut = Date.now() - state.startTime >= resolved.overallTimeout;
				const tooManyAttempts = state.attempts >= resolved.maxAttempts;

				if (allDone || timedOut || tooManyAttempts) {
					this.abortRetry(featureId);
					settle();

					/**
					 * The hook is installed after a failed run too. A player that is still showing an ad, or has not
					 * started, gives the tasks nothing to act on, and the state change that ends that is the only
					 * signal that another attempt is worthwhile.
					 */
					if (resolved.onPlayerStateChange) {
						this.setupStateHook(featureId, token, () => {
							if (token.aborted || (externalSignal?.aborted ?? false)) return;
							void this.executeWithRetries(featureId, tasks, taskNames, {
								...config,
								onPlayerStateChange: false
							});
						});
					}
					return;
				}

				state.intervalId = setTimeout(() => {
					void tick();
				}, resolved.interval);
			};

			void tick();
		});
	}

	/**
	 * Current lifecycle cancel token for a key. Aborted by {@link cancelRetries}; a new token
	 * is issued after abort so the next enable can run again.
	 */
	getRetrySignal(key: PlayerRetryKey): AbortSignal {
		let controller = this.featureTokens.get(key);
		if (!controller || controller.signal.aborted) {
			controller = new AbortController();
			this.featureTokens.set(key, controller);
		}
		return controller.signal;
	}

	protected getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "playerManager" as FeatureKeys;
	}

	private abortRetry(featureId: PlayerRetryKey): void {
		this.runGenerations.set(featureId, (this.runGenerations.get(featureId) ?? 0) + 1);
		const state = this.activeRetries.get(featureId);
		if (!state) return;
		state.aborted = true;
		if (state.intervalId) {
			clearTimeout(state.intervalId);
		}
		this.activeRetries.delete(featureId);
	}

	private isOnAllowedPage(pageTypes: PageType[]): boolean {
		return pageTypes.some((type) => {
			switch (type) {
				case "live":
					return isLivePage();
				case "shorts":
					return isShortsPage();
				case "watch":
					return isWatchPage();
				default:
					return false;
			}
		});
	}

	private removeStateHook(featureId: PlayerRetryKey): void {
		const entry = this.stateHooks.get(featureId);
		if (!entry) return;
		if (entry.cooldownId) clearTimeout(entry.cooldownId);
		entry.adObserver?.disconnect();
		const player = getPagePlayerElement();
		if (player) {
			player.removeEventListener("onStateChange", entry.handler);
		}
		this.stateHooks.delete(featureId);
	}

	private setupStateHook(featureId: PlayerRetryKey, token: AbortSignal, trigger: () => void): void {
		this.removeStateHook(featureId);

		const handler = (): void => {
			if (token.aborted) return;
			const now = Date.now();
			if (now - entry.lastRun < 5000) return;
			entry.lastRun = now;
			trigger();
		};

		const entry: PlayerStateHookEntry = {
			adObserver: null,
			cooldownId: null,
			featureId,
			handler,
			lastRun: 0,
			token,
			trigger
		};

		this.stateHooks.set(featureId, entry);

		const player = getPagePlayerElement();
		if (!player) return;

		player.addEventListener("onStateChange", handler);
		/**
		 * An ad ending is not always a state change, since the ad and the content both report "playing". The class
		 * YouTube keeps on the player while an ad shows is watched as well, and the tasks run once it clears.
		 */
		let adWasShowing = player.classList.contains("ad-showing");
		entry.adObserver = new MutationObserver(() => {
			if (token.aborted) {
				entry.adObserver?.disconnect();
				return;
			}
			const adShowing = player.classList.contains("ad-showing");
			if (adWasShowing && !adShowing) {
				entry.lastRun = Date.now();
				trigger();
			}
			adWasShowing = adShowing;
		});
		entry.adObserver.observe(player, { attributeFilter: ["class"], attributes: true });
	}
}

export const featurePlayerManager = new FeaturePlayerManager();
