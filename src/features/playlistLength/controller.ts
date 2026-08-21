import type { Nullable, VideoDetails } from "@/src/types";

import eventManager from "@/src/events/EventManager";
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
	private documentObserver: Nullable<MutationObserver> = null;
	private lastPlaylistLength: Nullable<number> = null;
	private lastUpdate: Nullable<{ total: number; watched: number }> = null;
	private resizeObserver: Nullable<ResizeObserver> = null;
	private ui: null | { element: HTMLDivElement; update: (state: VideoTimeState) => void } = null;
	private updateTimeout: Nullable<number> = null;

	constructor(config: PlaylistLengthParameters) {
		this.config = config;
	}

	destroy(): void {
		this.destroyed = true;

		eventManager.removeEventListeners("playlistLength");

		this.documentObserver?.disconnect();
		this.documentObserver = null;

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
		this.documentObserver?.disconnect();
		this.documentObserver = null;
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
	}

	private async fetchData(methodConfig: PlaylistLengthParameters): Promise<VideoTimeState> {
		const { pageType, playlistLengthGetMethod, playlistWatchTimeGetMethod } = methodConfig;
		const playlistItems = pageType === "watch" ? getPlaylistItemsFromWatchPage() : getPlaylistItemsFromPlaylistPage();
		const playlistItemsVideoDetails = getPlaylistItemsVideoDetails(playlistItems);

		const totalTimeSeconds = await this.resolveTotalDuration(playlistLengthGetMethod, playlistItemsVideoDetails);
		const watchedTimeSeconds = calculateWatchedTime(pageType, playlistItemsVideoDetails, playlistWatchTimeGetMethod);
		return { totalTimeSeconds, watchedTimeSeconds };
	}

	private getHeaderSelector(): string {
		const { playlist, watch } = getHeaderSelectors();
		return this.config.pageType === "watch" ? watch : playlist;
	}

	private async handleUpdate(methodConfig: PlaylistLengthParameters): Promise<void> {
		if (this.destroyed || !this.ui) return;

		const videoElement = document.querySelector<HTMLVideoElement>("video");
		const playerSpeed = videoElement?.playbackRate ?? 1;

		if (methodConfig.playlistLengthGetMethod === "api") {
			const playlistItems = methodConfig.pageType === "watch" ? getPlaylistItemsFromWatchPage() : getPlaylistItemsFromPlaylistPage();
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

		if (this.lastUpdate && this.lastUpdate.total === newTotal && this.lastUpdate.watched === newWatched) {
			return;
		}

		this.lastUpdate = { total: newTotal, watched: newWatched };
		this.ui.update({
			totalTimeSeconds: newTotal,
			watchedTimeSeconds: newWatched
		});
	}

	private async initializeWithMethod(methodConfig: PlaylistLengthParameters): Promise<void> {
		if (this.destroyed) return;
		this.disconnectObservers();

		const headerSelector = this.getHeaderSelector();
		let headerContents: Nullable<Element> = this.queryHeader(headerSelector);

		if (!headerContents) {
			headerContents = await waitForElement(headerSelector);
		}
		if (!headerContents || this.destroyed) return;

		let playlistItemsElement = document.querySelector(playlistItemsSelector());
		if (!playlistItemsElement) {
			playlistItemsElement = await waitForElement(playlistItemsSelector());
		}
		if (!playlistItemsElement || this.destroyed) return;

		const videoElement = document.querySelector<HTMLVideoElement>("video");
		const playerSpeed = videoElement?.playbackRate ?? 1;

		const data = await this.fetchData(methodConfig);
		if (this.destroyed) return;

		const initialState = {
			totalTimeSeconds: Math.floor(data.totalTimeSeconds / playerSpeed),
			watchedTimeSeconds: Math.floor(data.watchedTimeSeconds / playerSpeed)
		};

		this.ui?.element.remove();
		this.ui = createPlaylistLengthUIElement(initialState, methodConfig.pageType);

		await appendPlaylistLengthUIElement(this.ui.element);

		this.setupObservers(methodConfig, videoElement);
	}

	private queryHeader(selector: string): Nullable<Element> {
		if (this.config.pageType === "watch") return document.querySelector(selector);
		return selectFirstWithWidth(selector);
	}

	private async resolveTotalDuration(method: PlaylistLengthGetMethod, videoDetails: VideoDetails[]): Promise<number> {
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

	private setupObservers(methodConfig: PlaylistLengthParameters, videoElement: Nullable<HTMLVideoElement>): void {
		this.disconnectObservers();

		const documentObserver = new MutationObserver(() => {
			this.debouncedUpdate(methodConfig);
		});
		documentObserver.observe(document.documentElement, { childList: true, subtree: true });
		this.documentObserver = documentObserver;

		const resizeObserver = new ResizeObserver(() => {
			void this.handleUpdate(methodConfig);
		});
		resizeObserver.observe(document.documentElement);
		this.resizeObserver = resizeObserver;

		if (videoElement) {
			eventManager.addEventListener(videoElement, "timeupdate", () => void this.handleUpdate(methodConfig), "playlistLength");
		}
	}
}
