import type { Nullable, YouTubePlayerDiv } from "@/src/types";

export const onScreenDisplayColors = ["red", "green", "blue", "yellow", "orange", "purple", "pink", "white"] as const;
export type OnScreenDisplayColor = (typeof onScreenDisplayColors)[number];
export const onScreenDisplayTypes = ["no_display", "text", "line", "circle"] as const;
export type OnScreenDisplayType = (typeof onScreenDisplayTypes)[number];
export const onScreenDisplayPositions = ["top_left", "top_right", "bottom_left", "bottom_right", "center"] as const;
export type DisplayOptions = {
	displayColor: OnScreenDisplayColor;
	displayHideTime: number;
	displayOpacity: number;
	displayPadding: number;
	displayPosition: OnScreenDisplayPosition;
	displayType: OnScreenDisplayType;
	playerContainer: Nullable<YouTubePlayerDiv>;
};

export type OnScreenDisplayPosition = (typeof onScreenDisplayPositions)[number];

export const valueType = {
	Speed: "speed",
	Volume: "volume",
	VolumeBoostDB: "volume_boost_db"
} as const;
export type Value<V extends ValueType> = {
	max: number;
	type: V;
	value: number;
};

export type ValueType = (typeof valueType)[keyof typeof valueType];
