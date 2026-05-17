import type { AnyFeatureBase, FeatureKeys, FeatureKeysWithState } from "@/src/features/_registry/types";
import type { Nullable } from "@/src/types";

import { getCurrentPageType } from "@/src/utils/url";

import { FeatureManagerBase } from "./featureManagerBase";

export type NavigationEventType = "finish" | "popstate" | "start";

type NavigationSignature = `${string}${"" | `:${string}`}`;

export class FeatureNavigationManager extends FeatureManagerBase {
	private currentNavigationSignature: Nullable<string> = null;
	private currentPage: Nullable<string> = null;
	private isInitialized = false;
	private navigationCallback?: (signature: string, eventType: NavigationEventType) => Promise<void>;
	private navigationListener?: () => void;
	private navigationPatched = false;
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
		if (!this.navigationListener) return;
		window.removeEventListener("popstate", this.navigationListener);
		window.removeEventListener("yt-navigate-start", this.navigationListener);
		window.removeEventListener("yt-navigate-finish", this.navigationListener);
		window.removeEventListener("yt-page-data-updated", this.navigationListener);
		const { pushStateWrapper, replaceStateWrapper } = this;
		// Restore original history methods
		if (pushStateWrapper) {
			const { original: pushStateOriginal } = pushStateWrapper;
			history.pushState = pushStateOriginal;
		}
		if (replaceStateWrapper) {
			const { original: replaceStateOriginal } = replaceStateWrapper;
			history.replaceState = replaceStateOriginal;
		}
		this.navigationListener = undefined;
		this.navigationPatched = false;
		this.currentNavigationSignature = null;
		this.pushStateWrapper = undefined;
		this.replaceStateWrapper = undefined;
	}

	async handleNavigation(eventType: NavigationEventType) {
		const signature = await this.getNavigationSignature();
		if (!signature) return;
		if (!this.updateNavigationSignature(signature)) return;
		this.currentNavigationSignature = signature;
		this.currentPage = getPageFromSignature(signature);
		if (this.navigationCallback) await this.navigationCallback(signature, eventType);
	}
	async initialize(callback: (signature: string, eventType: NavigationEventType) => Promise<void>) {
		if (this.isInitialized) return;
		const signature = await this.getNavigationSignature();
		if (!signature) return;
		this.currentNavigationSignature = signature;
		this.currentPage = getPageFromSignature(signature);
		this.navigationCallback = callback;
		this.setupNavigationListener();
		this.isInitialized = true;
	}
	protected getFeatureIdForErrorLogging(): FeatureKeys | FeatureKeysWithState {
		return "navigationManager" as FeatureKeys;
	}
	private async getNavigationSignature(): Promise<Nullable<NavigationSignature>> {
		const pageType = await getCurrentPageType();
		if (!pageType) return null;

		// Extract path parts once to avoid repetition
		const pathParts = window.location.pathname.split("/").filter(Boolean);

		// Single helper function to process data by excluding elements/keys
		// For arrays (pathParts): exclude first 'count' elements (number)
		// For URLSearchParams: exclude specified keys (string[])
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
				// Channel home page: youtube.com/@channelname or youtube.com/c/channelname
				// Handle /@channelname format
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
			case "channel_videos": {
				// Channel videos page: youtube.com/@channelname/videos or youtube.com/c/channelname/videos
				// Handle /@channelname/videos format
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
				// Home page: youtube.com/
				// No additional identifiers needed
				return "home";
			}
			case "live": {
				// For live streams, we can use the video ID from the watch URL
				// Live streams use the same URL structure as watch but with isLive=true
				const urlParams = new URLSearchParams(window.location.search);
				const videoId = urlParams.get("v");
				const paramsString = processExclusions(urlParams, ["v"]);
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
				// For search, we might want to include the query to differentiate searches
				// But to avoid too many signatures, we could hash it or just use a generic signature
				// For now, let's use the query if it exists, otherwise generic
				if (searchQuery) {
					// Truncate very long queries to prevent extremely long signatures
					const truncatedQuery = searchQuery.length > 50 ? searchQuery.substring(0, 50) + "..." : searchQuery;
					return `search:${truncatedQuery}`;
				}
				return "search:unknown";
			}
			case "shorts": {
				const [, , shortId] = window.location.pathname.split("/");
				return shortId ? `shorts:${shortId}` : "shorts:unknown";
			}
			case "subscriptions": {
				// Subscriptions page: youtube.com/feed/subscriptions
				// No additional identifiers needed in the URL
				return "subscriptions";
			}
			case "watch": {
				const urlParams = new URLSearchParams(window.location.search);
				const videoId = urlParams.get("v");
				const paramsString = processExclusions(urlParams, ["v"]);
				return videoId ? `watch:${videoId}${paramsString}` : "watch:unknown";
			}
			default:
				return pageType;
		}
	}

	private setupNavigationListener() {
		if (this.navigationPatched) return;
		this.navigationPatched = true;

		const createRunner = (eventType: NavigationEventType) => {
			return () => {
				void (async () => {
					await this.safelyExecute(this.getFeatureIdForErrorLogging(), "navigation handler", async () => {
						await this.handleNavigation(eventType);
					});
				})();
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
		this.navigationListener = createRunner("popstate"); // Keep a reference for cleanup
		window.addEventListener("popstate", this.navigationListener);
		window.addEventListener("yt-navigate-start", createRunner("start"));
		window.addEventListener("yt-navigate-finish", createRunner("finish"));
		window.addEventListener("yt-page-data-updated", createRunner("popstate"));
	}

	private updateNavigationSignature(signature: Nullable<NavigationSignature>) {
		if (!signature || signature === this.currentNavigationSignature) return false;
		this.currentNavigationSignature = signature;
		this.currentPage = getPageFromSignature(signature);
		return true;
	}
}
export const featureNavigationManager = new FeatureNavigationManager();
function getPageFromSignature(signature: string) {
	return signature.split(":")[0];
}
