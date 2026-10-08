import type {
	AnyFeatureBase,
	FeatureKeys,
	FeatureKeysWithState
} from "@/src/features/_registry/types";
import type { Nullable } from "@/src/types";

import { invalidatePageTypeCache, refinePageTypeFromPlayer } from "@/src/utils/url";
import { getNavigationSignature, type NavigationSignature } from "@/src/utils/url/signature";

import { FeatureManagerBase } from "./featureManagerBase";
import { featurePlayerManager } from "./featurePlayerManager";

export type NavigationEventType = "finish" | "popstate" | "start" | "updated";

const NAVIGATION_DEBOUNCE_MS = 100;
const NAVIGATION_SIGNATURE_RETRIES = 5;

export class FeatureNavigationManager extends FeatureManagerBase {
	private _initialized = false;
	private currentNavigationSignature: Nullable<string> = null;
	private currentPage: Nullable<string> = null;
	private debounceTimer: Nullable<ReturnType<typeof setTimeout>> = null;
	private liveRefinePromise: Nullable<Promise<void>> = null;
	private navigating = false;
	private navigationCallback?: (signature: string, eventType: NavigationEventType) => Promise<void>;
	private navigationListeners: Record<string, () => void> = {};
	private navigationPatched = false;
	/** Last event that arrived mid-pipeline; drained in processNavigation finally. */
	private pendingNavigationEvent: Nullable<NavigationEventType> = null;
	private previousNavigationSignature: Nullable<string> = null;
	// Store original history methods and their wrappers for proper cleanup
	private pushStateWrapper?: { original: typeof history.pushState; wrapper: () => void };
	private replaceStateWrapper?: { original: typeof history.replaceState; wrapper: () => void };

	constructor() {
		super();
	}

	areDependenciesMet(feature: AnyFeatureBase): boolean {
		const { dependencies: deps } = feature;
		if (!deps) return true;
		const { currentPage } = this;
		if (!currentPage) return false;
		if (deps.includePages && !deps.includePages.includes(currentPage)) return false;
		if (deps.excludePages && deps.excludePages.includes(currentPage)) return false;
		return true;
	}

	destroyListener() {
		const { navigationListeners, pushStateWrapper, replaceStateWrapper } = this;
		if (this.debounceTimer !== null) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
		if (navigationListeners.popstate) {
			window.removeEventListener("popstate", navigationListeners.popstate);
		}
		if (navigationListeners.start) {
			window.removeEventListener("yt-navigate-start", navigationListeners.start);
		}
		if (navigationListeners.finish) {
			window.removeEventListener("yt-navigate-finish", navigationListeners.finish);
		}
		if (navigationListeners.updated) {
			window.removeEventListener("yt-page-data-updated", navigationListeners.updated);
		}
		/**
		 * Restore history only when our wrapper is still the installed method. If a newer
		 * instance wrapped on top, leave theirs alone; they restore on their own teardown.
		 */
		if (pushStateWrapper && history.pushState === pushStateWrapper.wrapper) {
			history.pushState = pushStateWrapper.original;
		}
		if (replaceStateWrapper && history.replaceState === replaceStateWrapper.wrapper) {
			history.replaceState = replaceStateWrapper.original;
		}
		this.navigationListeners = {};
		this.navigationPatched = false;
		this.currentNavigationSignature = null;
		this.previousNavigationSignature = null;
		this.pushStateWrapper = undefined;
		this.replaceStateWrapper = undefined;
		this.navigationCallback = undefined;
		this.navigating = false;
		this.pendingNavigationEvent = null;
		// Allow initialize() after teardown (bfcache restore, hot reload re-init).
		this._initialized = false;
	}

	getCurrentPage(): Nullable<string> {
		return this.currentPage;
	}

	getCurrentSignature(): Nullable<string> {
		return this.currentNavigationSignature;
	}

	getPreviousSignature(): Nullable<string> {
		return this.previousNavigationSignature;
	}

	handleNavigation(eventType: NavigationEventType) {
		if (this.navigating) {
			// Queue the newest event; drain after the in-flight pipeline settles.
			this.pendingNavigationEvent = eventType;
			return;
		}
		if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
		this.debounceTimer = setTimeout(() => {
			this.debounceTimer = null;
			void this.processNavigation(eventType);
		}, NAVIGATION_DEBOUNCE_MS);
	}

	initialize(callback: (signature: string, eventType: NavigationEventType) => Promise<void>) {
		if (this._initialized) return;
		// Sync URL classification: do not wait on the player for live-vs-VOD.
		const signature = getNavigationSignature();
		this.navigationCallback = callback;
		/**
		 * Attach the listeners even when the current URL classifies to nothing (legacy
		 * /channel/<id> URLs, for one). Bailing here left the manager deaf for the whole
		 * document lifetime: the first in-page navigation never reached processNavigation,
		 * currentPage stayed null, and every page-gated feature stayed disabled.
		 * processNavigation classifies from the URL at event time, so the first navigation
		 * off an unclassifiable page recovers everything.
		 */
		this.currentNavigationSignature = signature;
		this.currentPage = signature ? getPageFromSignature(signature) : null;
		this.setupNavigationListener();
		this._initialized = true;
		if (signature) void this.refineLivePageType();
	}

	isInitialized(): boolean {
		return this._initialized;
	}

