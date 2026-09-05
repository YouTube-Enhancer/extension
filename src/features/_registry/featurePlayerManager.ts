import type { FeatureKeys, FeatureKeysWithState, PageType } from "@/src/features/_registry/types";
import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { FeatureManagerBase } from "@/src/features/_registry/featureManagerBase";
import { waitForElement, waitForPlayerLoaded } from "@/src/utils/dom/wait";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

export type PlayerRetryConfig = {
	interval?: number;
	maxAttempts?: number;
	onPlayerStateChange?: boolean;
	overallTimeout?: number;
	pageTypes?: PageType[];
	waitForLoaded?: boolean;
};

export type PlayerTask = () => boolean | Promise<boolean>;

type ActiveRetryState = {
	aborted: boolean;
	attempts: number;
	intervalId: Nullable<ReturnType<typeof setInterval>>;
	observer: Nullable<MutationObserver>;
	startTime: number;
	taskResults: boolean[];
	tasks: { fn: PlayerTask; name: string }[];
};

type PlayerStateHookEntry = {
	adObserver: Nullable<MutationObserver>;
	cooldownId: Nullable<ReturnType<typeof setTimeout>>;
	featureId: FeatureKeys;
	handler: () => void;
	lastRun: number;
	trigger: () => void;
};

const DEFAULT_CONFIG: Required<PlayerRetryConfig> = {
	interval: 500,
	maxAttempts: 30,
	onPlayerStateChange: false,
	overallTimeout: 15000,
	pageTypes: ["watch", "live"],
	waitForLoaded: true
};

export class FeaturePlayerManager extends FeatureManagerBase {
	private activeRetries = new Map<FeatureKeys, ActiveRetryState>();
	// Bumped by every abort; a run still waiting for the player compares against it before it registers.
	private runGenerations = new Map<FeatureKeys, number>();
	private stateHooks = new Map<FeatureKeys, PlayerStateHookEntry>();

	cleanup(featureId?: FeatureKeys): void {
		if (featureId) {
			this.abortRetry(featureId);
			this.removeStateHook(featureId);
		} else {
			for (const id of new Set([...this.activeRetries.keys(), ...this.runGenerations.keys()])) {
				this.abortRetry(id);
			}
			for (const id of this.stateHooks.keys()) {
				this.removeStateHook(id);
			}
		}
	}

	async executeWithRetries(featureId: FeatureKeys, tasks: PlayerTask[], taskNames: string[], config?: PlayerRetryConfig): Promise<boolean[]> {
		const resolved: Required<PlayerRetryConfig> = { ...DEFAULT_CONFIG, ...config };

		this.abortRetry(featureId);
		const generation = this.runGenerations.get(featureId);

		if (!this.isOnAllowedPage(resolved.pageTypes)) {
			return tasks.map(() => false);
		}

		const playerSelector = isShortsPage() ? "div#shorts-player" : "div#movie_player";
		const player = await waitForElement<YouTubePlayerDiv>(playerSelector, resolved.overallTimeout);

		// A cleanup (navigation, disable) or a newer run for the feature superseded this one while it waited.
		if (!player || this.runGenerations.get(featureId) !== generation) {
			return tasks.map(() => false);
		}

		if (resolved.waitForLoaded) {
			try {
				await waitForPlayerLoaded(player, resolved.overallTimeout);
			} catch {
				return tasks.map(() => false);
			}
			if (this.runGenerations.get(featureId) !== generation) {
				return tasks.map(() => false);
			}
		}

		const state: ActiveRetryState = {
			aborted: false,
			attempts: 0,
			intervalId: null,
			observer: null,
			startTime: Date.now(),
			taskResults: tasks.map(() => false),
			tasks: tasks.map((fn, i) => ({ fn, name: taskNames[i] ?? `task_${i}` }))
		};

		this.activeRetries.set(featureId, state);

		return new Promise<boolean[]>((resolve) => {
			const tick = async (): Promise<void> => {
				if (state.aborted) {
					resolve(state.taskResults);
					return;
				}

				if (!this.isOnAllowedPage(resolved.pageTypes)) {
					this.abortRetry(featureId);
					resolve(state.taskResults);
					return;
				}

				state.attempts++;

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

				// A newer run or a cleanup may have aborted this one while its tasks ran. Ending the run here would bump
				// the generation a second time, and the newer run, still waiting for the player, would then drop its tasks.
				if (state.aborted) {
					resolve(state.taskResults);
					return;
				}

				const allDone = state.taskResults.every(Boolean);
				const timedOut = Date.now() - state.startTime >= resolved.overallTimeout;
				const tooManyAttempts = state.attempts >= resolved.maxAttempts;

				if (allDone || timedOut || tooManyAttempts) {
					this.abortRetry(featureId);
					resolve(state.taskResults);

					// Installed after a failed run as well: a player that is still showing an ad or has not started
					// gives the tasks nothing to act on, and the state change that ends that is the only signal
					// that another attempt is worth making.
					if (resolved.onPlayerStateChange) {
						this.setupStateHook(featureId, () => {
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

	protected getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "playerManager" as FeatureKeys;
	}

	private abortRetry(featureId: FeatureKeys): void {
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

	private removeStateHook(featureId: FeatureKeys): void {
		const entry = this.stateHooks.get(featureId);
		if (!entry) return;
		if (entry.cooldownId) clearTimeout(entry.cooldownId);
		entry.adObserver?.disconnect();
		const player = document.querySelector<YouTubePlayerDiv>(isShortsPage() ? "div#shorts-player" : "div#movie_player");
		if (player) {
			player.removeEventListener("onStateChange", entry.handler);
		}
		this.stateHooks.delete(featureId);
	}

	private setupStateHook(featureId: FeatureKeys, trigger: () => void): void {
		this.removeStateHook(featureId);

		const handler = (): void => {
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
			trigger
		};

		this.stateHooks.set(featureId, entry);

		const player = document.querySelector<YouTubePlayerDiv>(isShortsPage() ? "div#shorts-player" : "div#movie_player");
		if (!player) return;

		player.addEventListener("onStateChange", handler);
		// An ad ending is not always a state change (the ad and the content both report "playing"), so the class
		// YouTube keeps on the player while an ad shows is watched too; the tasks get their run once it clears.
		let adWasShowing = player.classList.contains("ad-showing");
		entry.adObserver = new MutationObserver(() => {
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
