import type { ParseKeys, TOptions } from "i18next";
import type { YouTubePlayer } from "youtube-player/dist/types";

import z from "zod";

import type { AvailableLocales } from "../i18n";
import type { FeatureName } from "../utils/EventManager";
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
export const modifierKey = ["altKey", "ctrlKey", "shiftKey"] as const;
export type ModifierKey = (typeof modifierKey)[number];
export type RememberedVolumes = { shortsPageVolume?: number; watchPageVolume?: number };
export const volumeBoostMode = ["global", "per_video"] as const;
export type VolumeBoostMode = (typeof volumeBoostMode)[number];
export type configuration = {
	enable_automatic_theater_mode: boolean;
	enable_automatically_set_quality: boolean;
	enable_forced_playback_speed: boolean;
	enable_hide_scrollbar: boolean;
	enable_loop_button: boolean;
	enable_maximize_player_button: boolean;
	enable_open_transcript_button: boolean;
	enable_remaining_time: boolean;
	enable_remember_last_volume: boolean;
	enable_screenshot_button: boolean;
	enable_scroll_wheel_speed_control: boolean;
	enable_scroll_wheel_volume_control: boolean;
	enable_scroll_wheel_volume_control_hold_modifier_key: boolean;
	enable_scroll_wheel_volume_control_hold_right_click: boolean;
	enable_video_history: boolean;
	enable_volume_boost: boolean;
	feature_menu_open_type: FeatureMenuOpenType;
	language: AvailableLocales;
	osd_display_color: OnScreenDisplayColor;
	osd_display_hide_time: number;
	osd_display_opacity: number;
	osd_display_padding: number;
	osd_display_position: OnScreenDisplayPosition;
	osd_display_type: OnScreenDisplayType;
	player_quality: YoutubePlayerQualityLevel;
	player_speed: number;
	remembered_volumes: RememberedVolumes;
	screenshot_format: ScreenshotFormat;
	screenshot_save_as: ScreenshotType;
	scroll_wheel_speed_control_modifier_key: ModifierKey;
	scroll_wheel_volume_control_modifier_key: ModifierKey;
	speed_adjustment_steps: number;
	volume_adjustment_steps: number;
	volume_boost_amount: number;
	volume_boost_mode: VolumeBoostMode;
};
export type configurationKeys = keyof configuration;
export type configurationId = configurationKeys;
export type VideoHistoryStatus = "watched" | "watching";
export type VideoHistoryEntry = {
	id: string;
	status: VideoHistoryStatus;
	timestamp: number;
};
export type VideoHistoryStorage = Record<string, VideoHistoryEntry>;
export type MessageAction = "data_response" | "request_data" | "send_data";
export type MessageSource = "content" | "extension";

export type BaseMessage<T extends MessageAction, S extends MessageSource> = {
	action: T;
	source: S;
};
export type SendDataMessage<T extends MessageAction, S extends MessageSource, Type extends string, D = undefined> = Prettify<
	BaseMessage<T, S> & {
		data: D;
		type: Type;
	}
>;
export type DataResponseMessage<Type extends string, D = undefined> = Prettify<
	BaseMessage<"data_response", "extension"> & {
		data: D;
		type: Type;
	}
>;

export type RequestDataMessage<Type extends string, D = undefined> = Prettify<
	BaseMessage<"request_data", "content"> & {
		data: D;
		type: Type;
	}