	/** Player refine after init/navigation: update page type when a watch URL is actually live. */
	refineLivePageType(): Promise<void> {
		if (this.liveRefinePromise) return this.liveRefinePromise;
		this.liveRefinePromise = this.runLiveRefine().finally(() => {
			this.liveRefinePromise = null;
		});
		return this.liveRefinePromise;
	}

	protected getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "navigationManager" as FeatureKeys;
	}

	private async processNavigation(eventType: NavigationEventType) {
		if (this.navigating) {
			this.pendingNavigationEvent = eventType;
			return;
		}
		this.navigating = true;
		try {
			invalidatePageTypeCache();
			const signature = getNavigationSignature();
			if (!signature) {
				/**
				 * Page-type detection can miss its window on a heavily loaded page; a silently dropped
				 * navigation leaves every feature's onNavigate never running. Retry through the shared seam;
				 * on success re-enter via handleNavigation (navigating is already false in finally).
				 */
				void featurePlayerManager
					.executeWithRetries(
						"navigation",
						[() => getNavigationSignature() !== null],
						["navigation-signature"],
						{
							interval: NAVIGATION_DEBOUNCE_MS,
							maxAttempts: NAVIGATION_SIGNATURE_RETRIES,
							overallTimeout: NAVIGATION_SIGNATURE_RETRIES * NAVIGATION_DEBOUNCE_MS,
							skipPageGate: true,
							waitForLoaded: false
						}
					)
					.then((results) => {
						if (results[0]) this.handleNavigation(eventType);
						return undefined;
					});
				return;
			}
			if (!this.updateNavigationSignature(signature)) return;
			this.currentNavigationSignature = signature;
			if (this.navigationCallback) await this.navigationCallback(signature, eventType);
		} catch (error) {
			this.logErrorToTracker("navigation handler", error);
		} finally {
			this.navigating = false;
			if (this.currentPage === "watch") {
				/**
				 * Every settled navigation on a watch URL re-arms the live refine. Live streams
				 * boot with a burst of URL-param noise that the volatile-param filter suppresses,
				 * so those events produce no signature change; without this re-arm the player is
				 * never asked and an SPA navigation (or reload) onto a live stream stays
				 * classified as watch with every live-gated feature disabled. The top gate in
				 * runLiveRefine no-ops an attempt that lands mid-pipeline, and liveRefinePromise
				 * dedups concurrent calls, so event bursts cost one shared attempt instead of N.
				 */
				void this.refineLivePageType();
			}
			// Drain an event that arrived while this run held the gate.
			const { pendingNavigationEvent: pending } = this;
			this.pendingNavigationEvent = null;
			if (pending) this.handleNavigation(pending);
		}
	}

	private async runLiveRefine(): Promise<void> {
		// A refine that lands mid-pipeline would start a second full navigation pass.
		if (this.navigating) return;
		const { currentNavigationSignature: previousSignature, currentPage: previousPage } = this;
		const refined = await refinePageTypeFromPlayer();
		if (!refined || refined === previousPage) return;
		if (!this._initialized) return;
		// Re-check after the player await; a navigation may have started while we waited.
		if (this.navigating) return;
		const signature = getNavigationSignature();
		if (!signature) return;
		this.currentNavigationSignature = signature;
		this.currentPage = getPageFromSignature(signature);
		if (this.navigationCallback && signature !== previousSignature) {
			await this.navigationCallback(signature, "updated");
		}
	}

	private setupNavigationListener() {
		if (this.navigationPatched) return;
		this.navigationPatched = true;

		const createRunner = (eventType: NavigationEventType) => {
			return () => {
				this.handleNavigation(eventType);
			};
		};

		const wrapHistoryMethod = (method: "pushState" | "replaceState") => {
			const { [method]: original } = history;
			const wrapper = function (this: typeof history, ...args: any[]) {
				const result = original.apply(this, args as Parameters<typeof original>);
				queueMicrotask(createRunner("popstate"));
				return result;
			};
			history[method] = wrapper;
			// Store the original and wrapper for cleanup
			if (method === "pushState") {
				this.pushStateWrapper = { original, wrapper };
			} else if (method === "replaceState") {
				this.replaceStateWrapper = { original, wrapper };
			}
		};

		wrapHistoryMethod("pushState");
		wrapHistoryMethod("replaceState");
		this.navigationListeners.popstate = createRunner("popstate");
		this.navigationListeners.start = createRunner("start");
		this.navigationListeners.finish = createRunner("finish");
		this.navigationListeners.updated = createRunner("updated");
		window.addEventListener("popstate", this.navigationListeners.popstate);
		window.addEventListener("yt-navigate-start", this.navigationListeners.start);
		window.addEventListener("yt-navigate-finish", this.navigationListeners.finish);
		window.addEventListener("yt-page-data-updated", this.navigationListeners.updated);
	}

	private updateNavigationSignature(signature: Nullable<NavigationSignature>) {
		if (!signature || signature === this.currentNavigationSignature) return false;
		this.previousNavigationSignature = this.currentNavigationSignature;
		this.currentNavigationSignature = signature;
		this.currentPage = getPageFromSignature(signature);
		return true;
	}
}
export const featureNavigationManager = new FeatureNavigationManager();
function getPageFromSignature(signature: string) {
	const colonIndex = signature.indexOf(":");
	return colonIndex === -1 ? signature : signature.substring(0, colonIndex);
}
