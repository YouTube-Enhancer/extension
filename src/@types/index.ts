import z from "zod";
import type { YouTubePlayer } from "node_modules/@types/youtube-player/dist/types";
import type { FeatureName } from "../utils/EventManager";
import type { AvailableLocales } from "../i18n";

/* eslint-disable no-mixed-spaces-and-tabs */
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };
export const onScreenDisplayColor = ["red", "green", "blue", "yellow", "orange", "purple", "pink", "white"] as const;
export type OnScreenDisplayColor = (typeof onScreenDisplayColor)[number];
export const onScreenDisplayType = ["no_display", "text", "line", "round"] as const;
export type OnScreenDisplayType = (typeof onScreenDisplayType)[number];
export const onScreenDisplayPosition = ["top_left", "top_right", "bottom_left", "bottom_right", "center"] as const;
export type OnScreenDisplayPosition = (typeof onScreenDisplayPosition)[number];
export const youtubePlayerQualityLabel = ["144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "2160p", "2880p", "4320p", "auto"] as const;
export type YoutubePlayerQualityLabel = (typeof youtubePlayerQualityLabel)[number];
export const youtubePlayerQualityLevel = [
	"tiny",
	"small",
	"medium",
	"large",
	"hd720",
	"hd1080",
	"hd1440",
	"hd2160",
	"hd2880",
	"highres",
	"auto"
] as const;
export type YoutubePlayerQualityLevel = (typeof youtubePlayerQualityLevel)[number];
export const youtubePlayerSpeedRateExtended = [2.25, 2.5, 2.75, 3, 3.25, 3.75, 4] as const;
export const youtubePlayerSpeedRate = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, ...youtubePlayerSpeedRateExtended] as const;

export const screenshotType = ["file", "clipboard"] as const;
export type ScreenshotType = (typeof screenshotType)[number];
export const screenshotFormat = ["png", "jpg", "webp"] as const;

export type ScreenshotFormat = (typeof screenshotFormat)[number];

export type configuration = {
	enable_scroll_wheel_volume_control: boolean;
	enable_remember_last_volume: boolean;
	enable_automatically_set_quality: boolean;
	enable_forced_playback_speed: boolean;
	enable_volume_boost: boolean;
	enable_screenshot_button: boolean;
	enable_maximize_player_button: boolean;
	enable_video_history: boolean;
	enable_remaining_time: boolean;
	enable_loop_button: boolean;
	enable_hide_scrollbar: boolean;
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
	player_quality: YoutubePlayerQualityLevel;
	player_speed: number;
	remembered_volumes?: {
		shortsPageVolume: number;
		watchPageVolume: number;
	};
	language: AvailableLocales;
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
export type SendDataMessage<T extends MessageAction, S extends MessageSource, Type extends string, D> = Prettify<
	BaseMessage<T, S> & {
		type: Type;
		data: D;
	}
>;
export type DataResponseMessage<Type extends string, D> = Prettify<
	BaseMessage<"data_response", "extension"> & {
		type: Type;
		data: D;
	}
>;

export type RequestDataMessage<Type extends string, D> = Prettify<
	BaseMessage<"request_data", "content"> & {
		type: Type;
		data: D;
	}
>;
export type ContentSendOnlyMessageMappings = {
	setRememberedVolume: SendDataMessage<"send_data", "content", "setRememberedVolume", { shortsPageVolume?: number; watchPageVolume?: number }>;
};
export type ExtensionSendOnlyMessageMappings = {
	volumeBoostChange: DataResponseMessage<"volumeBoostChange", { volumeBoostEnabled: boolean; volumeBoostAmount?: number }>;
	playerSpeedChange: DataResponseMessage<"playerSpeedChange", { playerSpeed?: number; enableForcedPlaybackSpeed: boolean }>;
	screenshotButtonChange: DataResponseMessage<"screenshotButtonChange", { screenshotButtonEnabled: boolean }>;
	maximizePlayerButtonChange: DataResponseMessage<"maximizePlayerButtonChange", { maximizePlayerButtonEnabled: boolean }>;
	videoHistoryChange: DataResponseMessage<"videoHistoryChange", { videoHistoryEnabled: boolean }>;
	remainingTimeChange: DataResponseMessage<"remainingTimeChange", { remainingTimeEnabled: boolean }>;
	loopButtonChange: DataResponseMessage<"loopButtonChange", { loopButtonEnabled: boolean }>;
	scrollWheelVolumeControlChange: DataResponseMessage<"scrollWheelVolumeControlChange", { scrollWheelVolumeControlEnabled: boolean }>;
	rememberVolumeChange: DataResponseMessage<"rememberVolumeChange", { rememberVolumeEnabled: boolean }>;
	hideScrollBarChange: DataResponseMessage<"hideScrollBarChange", { hideScrollBarEnabled: boolean }>;
	languageChange: DataResponseMessage<"languageChange", { language: AvailableLocales }>;
};
export type FilterMessagesBySource<T extends Messages, S extends MessageSource> = {
	[K in keyof T]: Extract<T[K], { source: S }>;
};
export type MessageMappings = Prettify<{
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
	language: {
		request: RequestDataMessage<"language", undefined>;
		response: DataResponseMessage<"language", { language: AvailableLocales }>;
	};
	extensionURL: {
		request: RequestDataMessage<"extensionURL", undefined>;
		response: DataResponseMessage<"extensionURL", { extensionURL: string }>;
	};
}>;
export type Messages = MessageMappings[keyof MessageMappings];
export type YouTubePlayerDiv = YouTubePlayer & HTMLDivElement;
export type Selector = string;
export type StorageChanges = { [key: string]: chrome.storage.StorageChange };
// Taken from https://github.com/colinhacks/zod/issues/53#issuecomment-1681090113
type TypeToZod<T> = {
	[K in keyof T]: T[K] extends string | number | boolean | null | undefined
		? undefined extends T[K]
			? z.ZodOptional<z.ZodType<Exclude<T[K], undefined>>>
			: z.ZodType<T[K]>
		: z.ZodObject<TypeToZod<T[K]>>;
};
export type PartialConfigurationToZodSchema<T> = z.ZodObject<{
	[K in keyof T]: T[K] extends object ? z.ZodObject<TypeToZod<T[K]>> : z.ZodOptionalType<z.ZodType<T[K]>>;
}>;
export type Prettify<T> = {
	[K in keyof T]: T[K];
};
export type FeatureMenuItemIconId = `yte-${FeatureName}-icon`;
export type FeatureMenuItemId = `yte-feature-${FeatureName}`;
export type FeatureMenuItemLabelId = `yte-${FeatureName}-label`;
export type WithId<S extends string> = `#${S}`;
export type NotificationType = "error" | "success" | "info" | "warning";

export type NotificationAction = "reset_settings" | undefined;

export type Notification = {
	message: string;
	type: NotificationType;
	action: NotificationAction;
	removeAfterMs?: number;
	timestamp?: number;
	progress?: number;
};
