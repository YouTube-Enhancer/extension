import type { Nullable, VideoDetails } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import {
	subscribeToDomMutations,
	type UnsubscribeFromDomMutations
} from "@/src/utils/dom/observers/domMutationBus";
import { playlistItemsSelector, selectFirstWithWidth } from "@/src/utils/dom/selectors";
import { waitForElement } from "@/src/utils/dom/wait";

import type { PlaylistLengthGetMethod } from "./types";

import {
	appendPlaylistLengthUIElement,
	calculateWatchedTime,
	createPlaylistLengthUIElement,
	getDurationFromAPI,
	getHeaderSelectors,
	getPlaylistId,
	getPlaylistItemsFromPlaylistPage,
	getPlaylistItemsFromWatchPage,
	getPlaylistItemsVideoDetails,
	type PlaylistLengthParameters,
	type VideoTimeState
} from "./utils";

export class PlaylistLengthController {
	private cachedDuration: Nullable<{ playlistId: string; totalTimeSeconds: number }> = null;
	private config: PlaylistLengthParameters;
	private destroyed = false;
	private lastPlaylistLength: Nullable<number> = null;
	private lastUpdate: Nullable<{ total: number; watched: number }> = null;
	private rebuilding = false;
	private rebuildQueued = false;
	private rebuildTimer: Nullable<number> = null;
	private rebuildUnsubscribe: Nullable<UnsubscribeFromDomMutations> = null;
	private resizeObserver: Nullable<ResizeObserver> = null;
	private ui: Nullable<{ element: HTMLDivElement; update: (state: VideoTimeState) => void }> = null;
	private unsubscribeBus: Nullable<() => void> = null;
	private updateTimeout: Nullable<number> = null;

	constructor(config: PlaylistLengthParameters) {
		this.config = config;
	}

	destroy(): void {
		this.destroyed = true;

		eventManager.removeEventListeners("playlistLength");

		this.clearRebuildWatch();
		this.rebuildQueued = false;

		this.unsubscribeBus?.();
		this.unsubscribeBus = null;

		this.resizeObserver?.disconnect();
		this.resizeObserver = null;

		if (this.updateTimeout !== null) {
			clearTimeout(this.updateTimeout);
			this.updateTimeout = null;
		}

		this.ui?.element.remove();
		this.ui = null;
		this.lastUpdate = null;
		this.cachedDuration = null;
		this.lastPlaylistLength = null;
	}

	getUiElement(): Nullable<HTMLDivElement> {
		return this.ui?.element ?? null;
	}

	async initialize(): Promise<void> {
		if (this.destroyed) return;

		try {
			await this.initializeWithMethod(this.config);
		} catch {
			if (this.config.playlistLengthGetMethod === "html" || this.destroyed) return;

			await this.initializeWithMethod({
				...this.config,
				playlistLengthGetMethod: "html"
			});
		}
	}

	private clearRebuildWatch(): void {
		this.rebuildUnsubscribe?.();
		this.rebuildUnsubscribe = null;
		if (this.rebuildTimer !== null) {
			clearTimeout(this.rebuildTimer);
			this.rebuildTimer = null;
		}
	}

	/**
	 * Schedules a debounced rebuild. While a rebuild is already running, requests collapse into one
	 * follow-up pass, so a burst of re-render mutations cannot stack initializeWithMethod runs.
	 */
	private debouncedRebuild(): void {
		if (this.rebuildTimer !== null) clearTimeout(this.rebuildTimer);
		this.rebuildTimer = window.setTimeout(() => {
			this.rebuildTimer = null;
			void this.rebuild();
		}, 100);
	}

	private debouncedUpdate(methodConfig: PlaylistLengthParameters): void {
		if (this.updateTimeout !== null) {
			clearTimeout(this.updateTimeout);
		}
		this.updateTimeout = window.setTimeout(() => {
			this.updateTimeout = null;
			void this.handleUpdate(methodConfig);
		}, 300);
	}

	private disconnectObservers(): void {
		this.unsubscribeBus?.();
		this.unsubscribeBus = null;
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
	}

