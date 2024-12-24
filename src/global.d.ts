import type { i18nInstanceType } from "./i18n";

declare module "*.svg" {
	import React from "react";
	export const ReactComponent: React.SFC<React.SVGProps<SVGSVGElement>>;
	const src: string;
	export default src;
}

declare module "*.json" {
	const content: string;
	export default content;
}

declare module "node_modules/@types/youtube-player/dist/types" {
	interface VideoData {
		allowLiveDvr: boolean;
		author: string;
		backgroundable: boolean;
		cpn: string;
		errorCode?: any;
		eventId: string;
		hasProgressBarBoundaries: boolean;
		isListed: boolean;
		isLive: boolean;
		isManifestless: boolean;
		isMultiChannelAudio: boolean;
		isPlayable: boolean;
		isPremiere: boolean;
		isWindowedLive: boolean;
		itct: string;
		paidContentOverlayDurationMs: number;
		progressBarEndPositionUtcTimeMillis?: any;
		progressBarStartPositionUtcTimeMillis?: any;
		title: string;
		video_id: string;
		video_quality: string;
		video_quality_features: string[];
	}
	interface ProgressState {
		airingEnd: number;
		airingStart: number;
		allowSeeking: boolean;
		clipEnd: null | number;
		clipStart: number;
		current: number;
		displayedStart: number;
		duration: number;
		ingestionTime: null;
		isAtLiveHead: boolean;
		loaded: number;
		offset: number;
		seekableEnd: number;
		seekableStart: number;
		viewerLivestreamJoinMediaTime: number;
	}
	interface YouTubePlayer {
		getProgressState(): ProgressState;
		getVideoBytesLoaded(): Promise<number>;
		getVideoData(): Promise<VideoData>;
		loadModule(moduleName: string): void;
		setPlaybackQualityRange(suggestedQuality: string): Promise<void>;
		unloadModule(moduleName: string): void;
	}
}
declare global {
	interface ObjectConstructor {
		entries<T>(o: { [K in keyof T]: T[K] }): [keyof T, T[keyof T]][];
		keys<T>(o: T): (keyof T)[];
	}
	interface Window {
		audioCtx: AudioContext;
		cachedPlaylistDuration: { playlistId: string; totalTimeSeconds: number } | null;
		gainNode: GainNode;
		i18nextInstance: i18nInstanceType;
		webkitAudioContext: AudioContext;
	}
}

export {};
