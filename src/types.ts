/* eslint-disable no-mixed-spaces-and-tabs */
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };
export type OnScreenDisplayColor = "red" | "green" | "blue" | "yellow" | "orange" | "purple" | "pink" | "white";
export type OnScreenDisplayType = "no_display" | "text" | "line" | "round";
export type OnScreenDisplayPosition = "top_left" | "top_right" | "bottom_left" | "bottom_right" | "center";

export type YoutubePlayerQualityLabel = "144p" | "240p" | "360p" | "480p" | "720p" | "1080p" | "1440p" | "2160p" | "2880p" | "4320p" | "auto";
export type YoutubePlayerQualityLevel =
	| "tiny"
	| "small"
	| "medium"
	| "large"
	| "hd720"
	| "hd1080"
	| "hd1440"
	| "hd2160"
	| "hd2880"
	| "highres"
	| "auto";

export type configuration = {
	enable_scroll_wheel_volume_control: boolean;
	enable_remember_last_volume: boolean;
	enable_automatically_set_quality: boolean;
	osd_display_color: OnScreenDisplayColor;
	osd_display_type: OnScreenDisplayType;
	osd_display_position: OnScreenDisplayPosition;
	osd_display_opacity: number;
	volume_adjustment_steps: number;
	remembered_volume?: number;
	player_quality?: YoutubePlayerQualityLevel;
};
export type configurationKeys = keyof configuration;
type AppendUnderscoreDefault<T> = T extends configurationKeys ? `${T}_default` : never;
type AddUnderscoreDefault<T> = { [K in keyof T as AppendUnderscoreDefault<K>]: T[K] };
export type configurationWithDefaults = configuration & AddUnderscoreDefault<configuration>;

export type Source = "extension" | "content_script";

export type BaseData<T extends MessageTypes> = {
	source: Source;
	type: T;
};
export type OptionsData = {
	type: "options";
	options?: configuration;
};
export type SetVolumeData = {
	type: "setVolume";
	volume?: number;
};
export type MessageTypes = OptionsData["type"] | SetVolumeData["type"];
export type MessageData<T extends MessageTypes> = BaseData<T> & (OptionsData | SetVolumeData);
export type AllMessageData = MessageData<MessageTypes>;
