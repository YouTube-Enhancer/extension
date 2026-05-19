import type { PlayerSize, YouTubePlayer } from "youtube-player/dist/types";

import type { YoutubePlayerQualityLevel } from "@/src/features/playerQuality/types";
import type { Path, PathValue } from "@/src/types";

export type ControlType = "Speed" | "Volume";

export type FilterKeysByPrefix<O extends object, K extends keyof O, Prefix extends string> = K extends `${Prefix}${string}` ? K : never;
export type FilterKeysByValueType<T, ValueType> = {
	[P in Path<T>]: PathValue<T, P> extends ValueType ? P : never;
}[Path<T>];

export type FilterMethodsWithParameters<O extends object, K extends keyof O> = {
	[Key in K]: O[Key] extends (...args: any[]) => any ?
		Parameters<O[Key]> extends [] ?
			never
		:	Key
	:	never;
}[K];
export type YouTubePlayerGetKeys = FilterKeysByPrefix<YouTubePlayer, keyof YouTubePlayer, "get">;

export type YouTubePlayerGetKeysWithoutParams = Exclude<YouTubePlayerGetKeys, FilterMethodsWithParameters<YouTubePlayer, YouTubePlayerGetKeys>>;
export type YouTubePlayerGetReturnType<K extends YouTubePlayerGetKeysWithoutParams> =
	K extends keyof YouTubePlayerGetReturnTypeMappings ? YouTubePlayerGetReturnTypeMappings[K] : "Return type not implemented";
export type YouTubePlayerGetReturnTypeMappings = {
	getAvailableQualityLevels: Exclude<YoutubePlayerQualityLevel, "auto">[];
	getPlaybackQuality: YoutubePlayerQualityLevel;
	getPlaybackRate: number;
	getSize: PlayerSize;
	getVolume: number;
};

export type YouTubePlayerSetKeys = FilterKeysByPrefix<YouTubePlayer, keyof YouTubePlayer, "set">;
