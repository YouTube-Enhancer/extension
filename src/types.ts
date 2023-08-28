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
type AppendUnderscoreDefault<T> = T extends configurationKeys ? `${T}_default` : never;
type AddUnderscoreDefault<T> = { [K in keyof T as AppendUnderscoreDefault<K>]: T[K] };
export type configurationWithDefaults = configuration & AddUnderscoreDefault<configuration>;

export type Source = "extension" | "content_script";
export type VideoHistoryStatus = "watched" | "watching";
export type VideoHistoryEntry = {
	id: string;
	timestamp: number;
	status: VideoHistoryStatus;
};
export type VideoHistoryStorage = Record<string, VideoHistoryEntry>;

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
export type VolumeBoostChangeData = {
	type: "volumeBoostChange";
	volumeBoostEnabled: boolean;
	volumeBoostAmount: number;
};
export type PlayerSpeedChangeData = {
	type: "playerSpeedChange";
	playerSpeed?: YouTubePlayerSpeedRate;
	enableForcedPlaybackSpeed: boolean;
};
export type ScreenshotButtonChangeData = {
	type: "screenshotButtonChange";
	screenshotButtonEnabled: boolean;
};
export type MaximizePlayerButtonChangeData = {
	type: "maximizePlayerButtonChange";
	maximizePlayerButtonEnabled: boolean;
};
export type VideoHistoryChangeData = {
	type: "videoHistoryChange";
	videoHistoryEnabled: boolean;
};
export type MessageTypes =
	| OptionsData["type"]
	| SetVolumeData["type"]
	| VolumeBoostChangeData["type"]
	| PlayerSpeedChangeData["type"]
	| ScreenshotButtonChangeData["type"]
	| MaximizePlayerButtonChangeData["type"]
	| VideoHistoryChangeData["type"];
export type MessageData<T extends MessageTypes> = BaseData<T> &
	(
		| OptionsData
		| SetVolumeData
		| VolumeBoostChangeData
		| PlayerSpeedChangeData
		| ScreenshotButtonChangeData
		| MaximizePlayerButtonChangeData
		| VideoHistoryChangeData
	);
export type AllMessageData = MessageData<MessageTypes>;
