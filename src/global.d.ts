import type { i18nInstanceType } from "./i18n";

declare module "*.svg" {
	import React = require("react");
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
		video_id: string;
		author: string;
		title: string;
		isPlayable: boolean;
		errorCode?: any;
		video_quality: string;
		video_quality_features: string[];
		backgroundable: boolean;
		eventId: string;
		cpn: string;
		isLive: boolean;
		isWindowedLive: boolean;
		isManifestless: boolean;
		allowLiveDvr: boolean;
		isListed: boolean;
		isMultiChannelAudio: boolean;
		hasProgressBarBoundaries: boolean;
		isPremiere: boolean;
		itct: string;
		progressBarStartPositionUtcTimeMillis?: any;
		progressBarEndPositionUtcTimeMillis?: any;
		paidContentOverlayDurationMs: number;
	}
	interface YouTubePlayer {
		setPlaybackQualityRange(suggestedQuality: string): Promise<void>;
		getVideoBytesLoaded(): Promise<number>;
		getVideoData(): Promise<VideoData>;
	}
}
declare global {
	interface ObjectConstructor {
		keys<T>(o: T): (keyof T)[];
		entries<T>(o: { [K in keyof T]: T[K] }): [keyof T, T[keyof T]][];
	}
	interface Window {
		audioCtx: AudioContext;
		webkitAudioContext: AudioContext;
		gainNode: GainNode;
		i18nextInstance: i18nInstanceType;
	}
}
export {};
