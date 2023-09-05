import type { YouTubePlayer } from "node_modules/@types/youtube-player/dist/types";
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
export type YouTubePlayerSpeedRate = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;
export type ScreenshotType = "file" | "clipboard";

export type ScreenshotFormat = "png" | "jpeg" | "webp";

export type configuration = {
	enable_scroll_wheel_volume_control: boolean;
	enable_remember_last_volume: boolean;
	enable_automatically_set_quality: boolean;
	enable_forced_playback_speed: boolean;
	enable_volume_boost: boolean;
	enable_screenshot_button: boolean;
	enable_maximize_player_button: boolean;
	enable_video_history: boolean;
	screenshot_save_as: ScreenshotType;
	screenshot_format: ScreenshotFormat;
	osd_display_color: OnScreenDisplayColor;
	osd_display_type: OnScreenDisplayType;
	osd_display_position: OnScreenDisplayPosition;
	osd_display_opacity: number;
	osd_display_hide_time: number;
	osd_display_padding: number;
	volume_adjustment_steps: number;
	volume_boost_amount: number;
	remembered_volume?: number;
	player_quality?: YoutubePlayerQualityLevel;
	player_speed?: YouTubePlayerSpeedRate;
};
export type configurationKeys = keyof configuration;
export type VideoHistoryStatus = "watched" | "watching";
export type VideoHistoryEntry = {
	id: string;
	timestamp: number;
	status: VideoHistoryStatus;
};
export type VideoHistoryStorage = Record<string, VideoHistoryEntry>;
export type MessageAction = "send_data" | "request_data" | "data_response";
export type MessageSource = "extension" | "content";

export type BaseMessage<T extends MessageAction, S extends MessageSource> = {
	action: T;
	source: S;
};
export type SendDataMessage<T extends MessageAction, S extends MessageSource, Type extends string, D> = BaseMessage<T, S> & {
	type: Type;
	data: D;
};
export type DataResponseMessage<Type extends string, D> = BaseMessage<"data_response", "extension"> & {
	type: Type;
	data: D;
};

export type RequestDataMessage<Type extends string, D> = BaseMessage<"request_data", "content"> & {
	type: Type;
	data: D;
};
export type ContentSendOnlyMessageMappings = {
	setVolume: SendDataMessage<"send_data", "content", "setVolume", { volume: number }>;
};
export type ExtensionSendOnlyMessageMappings = {
	volumeBoostChange: DataResponseMessage<"volumeBoostChange", { volumeBoostEnabled: boolean; volumeBoostAmount?: number }>;
	playerSpeedChange: DataResponseMessage<"playerSpeedChange", { playerSpeed?: YouTubePlayerSpeedRate; enableForcedPlaybackSpeed: boolean }>;
	screenshotButtonChange: DataResponseMessage<"screenshotButtonChange", { screenshotButtonEnabled: boolean }>;
	maximizePlayerButtonChange: DataResponseMessage<"maximizePlayerButtonChange", { maximizePlayerButtonEnabled: boolean }>;
	videoHistoryChange: DataResponseMessage<"videoHistoryChange", { videoHistoryEnabled: boolean }>;
};
export type FilterMessagesBySource<T extends Messages, S extends MessageSource> = {
	[K in keyof T]: Extract<T[K], { source: S }>;
};
export type MessageMappings = {
	options: {
		request: RequestDataMessage<"options", undefined>;
		response: DataResponseMessage<"options", { options: configuration }>;
	};
	videoHistoryOne: {
		request:
			| RequestDataMessage<"videoHistoryOne", { id: string }>
			| SendDataMessage<"send_data", "content", "videoHistoryOne", { video_history_entry: VideoHistoryEntry }>;
		response: DataResponseMessage<"videoHistoryOne", { video_history_entry: VideoHistoryEntry }>;
	};
	videoHistoryAll: {
		request: RequestDataMessage<"videoHistoryAll", undefined>;
		response: DataResponseMessage<"videoHistoryAll", { video_history_entries: VideoHistoryStorage }>;
	};
};
export type Messages = MessageMappings[keyof MessageMappings];
// TODO: refactor message types into Send, Receive, Change types
export type YouTubePlayerDiv = YouTubePlayer & HTMLDivElement;
export type Selector = string;