>;
export type ContentSendOnlyMessageMappings = {
	pageLoaded: SendDataMessage<"send_data", "content", "pageLoaded">;
	setRememberedVolume: SendDataMessage<"send_data", "content", "setRememberedVolume", RememberedVolumes>;
};
export type ExtensionSendOnlyMessageMappings = {
	automaticTheaterModeChange: DataResponseMessage<"automaticTheaterModeChange", { automaticTheaterModeEnabled: boolean }>;
	featureMenuOpenTypeChange: DataResponseMessage<"featureMenuOpenTypeChange", { featureMenuOpenType: FeatureMenuOpenType }>;
	hideScrollBarChange: DataResponseMessage<"hideScrollBarChange", { hideScrollBarEnabled: boolean }>;
	languageChange: DataResponseMessage<"languageChange", { language: AvailableLocales }>;
	loopButtonChange: DataResponseMessage<"loopButtonChange", { loopButtonEnabled: boolean }>;
	maximizeButtonChange: DataResponseMessage<"maximizeButtonChange", { maximizePlayerButtonEnabled: boolean }>;
	openTranscriptButtonChange: DataResponseMessage<"openTranscriptButtonChange", { openTranscriptButtonEnabled: boolean }>;
	playerSpeedChange: DataResponseMessage<"playerSpeedChange", { enableForcedPlaybackSpeed: boolean; playerSpeed?: number }>;
	remainingTimeChange: DataResponseMessage<"remainingTimeChange", { remainingTimeEnabled: boolean }>;
	rememberVolumeChange: DataResponseMessage<"rememberVolumeChange", { rememberVolumeEnabled: boolean }>;
	screenshotButtonChange: DataResponseMessage<"screenshotButtonChange", { screenshotButtonEnabled: boolean }>;
	scrollWheelSpeedControlChange: DataResponseMessage<"scrollWheelSpeedControlChange", { scrollWheelSpeedControlEnabled: boolean }>;
	scrollWheelVolumeControlChange: DataResponseMessage<"scrollWheelVolumeControlChange", { scrollWheelVolumeControlEnabled: boolean }>;
	videoHistoryChange: DataResponseMessage<"videoHistoryChange", { videoHistoryEnabled: boolean }>;
	volumeBoostChange: DataResponseMessage<
		"volumeBoostChange",
		{ volumeBoostAmount?: number; volumeBoostEnabled: boolean; volumeBoostMode: VolumeBoostMode }
	>;
};
export type FilterMessagesBySource<T extends Messages, S extends MessageSource> = {
	[K in keyof T]: Extract<T[K], { source: S }>;
};
export type MessageMappings = Prettify<{
	extensionURL: {
		request: RequestDataMessage<"extensionURL">;
		response: DataResponseMessage<"extensionURL", { extensionURL: string }>;
	};
	language: {
		request: RequestDataMessage<"language">;
		response: DataResponseMessage<"language", { language: AvailableLocales }>;
	};
	options: {
		request: RequestDataMessage<"options">;
		response: DataResponseMessage<"options", { options: configuration }>;
	};
	videoHistoryAll: {
		request: RequestDataMessage<"videoHistoryAll">;
		response: DataResponseMessage<"videoHistoryAll", { video_history_entries: VideoHistoryStorage }>;
	};
	videoHistoryOne: {
		request:
			| RequestDataMessage<"videoHistoryOne", { id: string }>
			| SendDataMessage<"send_data", "content", "videoHistoryOne", { video_history_entry: VideoHistoryEntry }>;
		response: DataResponseMessage<"videoHistoryOne", { video_history_entry: VideoHistoryEntry }>;
	};
}>;
export type Messages = MessageMappings[keyof MessageMappings];
export type YouTubePlayerDiv = YouTubePlayer & HTMLDivElement;
export type Selector = string;
export type StorageChanges = { [key: string]: chrome.storage.StorageChange };
// Taken from https://github.com/colinhacks/zod/issues/53#issuecomment-1681090113
type TypeToZod<T> = {
	[K in keyof T]: T[K] extends boolean | null | number | string | undefined ?
		undefined extends T[K] ?
			z.ZodOptional<z.ZodType<Exclude<T[K], undefined>>>
		:	z.ZodType<T[K]>
	:	z.ZodObject<TypeToZod<T[K]>>;
};
export type TypeToZodSchema<T> = z.ZodObject<{
	[K in keyof T]: T[K] extends any[] ? z.ZodArray<z.ZodType<T[K][number]>>
	: T[K] extends object ? z.ZodObject<TypeToZod<T[K]>>
	: z.ZodType<T[K]>;
}>;
export type TypeToPartialZodSchema<T> = z.ZodObject<{
	[K in keyof T]: T[K] extends any[] ? z.ZodOptionalType<z.ZodType<T[K]>>
	: T[K] extends object ? z.ZodOptionalType<z.ZodObject<TypeToZod<T[K]>>>
	: z.ZodOptionalType<z.ZodType<T[K]>>;
}>;
export type Prettify<T> = {
	[K in keyof T]: T[K];
};
export type FeatureMenuItemIconId = `yte-${FeatureName}-icon`;
export type FeatureMenuItemId = `yte-feature-${FeatureName}`;
export type FeatureMenuItemLabelId = `yte-${FeatureName}-label`;
export const featureMenuOpenType = ["click", "hover"] as const;
export type FeatureMenuOpenType = (typeof featureMenuOpenType)[number];
export type WithId<S extends string> = `#${S}`;
export type NotificationType = "error" | "info" | "success" | "warning";

export type NotificationAction = "reset_settings" | undefined;

export type Notification = {
	action: NotificationAction;
	message: ParseKeys<"en-US", TOptions, undefined>;
	progress?: number;
	removeAfterMs?: number;
	timestamp?: number;
	type: NotificationType;
};
export type CrowdinLanguageProgressResponse = {
	data: {
		data: {
			approvalProgress: number;
			language: {
				androidCode: string;
				dialectOf: null | string;
				editorCode: string;
				id: string;
				locale: string;
				name: string;
				osxCode: string;
				osxLocale: string;
				pluralCategoryNames: string[];
				pluralExamples: string[];
				pluralRules: string;
				textDirection: string;
				threeLettersCode: string;
				twoLettersCode: string;
			};
			languageId: string;
			phrases: {
				approved: number;
				preTranslateAppliedTo: number;
				total: number;
				translated: number;
			};
			translationProgress: number;
			words: {
				approved: number;
				preTranslateAppliedTo: number;
				total: number;
				translated: number;
			};
		};
	}[];
	pagination: {
		limit: number;
		offset: number;
	};
};
