import type {
	AnyFeatureBase,
	FeatureKeys,
	FeatureKeysWithState
} from "@/src/features/_registry/types";
import type { Nullable } from "@/src/types";

import {
	getCurrentPageType,
	invalidatePageTypeCache,
	refinePageTypeFromPlayer
} from "@/src/utils/url";

import { FeatureManagerBase } from "./featureManagerBase";

export type NavigationEventType = "finish" | "popstate" | "start" | "updated";

type NavigationSignature = `${string}${"" | `:${string}`}`;

const NAVIGATION_DEBOUNCE_MS = 100;
const NAVIGATION_SIGNATURE_RETRIES = 5;
/**
 * URL params that change without a feature-relevant navigation. Watch position, share
 * tracking, and similar query noise used to produce a new signature on every replaceState,
 * which re-ran the full navigation pipeline for the same video.
 */
const VOLATILE_URL_PARAMS = ["v", "t", "start", "si", "pp", "feature", "ab_channel"] as const;

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
	private navigationSignatureRetries = 0;
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
		this.navigationSignatureRetries = 0;
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
		if (this.navigating) return;
		if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
		this.debounceTimer = setTimeout(() => {
			this.debounceTimer = null;
			void this.processNavigation(eventType);
		}, NAVIGATION_DEBOUNCE_MS);
	}

	initialize(callback: (signature: string, eventType: NavigationEventType) => Promise<void>) {
		if (this._initialized) return;
		// Sync URL classification: do not wait on the player for live-vs-VOD.
		const signature = this.getNavigationSignature();
		if (!signature) return;
		this.currentNavigationSignature = signature;
		this.currentPage = getPageFromSignature(signature);
		this.navigationCallback = callback;
		this.setupNavigationListener();
		this._initialized = true;
		void this.refineLivePageType();
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

	private getNavigationSignature(): Nullable<NavigationSignature> {
		const pageType = getCurrentPageType();
		if (!pageType) return null;

		// Extract path parts once to avoid repetition
		const {
			location: { pathname }
		} = window;
		const pathParts = pathname.split("/").filter(Boolean);

		/**
		 * Builds the extra-identifier suffix of a signature from what is not already in it. For the path-parts array,
		 * `exclude` is the number of leading elements to drop; for URLSearchParams, it is the list of keys to drop.
		 */
		const processExclusions = <T>(source: T, exclude: number | string[]): string => {
			if (Array.isArray(source)) {
				// Handle pathParts array: exclude first 'count' elements
				const count = exclude as number;
				const filtered = source.slice(count).filter(Boolean);
				return filtered.length > 0 ? `:${filtered.join(",")}` : "";
			} else if (source instanceof URLSearchParams) {
				// Handle URLSearchParams: exclude specified keys
				const keysToExclude = exclude as string[];
				const additionalParams = Array.from(source.entries())
					.filter(([k]) => !keysToExclude.includes(k))
					.map(([k, v]) => `${k}=${v}`);
				return additionalParams.length > 0 ? `:${additionalParams.join(",")}` : "";
			}
			return "";
		};

		switch (pageType) {
			case "channel_home": {
				// Channel home page: youtube.com/@channelname (the /c/ form is handled below).
				if (pathParts[0]?.startsWith("@")) {
					const [channelId] = pathParts;
					const paramsString = processExclusions(pathParts, 1);
					return `channel_home:${channelId}${paramsString}`;
				}
				// Handle /c/channelname format
				else if (pathParts[0] === "c" && pathParts[1]) {
					const [, channelId] = pathParts;
					const paramsString = processExclusions(pathParts, 2);
					return `channel_home:${channelId}${paramsString}`;
				}
				return "channel_home:unknown";
			}
			case "channel_posts": {
				// Channel posts page: youtube.com/@channelname/posts (the /c/ form is handled below).
				if (pathParts[0]?.startsWith("@") && pathParts[1] === "posts") {
					const [channelId] = pathParts;
					const paramsString = processExclusions(pathParts, 2);
					return `channel_posts:${channelId}${paramsString}`;
				}
				// Handle /c/channelname/posts format
				else if (pathParts[0] === "c" && pathParts[1] && pathParts[2] === "posts") {
					const [, channelId] = pathParts;
					const paramsString = processExclusions(pathParts, 3);
					return `channel_posts:${channelId}${paramsString}`;
				}
				return "channel_posts:unknown";
			}
			case "channel_streams": {
				// Channel streams page: youtube.com/@channelname/streams (the /c/ form is handled below).
				if (pathParts[0]?.startsWith("@") && pathParts[1] === "streams") {
					const [channelId] = pathParts;
					const paramsString = processExclusions(pathParts, 2);
					return `channel_streams:${channelId}${paramsString}`;
				}
				// Handle /c/channelname/streams format
				else if (pathParts[0] === "c" && pathParts[1] && pathParts[2] === "streams") {
					const [, channelId] = pathParts;
					const paramsString = processExclusions(pathParts, 3);
					return `channel_streams:${channelId}${paramsString}`;
				}
				return "channel_streams:unknown";
			}
			case "channel_videos": {
				// Channel videos page: youtube.com/@channelname/videos (the /c/ form is handled below).
				if (pathParts[0]?.startsWith("@") && pathParts[1] === "videos") {
					const [channelId] = pathParts;
					const paramsString = processExclusions(pathParts, 2);
					return `channel_videos:${channelId}${paramsString}`;
				}
				// Handle /c/channelname/videos format
				else if (pathParts[0] === "c" && pathParts[1] && pathParts[2] === "videos") {
					const [, channelId] = pathParts;
					const paramsString = processExclusions(pathParts, 3);
					return `channel_videos:${channelId}${paramsString}`;
				}
				return "channel_videos:unknown";
			}
			case "home": {
				// Home page: youtube.com/ needs no further identifiers.
				return "home";
			}
			case "live": {
				// Live streams share the watch URL structure, so the video id comes from the same v parameter.
				const urlParams = new URLSearchParams(window.location.search);
				const videoId = urlParams.get("v");
				const paramsString = processExclusions(urlParams, [...VOLATILE_URL_PARAMS]);
				return videoId ? `live:${videoId}${paramsString}` : "live:unknown";
			}
			case "playlist": {
				const urlParams = new URLSearchParams(window.location.search);
				const playlistId = urlParams.get("list");
				const paramsString = processExclusions(urlParams, ["list"]);
				return playlistId ? `playlist:${playlistId}${paramsString}` : "playlist:unknown";
			}
			case "search": {
				// Search page: youtube.com/results?search_query=term
				const urlParams = new URLSearchParams(window.location.search);
				const searchQuery = urlParams.get("search_query");
				/**
				 * Including the query tells searches apart. Hashing it, or a generic signature, would keep the number
				 * of signatures down; for now the query is used when present and the generic form otherwise.
				 */
				if (searchQuery) {
					// Truncate very long queries to prevent extremely long signatures
					const truncatedQuery =
						searchQuery.length > 50 ? searchQuery.substring(0, 50) + "..." : searchQuery;
					return `search:${truncatedQuery}`;
				}
				return "search:unknown";
			}
			case "shorts": {
				const [, , shortId] = window.location.pathname.split("/");
				return shortId ? `shorts:${shortId}` : "shorts:unknown";
			}
			case "subscriptions": {
				// Subscriptions page: youtube.com/feed/subscriptions needs no further identifiers.
				return "subscriptions";
			}
			case "watch": {
				const urlParams = new URLSearchParams(window.location.search);
				const videoId = urlParams.get("v");
				const paramsString = processExclusions(urlParams, [...VOLATILE_URL_PARAMS]);
				return videoId ? `watch:${videoId}${paramsString}` : "watch:unknown";
			}
			default:
				return pageType;
		}
	}

	private async processNavigation(eventType: NavigationEventType) {
		if (this.navigating) return;
		this.navigating = true;
		let retrySignature = false;
		try {
			invalidatePageTypeCache();
			const signature = this.getNavigationSignature();
			if (!signature) {
				// Page-type detection can miss its window on a heavily loaded page; a silently dropped
				// navigation leaves every feature's onNavigate unrun. Retry through the debounce instead.
				retrySignature = this.navigationSignatureRetries < NAVIGATION_SIGNATURE_RETRIES;
				this.navigationSignatureRetries = retrySignature ? this.navigationSignatureRetries + 1 : 0;
				return;
			}
			this.navigationSignatureRetries = 0;
			if (!this.updateNavigationSignature(signature)) return;
			this.currentNavigationSignature = signature;
			if (this.navigationCallback) await this.navigationCallback(signature, eventType);
			void this.refineLivePageType();
		} catch (error) {
			this.logErrorToTracker("navigation handler", error);
		} finally {
			this.navigating = false;
			if (retrySignature) this.handleNavigation(eventType);
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
		const signature = this.getNavigationSignature();
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
