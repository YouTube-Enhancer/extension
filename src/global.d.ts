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
	interface YouTubePlayer {
		setPlaybackQualityRange(suggestedQuality: string): Promise<void>;
		getVideoBytesLoaded(): Promise<number>;
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
	}
}
export {};