	private async fetchData(methodConfig: PlaylistLengthParameters): Promise<VideoTimeState> {
		const { pageType, playlistLengthGetMethod, playlistWatchTimeGetMethod } = methodConfig;
		const playlistItems =
			pageType === "watch" ? getPlaylistItemsFromWatchPage() : getPlaylistItemsFromPlaylistPage();
		const playlistItemsVideoDetails = getPlaylistItemsVideoDetails(playlistItems);

		const totalTimeSeconds = await this.resolveTotalDuration(
			playlistLengthGetMethod,
			playlistItemsVideoDetails
		);
		const watchedTimeSeconds = calculateWatchedTime(
			pageType,
			playlistItemsVideoDetails,
			playlistWatchTimeGetMethod
		);
		return { totalTimeSeconds, watchedTimeSeconds };
	}

	private getHeaderSelector(): string {
		const { playlist, watch } = getHeaderSelectors();
		return this.config.pageType === "watch" ? watch : playlist;
	}

	private async handleUpdate(methodConfig: PlaylistLengthParameters): Promise<void> {
		if (this.destroyed || !this.ui) return;
		// A watch-layout re-render can replace the header the UI was appended into, taking the element
		// with it. Updates on a detached element are invisible; rebuild into the live header instead.
		if (!document.contains(this.ui.element)) {
			this.debouncedRebuild();
			return;
		}

		const videoElement = document.querySelector<HTMLVideoElement>("video");
		const playerSpeed = videoElement?.playbackRate ?? 1;

		if (methodConfig.playlistLengthGetMethod === "api") {
			const playlistItems =
				methodConfig.pageType === "watch"
					? getPlaylistItemsFromWatchPage()
					: getPlaylistItemsFromPlaylistPage();
			const { length: currentLength } = playlistItems;

			if (this.lastPlaylistLength === null) {
				this.lastPlaylistLength = currentLength;
			} else if (currentLength !== this.lastPlaylistLength) {
				this.cachedDuration = null;
				this.lastPlaylistLength = currentLength;
			}
		}

		const data = await this.fetchData(methodConfig);
		if (this.destroyed) return;

		const newTotal = Math.floor(data.totalTimeSeconds / playerSpeed);
		const newWatched = Math.floor(data.watchedTimeSeconds / playerSpeed);

		if (
			this.lastUpdate &&
			this.lastUpdate.total === newTotal &&
			this.lastUpdate.watched === newWatched
		) {
			return;
		}

		this.lastUpdate = { total: newTotal, watched: newWatched };
		this.ui.update({
			totalTimeSeconds: newTotal,
			watchedTimeSeconds: newWatched
		});
	}
	private hasPlaylist(): boolean {
		if (this.config.pageType === "playlist") return true;
		return new URLSearchParams(window.location.search).has("list");
	}

	private async initializeWithMethod(methodConfig: PlaylistLengthParameters): Promise<void> {
		if (this.destroyed) return;
		this.disconnectObservers();
		this.clearRebuildWatch();
		if (!this.hasPlaylist()) return;

		const headerSelector = this.getHeaderSelector();
		let headerContents: Nullable<Element> = this.queryHeader(headerSelector);

		if (!headerContents) {
			headerContents = await waitForElement(headerSelector);
		}
		if (this.destroyed) return;
		if (!headerContents) {
			// The watch layout renders its playlist header late after an SPA navigation. Keep watching
			// for it instead of giving up: a one-shot wait here left the UI missing for the rest of the
			// page session whenever the header beat the 2500 ms budget.
			this.watchForRebuild(headerSelector);
			return;
		}

		const itemsSelector = playlistItemsSelector();
		let playlistItemsElement = document.querySelector(itemsSelector);
		if (!playlistItemsElement) {
			playlistItemsElement = await waitForElement(itemsSelector);
		}
		if (this.destroyed) return;
		if (!playlistItemsElement) {
			this.watchForRebuild(itemsSelector);
			return;
		}

		const videoElement = document.querySelector<HTMLVideoElement>("video");
		const playerSpeed = videoElement?.playbackRate ?? 1;

		const data = await this.fetchData(methodConfig);
		if (this.destroyed) return;
		if (!(data.totalTimeSeconds > 0)) {
			console.error("[playlistLength] Could not determine the playlist duration");
			return;
		}

		const initialState = {
			totalTimeSeconds: Math.floor(data.totalTimeSeconds / playerSpeed),
			watchedTimeSeconds: Math.floor(data.watchedTimeSeconds / playerSpeed)
		};

		this.ui?.element.remove();
		this.ui = createPlaylistLengthUIElement(initialState, methodConfig.pageType);

		const appended = await appendPlaylistLengthUIElement(this.ui.element);
		if (this.destroyed) return;
		if (!appended) {
			this.watchForRebuild(headerSelector);
			return;
		}

		this.setupObservers(methodConfig, videoElement);
	}

