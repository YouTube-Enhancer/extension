import type { FeatureKeys, FeatureKeysWithState } from "@/src/features/_registry/types";
import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { FeatureManagerBase } from "@/src/features/_registry/featureManagerBase";
import { waitForElement, waitForPlayerLoaded } from "@/src/utils/dom/wait";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

export type PlayerRetryConfig = {
	interval?: number;
	maxAttempts?: number;
	onPlayerStateChange?: boolean;
	overallTimeout?: number;
	pageTypes?: string[];
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
	cooldownId: Nullable<ReturnType<typeof setTimeout>>;
	featureId: string;
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
	private activeRetries = new Map<string, ActiveRetryState>();
	private stateHooks = new Map<string, PlayerStateHookEntry>();

	cleanup(featureId?: string): void {
		if (featureId) {
			this.abortRetry(featureId);
			this.removeStateHook(featureId);
		} else {
			for (const id of this.activeRetries.keys()) {
				this.abortRetry(id);
			}
			for (const id of this.stateHooks.keys()) {
				this.removeStateHook(id);
			}
		}
	}

	async executeWithRetries(featureId: string, tasks: PlayerTask[], taskNames: string[], config?: PlayerRetryConfig): Promise<boolean[]> {
		const resolved: Required<PlayerRetryConfig> = { ...DEFAULT_CONFIG, ...config };

		this.abortRetry(featureId);

		if (!this.isOnAllowedPage(resolved.pageTypes)) {
			return tasks.map(() => false);
		}

		const playerSelector = isShortsPage() ? "div#shorts-player" : "div#movie_player";
		const player = await waitForElement<YouTubePlayerDiv>(playerSelector, resolved.overallTimeout);

		if (!player) {
			return tasks.map(() => false);
		}

		if (resolved.waitForLoaded) {
			try {
				await waitForPlayerLoaded(player, resolved.overallTimeout);
			} catch {
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

				const allDone = state.taskResults.every(Boolean);
				const timedOut = Date.now() - state.startTime >= resolved.overallTimeout;
				const tooManyAttempts = state.attempts >= resolved.maxAttempts;

				if (allDone || timedOut || tooManyAttempts) {
					this.abortRetry(featureId);
					resolve(state.taskResults);

					if (resolved.onPlayerStateChange && allDone) {
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

	private abortRetry(featureId: string): void {
		const state = this.activeRetries.get(featureId);
		if (!state) return;
		state.aborted = true;
		if (state.intervalId) {
			clearTimeout(state.intervalId);
		}
		this.activeRetries.delete(featureId);
	}

	private isOnAllowedPage(pageTypes: string[]): boolean {
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

	private removeStateHook(featureId: string): void {
		const entry = this.stateHooks.get(featureId);
		if (!entry) return;
		if (entry.cooldownId) clearTimeout(entry.cooldownId);
		this.stateHooks.delete(featureId);
	}

	private setupStateHook(featureId: string, trigger: () => void): void {
		this.removeStateHook(featureId);

		const entry: PlayerStateHookEntry = {
			cooldownId: null,
			featureId,
			lastRun: 0,
			trigger
		};

		this.stateHooks.set(featureId, entry);

		const player = document.querySelector<YouTubePlayerDiv>(isShortsPage() ? "div#shorts-player" : "div#movie_player");
		if (!player) return;

		const handler = (): void => {
			const now = Date.now();
			if (now - entry.lastRun < 5000) return;
			entry.lastRun = now;
			trigger();
		};

		player.addEventListener("onStateChange", handler);
	}
}

export const featurePlayerManager = new FeaturePlayerManager();