	private queryHeader(selector: string): Nullable<Element> {
		if (this.config.pageType === "watch") return document.querySelector(selector);
		return selectFirstWithWidth(selector);
	}

	private async rebuild(): Promise<void> {
		if (this.destroyed) return;
		if (this.rebuilding) {
			this.rebuildQueued = true;
			return;
		}
		this.rebuilding = true;
		try {
			do {
				this.rebuildQueued = false;
				// initialize() rather than initializeWithMethod: the rebuild re-runs the same api-then-html
				// fallback the first pass has, so a method that throws (a UU playlist, api) cannot kill it.
				await this.initialize();
			} while (this.rebuildQueued && !this.destroyed);
		} finally {
			this.rebuilding = false;
		}
	}

	private async resolveTotalDuration(
		method: PlaylistLengthGetMethod,
		videoDetails: VideoDetails[]
	): Promise<number> {
		if (method === "html") {
			return videoDetails.reduce((total, video) => total + video.duration, 0);
		}

		const playlistId = getPlaylistId();
		if (!playlistId) return 0;

		if (this.cachedDuration?.playlistId === playlistId) {
			return this.cachedDuration.totalTimeSeconds;
		}

		const totalTimeSeconds = await getDurationFromAPI(playlistId);
		this.cachedDuration = { playlistId, totalTimeSeconds };
		return totalTimeSeconds;
	}

	private setupObservers(
		methodConfig: PlaylistLengthParameters,
		videoElement: Nullable<HTMLVideoElement>
	): void {
		this.disconnectObservers();

		this.unsubscribeBus = subscribeToDomMutations("*", () => {
			this.debouncedUpdate(methodConfig);
		});

		const resizeObserver = new ResizeObserver(() => {
			void this.handleUpdate(methodConfig);
		});
		resizeObserver.observe(document.documentElement);
		this.resizeObserver = resizeObserver;

		if (videoElement) {
			eventManager.addEventListener(
				videoElement,
				"timeupdate",
				() => void this.handleUpdate(methodConfig),
				"playlistLength"
			);
		}
	}

	/**
	 * Arms a mutation-bus watch on the anchor that was missing (or that refused the append) and
	 * rebuilds when it lands. The watch replaces the old behavior of giving up for the page session:
	 * after an SPA navigation the watch-layout playlist header renders late, and the one-shot 2500 ms
	 * wait regularly lost to it. Two gaps the plain subscription cannot see are covered here: an
	 * anchor that landed while the wait was still running (re-check on arm), and selectors whose
	 * match depends on an ancestor's `hidden` attribute flipping (attribute subscription on the
	 * selector's leading compound - the panel unhiding is an attribute mutation, not an added node).
	 */
	private watchForRebuild(anchorSelector: string): void {
		this.clearRebuildWatch();
		if (document.querySelector(anchorSelector)) {
			this.debouncedRebuild();
			return;
		}
		// The playlist header and items are nested inside the page content YouTube
		// re-renders, so the descendant scan is required to find them.
		this.rebuildUnsubscribe = subscribeToDomMutations(
			anchorSelector,
			() => {
				this.debouncedRebuild();
			},
			{ deep: true }
		);
		const [attributeStem] = anchorSelector.split(":not([hidden])");
		if (attributeStem !== anchorSelector) {
			const offAttribute = subscribeToDomMutations(attributeStem, () => this.debouncedRebuild(), {
				attributeFilter: ["hidden"]
			});
			const { rebuildUnsubscribe: previous } = this;
			this.rebuildUnsubscribe = () => {
				previous();
				offAttribute();
			};
		}
	}
}
