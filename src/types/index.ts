import type { ParseKeys, TOptions } from "i18next";
import type EnUS from "public/locales/en-US.json";
import type { YouTubePlayer } from "youtube-player/dist/types";

import { type ZodArray, type ZodObject, type ZodOptional, ZodType } from "zod";

import type { DeepDarkPreset } from "../deepDarkPresets";
import type { AvailableLocales } from "../i18n/constants";
export type AnyFunction = (...args: any[]) => void;
export type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };
export type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };
export type ExtractButtonFeatureNames<T> =
	T extends `pages.content.features.${infer FeatureName}.button.label` ? FeatureName
	: T extends `pages.content.features.${infer FeatureName}.buttons.${string}.label` ? FeatureName
	: never;
export type ExtractButtonNames<T> =
	T extends `pages.content.features.${infer ButtonName}.button.label` ? ButtonName
	: T extends `pages.content.features.${string}.buttons.${infer ButtonName}.label` ? ButtonName
	: never;
export type FilterKeysByValueType<O extends object, ValueType> = {
	[K in keyof O]: O[K] extends ValueType ? K
	: O[K] extends Record<string, ValueType> ? K
	: never;
}[keyof O];
export type KeysOfUnion<T> = T extends T ? keyof T : never;
export type NonNullable<T> = T extends Nullable<T> ? Exclude<T, null> : T;
export type NonNullableObject<T> = { [K in keyof T]: NonNullable<T[K]> };
// #region Utility types
export type Nullable<T> = null | T;
export type OmitAndOverride<Input, Omitted extends keyof Input, Override extends { [Key in Omitted]: ZodType }> = Override & {
	[K in keyof Omit<Input, Omitted>]: Omit<Input, Omitted>[K] extends any[] ? ZodOptionalType<ZodType<Omit<Input, Omitted>[K]>>
	: Omit<Input, Omitted>[K] extends object ? ZodOptionalType<ZodObject<TypeToZod<Omit<Input, Omitted>[K]>>>
	: ZodOptionalType<ZodType<Omit<Input, Omitted>[K]>>;
};
export type Path<T> = keyof T | PathImpl<T, keyof T>;
export type PathValue<T, P extends Path<T>> =
	P extends `${infer Key}.${infer Rest}` ?
		Key extends keyof T ?
			Rest extends Path<T[Key]> ?
				PathValue<T[Key], Rest>
			:	never
		:	never
	: P extends keyof T ? T[P]
	: never;
export type Prettify<T> = {
	[K in keyof T]: T[K];
};
export type TypeToPartialZodSchema<
	Input,
	Omitted extends keyof Input = never,
	Override extends { [Key in Omitted]: ZodType } = never,
	Omit = false
> = ZodObject<
	Omit extends true ? OmitAndOverride<Input, Omitted, Override>
	:	{
			[K in keyof Input]: Input[K] extends any[] ? ZodOptionalType<ZodType<Input[K]>>
			: Input[K] extends object ? ZodOptionalType<ZodObject<TypeToZod<Input[K]>>>
			: ZodOptionalType<ZodType<Input[K]>>;
		}
>;
export type TypeToZodSchema<T> = ZodObject<{
	[K in keyof T]: T[K] extends any[] ? ZodArray<ZodType<T[K][number]>>
	: T[K] extends object ? ZodObject<TypeToZod<T[K]>>
	: ZodType<T[K]>;
}>;
export type WithId<S extends string> = `#${S}`;
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export type ZodOptionalType<T extends ZodType> = ZodOptional<T>;
type PathImpl<T, Key extends keyof T> =
	Key extends string ?
		T[Key] extends Record<string, any> ?
			T[Key] extends ArrayLike<any> ?
				`${Key}.${PathImpl<T[Key], Exclude<keyof T[Key], keyof any[]>>}` | Key
			:	`${Key}.${PathImpl<T[Key], keyof T[Key]>}` | Key
		:	Key
	:	never;
// Taken from https://github.com/colinhacks/zod/issues/53#issuecomment-1681090113
type TypeToZod<T> = {
	[K in keyof T]: T[K] extends boolean | null | number | string | undefined ?
		undefined extends T[K] ?
			ZodOptional<ZodType<Exclude<T[K], undefined>>>
		:	ZodType<T[K]>
	:	ZodObject<TypeToZod<T[K]>>;
};
// #endregion Utility types
// #region Constants
export const onScreenDisplayColors = ["red", "green", "blue", "yellow", "orange", "purple", "pink", "white"] as const;
export type OnScreenDisplayColor = (typeof onScreenDisplayColors)[number];
export const onScreenDisplayTypes = ["no_display", "text", "line", "circle"] as const;
export type OnScreenDisplayType = (typeof onScreenDisplayTypes)[number];
export const onScreenDisplayPositions = ["top_left", "top_right", "bottom_left", "bottom_right", "center"] as const;
export type OnScreenDisplayPosition = (typeof onScreenDisplayPositions)[number];
export const youtubePlayerQualityLabels = ["144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "2160p", "2880p", "4320p", "auto"] as const;
export type YoutubePlayerQualityLabel = (typeof youtubePlayerQualityLabels)[number];
export const youtubePlayerQualityLevels = [
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
export type YoutubePlayerQualityLevel = (typeof youtubePlayerQualityLevels)[number];
export const PlayerQualityFallbackStrategy = ["higher", "lower"] as const;
export type PlayerQualityFallbackStrategy = (typeof PlayerQualityFallbackStrategy)[number];
export const youtubePlayerMaxSpeed = 16;
export const youtubePlayerMinSpeed = 0.07;
export const youtubePlayerSpeedStep = 0.01;
export const screenshotTypes = ["file", "clipboard"] as const;
export type ScreenshotType = (typeof screenshotTypes)[number];
export const screenshotFormats = ["png", "jpeg", "webp"] as const;
export type ScreenshotFormat = (typeof screenshotFormats)[number];
export const modifierKeys = ["altKey", "ctrlKey", "shiftKey"] as const;
export type ModifierKey = (typeof modifierKeys)[number];
export const volumeBoostModes = ["global", "per_video"] as const;
export type VolumeBoostMode = (typeof volumeBoostModes)[number];
export const videoHistoryResumeTypes = ["automatic", "prompt"] as const;
export type VideoHistoryResumeType = (typeof videoHistoryResumeTypes)[number];
export const buttonPlacements = ["below_player", "feature_menu", "player_controls_left", "player_controls_right"] as const;
export type ButtonPlacement = (typeof buttonPlacements)[number];
export const playlistWatchTimeGetMethod = ["duration", "youtube"] as const;
export type PlaylistWatchTimeGetMethod = (typeof playlistWatchTimeGetMethod)[number];
export const playlistLengthGetMethod = ["api", "html"] as const;
export type PlaylistLengthGetMethod = (typeof playlistLengthGetMethod)[number];
export const featureMenuOpenTypes = ["click", "hover"] as const;
export type AllButtonNames = Exclude<ExtractButtonNames<TOptionsKeys>, "featureMenu">;
export type ButtonPlacementChange = {
	buttonPlacement: {
		[Key in AllButtonNames]: {
			new: ButtonPlacement;
			old: ButtonPlacement;
		};
	};
};
export type DeepDarkCustomThemeColors = {
	colorShadow: string;
	dimmerText: string;
	hoverBackground: string;
	mainBackground: string;
	mainColor: string;
	mainText: string;
	secondBackground: string;
};
export type FeatureMenuOpenType = (typeof featureMenuOpenTypes)[number];
export type FeatureToMultiButtonMap = {
	[K in MultiButtonFeatureNames]: {
		[Button in keyof EnUS["pages"]["content"]["features"][K]["buttons"]]: "";
	};
};
export type MultiButtonChange = {
	[K in MultiButtonFeatureNames]: {
		[Button in keyof FeatureToMultiButtonMap[K]]: {
			new: ButtonPlacement;
			old: ButtonPlacement;
		};
	};
};
export type MultiButtonFeatureNames = ExtractButtonFeatureNames<`pages.content.features.${string}.buttons.${string}.label` & TOptionsKeys>;
export type MultiButtonNames = Exclude<AllButtonNames, SingleButtonFeatureNames>;
export type SingleButtonChange = { [K in SingleButtonFeatureNames]: { new: ButtonPlacement; old: ButtonPlacement } };
export type SingleButtonFeatureNames = Exclude<
	ExtractButtonFeatureNames<`pages.content.features.${string}.button.label` & TOptionsKeys>,
	"featureMenu"
>;
export type SingleButtonNames = Exclude<AllButtonNames, MultiButtonNames>;
export type TOptionsKeys = ParseKeys<"en-US", TOptions, undefined>;
const featureToMultiButtonMapEntries: FeatureToMultiButtonMap = {
	forwardRewindButtons: {
		forwardButton: "",
		rewindButton: ""
	},
	playbackSpeedButtons: {
		decreasePlaybackSpeedButton: "",
		increasePlaybackSpeedButton: ""
	}
};
export const featureToMultiButtonsMap = new Map(
	Object.keys(featureToMultiButtonMapEntries).map((key) => [
		key,

		Object.keys(featureToMultiButtonMapEntries[key]) as KeysOfUnion<FeatureToMultiButtonMap[typeof key]>[]
	])
);
export type FeatureMenuItemIconId = `yte-${AllButtonNames}-icon`;
export type FeatureMenuItemId = `yte-feature-${AllButtonNames}-menuitem`;
export type FeatureMenuItemLabelId = `yte-${AllButtonNames}-label`;
export const buttonNames = Object.keys({
	copyTimestampUrlButton: "",
	decreasePlaybackSpeedButton: "",
	forwardButton: "",
	hideEndScreenCardsButton: "",
	increasePlaybackSpeedButton: "",
	loopButton: "",
	maximizePlayerButton: "",
	openTranscriptButton: "",
	rewindButton: "",
	screenshotButton: "",
	volumeBoostButton: ""
} satisfies Record<AllButtonNames, "">);
export const buttonNameToSettingName = {
	copyTimestampUrlButton: "enable_copy_timestamp_url_button",
	decreasePlaybackSpeedButton: "enable_playback_speed_buttons",
	forwardButton: "enable_forward_rewind_buttons",
	hideEndScreenCardsButton: "enable_hide_end_screen_cards_button",
	increasePlaybackSpeedButton: "enable_playback_speed_buttons",
	loopButton: "enable_loop_button",
	maximizePlayerButton: "enable_maximize_player_button",
	openTranscriptButton: "enable_open_transcript_button",
	rewindButton: "enable_forward_rewind_buttons",
	screenshotButton: "enable_screenshot_button",
	volumeBoostButton: "enable_volume_boost"
} satisfies Record<AllButtonNames, `enable_${string}` & configurationKeys>;
export type ActionMessage<Type extends string, D = undefined> = Prettify<
	BaseMessage<"request_action", "content"> & {
		data: D;
		type: Type;
	}
>;
export type BaseMessage<T extends MessageAction, S extends MessageSource> = {
	action: T;
	source: S;
};
export type ButtonPlacementConfigurationMap = {
	[ButtonName in AllButtonNames]: ButtonPlacement;
};
// #endregion Extension Messaging Types
// #region Configuration types
export type configuration = {
	button_placements: ButtonPlacementConfigurationMap;
	custom_css_code: string;
	deep_dark_custom_theme_colors: DeepDarkCustomThemeColors;
	deep_dark_preset: DeepDarkPreset;
	enable_automatic_theater_mode: boolean;
	enable_automatically_disable_ambient_mode: boolean;
	enable_automatically_disable_closed_captions: boolean;
	enable_automatically_set_quality: boolean;
	enable_copy_timestamp_url_button: boolean;
	enable_custom_css: boolean;
	enable_deep_dark_theme: boolean;
	enable_default_to_original_audio_track: boolean;
	enable_forced_playback_speed: boolean;
	enable_forward_rewind_buttons: boolean;
	enable_hide_artificial_intelligence_summary: boolean;
	enable_hide_end_screen_cards: boolean;
	enable_hide_end_screen_cards_button: boolean;
	enable_hide_live_stream_chat: boolean;
	enable_hide_official_artist_videos_from_home_page: boolean;
	enable_hide_paid_promotion_banner: boolean;
	enable_hide_playables: boolean;
	enable_hide_playlist_recommendations_from_home_page: boolean;
	enable_hide_scrollbar: boolean;
	enable_hide_shorts: boolean;
	enable_hide_translate_comment: boolean;
	enable_loop_button: boolean;
	enable_maximize_player_button: boolean;
	enable_open_transcript_button: boolean;
	enable_open_youtube_settings_on_hover: boolean;
	enable_pausing_background_players: boolean;
	enable_playback_speed_buttons: boolean;
	enable_playlist_length: boolean;
	enable_redirect_remover: boolean;
	enable_remaining_time: boolean;
	enable_remember_last_volume: boolean;
	enable_restore_fullscreen_scrolling: boolean;
	enable_screenshot_button: boolean;
	enable_scroll_wheel_speed_control: boolean;
	enable_scroll_wheel_volume_control: boolean;
	enable_scroll_wheel_volume_control_hold_modifier_key: boolean;
	enable_scroll_wheel_volume_control_hold_right_click: boolean;
	enable_share_shortener: boolean;
	enable_shorts_auto_scroll: boolean;
	enable_skip_continue_watching: boolean;
	enable_timestamp_peek: boolean;
	enable_video_history: boolean;
	enable_volume_boost: boolean;
	feature_menu_open_type: FeatureMenuOpenType;
	forward_rewind_buttons_time: number;
	language: AvailableLocales;
	osd_display_color: OnScreenDisplayColor;
	osd_display_hide_time: number;
	osd_display_opacity: number;
	osd_display_padding: number;
	osd_display_position: OnScreenDisplayPosition;
	osd_display_type: OnScreenDisplayType;
	playback_buttons_speed: number;
	player_quality: YoutubePlayerQualityLevel;
	player_quality_fallback_strategy: PlayerQualityFallbackStrategy;
	player_speed: number;
	playlist_length_get_method: PlaylistLengthGetMethod;
	playlist_watch_time_get_method: PlaylistWatchTimeGetMethod;
	remembered_volumes: RememberedVolumes;
	screenshot_format: ScreenshotFormat;
	screenshot_save_as: ScreenshotType;
	scroll_wheel_speed_control_modifier_key: ModifierKey;
	scroll_wheel_volume_control_modifier_key: ModifierKey;
	speed_adjustment_steps: number;
	video_history_resume_type: VideoHistoryResumeType;
	volume_adjustment_steps: number;
	volume_boost_amount: number;
	volume_boost_mode: VolumeBoostMode;
	youtube_data_api_v3_key: string;
};
export type configurationId = Path<configuration>;
export type configurationKeys = keyof configuration;
export type ContentSendOnlyMessageMappings = {
	backgroundPlayers: SendDataMessage<"send_data", "content", "backgroundPlayers">;
	pageLoaded: SendDataMessage<"send_data", "content", "pageLoaded">;
	setRememberedVolume: SendDataMessage<"send_data", "content", "setRememberedVolume", RememberedVolumes>;
};
export type ContentToBackgroundSendOnlyMessageMappings = {
	pauseBackgroundPlayers: ActionMessage<"pauseBackgroundPlayers">;
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
export type DataResponseMessage<Type extends string, D = undefined> = Prettify<
	BaseMessage<"data_response", "extension"> & {
		data: D;
		type: Type;
	}
>;
export type ExtensionSendOnlyMessageMappings = {
	automaticallyDisableAmbientModeChange: DataResponseMessage<
		"automaticallyDisableAmbientModeChange",
		{ automaticallyDisableAmbientModeEnabled: boolean }
	>;
	automaticallyDisableClosedCaptionsChange: DataResponseMessage<
		"automaticallyDisableClosedCaptionsChange",
		{ automaticallyDisableClosedCaptionsEnabled: boolean }
	>;
	automaticTheaterModeChange: DataResponseMessage<"automaticTheaterModeChange", { automaticTheaterModeEnabled: boolean }>;
	buttonPlacementChange: DataResponseMessage<"buttonPlacementChange", ButtonPlacementChange>;
	copyTimestampUrlButtonChange: DataResponseMessage<"copyTimestampUrlButtonChange", { copyTimestampUrlButtonEnabled: boolean }>;
	customCSSChange: DataResponseMessage<"customCSSChange", { customCSSCode: string; customCSSEnabled: boolean }>;
	deepDarkThemeChange: DataResponseMessage<
		"deepDarkThemeChange",
		{ deepDarkCustomThemeColors: DeepDarkCustomThemeColors; deepDarkPreset: DeepDarkPreset; deepDarkThemeEnabled: boolean }
	>;
	defaultToOriginalAudioTrackChange: DataResponseMessage<"defaultToOriginalAudioTrackChange", { defaultToOriginalAudioTrackEnabled: boolean }>;
	featureMenuOpenTypeChange: DataResponseMessage<"featureMenuOpenTypeChange", { featureMenuOpenType: FeatureMenuOpenType }>;
	forwardRewindButtonsChange: DataResponseMessage<"forwardRewindButtonsChange", { forwardRewindButtonsEnabled: boolean }>;
	hideArtificialIntelligenceSummaryChange: DataResponseMessage<
		"hideArtificialIntelligenceSummaryChange",
		{ hideArtificialIntelligenceSummaryEnabled: boolean }
	>;
	hideEndScreenCardsButtonChange: DataResponseMessage<"hideEndScreenCardsButtonChange", { hideEndScreenCardsButtonEnabled: boolean }>;
	hideEndScreenCardsChange: DataResponseMessage<
		"hideEndScreenCardsChange",
		{ hideEndScreenCardsButtonPlacement: ButtonPlacement; hideEndScreenCardsEnabled: boolean }
	>;
	hideLiveStreamChatChange: DataResponseMessage<"hideLiveStreamChatChange", { hideLiveStreamChatEnabled: boolean }>;
	hideOfficialArtistVideosFromHomePageChange: DataResponseMessage<
		"hideOfficialArtistVideosFromHomePageChange",
		{ hideOfficialArtistVideosFromHomePageEnabled: boolean }
	>;
	hidePaidPromotionBannerChange: DataResponseMessage<"hidePaidPromotionBannerChange", { hidePaidPromotionBannerEnabled: boolean }>;
	hidePlayablesChange: DataResponseMessage<"hidePlayablesChange", { hidePlayablesEnabled: boolean }>;
	hidePlaylistRecommendationsFromHomePageChange: DataResponseMessage<
		"hidePlaylistRecommendationsFromHomePageChange",
		{ hidePlaylistRecommendationsFromHomePageEnabled: boolean }
	>;
	hideScrollBarChange: DataResponseMessage<"hideScrollBarChange", { hideScrollBarEnabled: boolean }>;
	hideShortsChange: DataResponseMessage<"hideShortsChange", { hideShortsEnabled: boolean }>;
	hideTranslateCommentChange: DataResponseMessage<"hideTranslateCommentChange", { hideTranslateCommentEnabled: boolean }>;
	languageChange: DataResponseMessage<"languageChange", { language: AvailableLocales }>;
	loopButtonChange: DataResponseMessage<"loopButtonChange", { loopButtonEnabled: boolean }>;
	maximizeButtonChange: DataResponseMessage<"maximizeButtonChange", { maximizePlayerButtonEnabled: boolean }>;
	openTranscriptButtonChange: DataResponseMessage<"openTranscriptButtonChange", { openTranscriptButtonEnabled: boolean }>;
	openYTSettingsOnHoverChange: DataResponseMessage<
		"openYTSettingsOnHoverChange",
		{
			openYouTubeSettingsOnHoverEnabled: boolean;
		}
	>;
	pauseBackgroundPlayersChange: DataResponseMessage<"pauseBackgroundPlayersChange", { pauseBackgroundPlayersEnabled: boolean }>;
	playbackSpeedButtonsChange: DataResponseMessage<
		"playbackSpeedButtonsChange",
		{ playbackButtonsSpeed: number; playbackSpeedButtonsEnabled: boolean }
	>;
	playerSpeedChange: DataResponseMessage<"playerSpeedChange", { enableForcedPlaybackSpeed: boolean; playerSpeed?: number }>;
	playlistLengthChange: DataResponseMessage<"playlistLengthChange", { playlistLengthEnabled: boolean }>;
	playlistLengthGetMethodChange: DataResponseMessage<"playlistLengthGetMethodChange", undefined>;
	playlistWatchTimeGetMethodChange: DataResponseMessage<"playlistWatchTimeGetMethodChange", undefined>;
	remainingTimeChange: DataResponseMessage<"remainingTimeChange", { remainingTimeEnabled: boolean }>;
	rememberVolumeChange: DataResponseMessage<"rememberVolumeChange", { rememberVolumeEnabled: boolean }>;
	removeRedirectChange: DataResponseMessage<"removeRedirectChange", { removeRedirectEnabled: boolean }>;
	restoreFullscreenScrollingChange: DataResponseMessage<"restoreFullscreenScrollingChange", { restoreFullscreenScrollingEnabled: boolean }>;
	screenshotButtonChange: DataResponseMessage<"screenshotButtonChange", { screenshotButtonEnabled: boolean }>;
	scrollWheelSpeedControlChange: DataResponseMessage<"scrollWheelSpeedControlChange", { scrollWheelSpeedControlEnabled: boolean }>;
	scrollWheelVolumeControlChange: DataResponseMessage<"scrollWheelVolumeControlChange", { scrollWheelVolumeControlEnabled: boolean }>;
	shareShortenerChange: DataResponseMessage<"shareShortenerChange", { shareShortenerEnabled: boolean }>;
	shortsAutoScrollChange: DataResponseMessage<
		"shortsAutoScrollChange",
		{
			shortsAutoScrollEnabled: boolean;
		}
	>;
	skipContinueWatchingChange: DataResponseMessage<"skipContinueWatchingChange", { skipContinueWatchingEnabled: boolean }>;
	videoHistoryChange: DataResponseMessage<"videoHistoryChange", { videoHistoryEnabled: boolean }>;
	volumeBoostAmountChange: DataResponseMessage<
		"volumeBoostAmountChange",
		{ volumeBoostAmount: number; volumeBoostEnabled: boolean; volumeBoostMode: VolumeBoostMode }
	>;
	volumeBoostChange: DataResponseMessage<"volumeBoostChange", { volumeBoostEnabled: boolean; volumeBoostMode: VolumeBoostMode }>;
};
export type FilterMessagesBySource<T extends Messages, S extends MessageSource> = {
	[K in keyof T]: Extract<T[K], { source: S }>;
};

// #endregion Constants
// #region Extension Messaging Types
export type MessageAction = "data_response" | "request_action" | "request_data" | "send_data";

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
export type MessageSource = "content" | "extension";
export type Notification = {
	action: NotificationAction;
	message: TOptionsKeys;
	progress?: number;
	removeAfterMs?: number;
	timestamp?: number;
	type: NotificationType;
};
export type NotificationAction = "reset_settings" | undefined;
export type NotificationType = "error" | "info" | "success" | "warning";

export type RememberedVolumes = { shortsPageVolume?: number; watchPageVolume?: number };
export type RequestDataMessage<Type extends string, D = undefined> = Prettify<
	BaseMessage<"request_data", "content"> & {
		data: D;
		type: Type;
	}
>;
export type Selector = string;

export type SendDataMessage<T extends MessageAction, S extends MessageSource, Type extends string, D = undefined> = Prettify<
	BaseMessage<T, S> & {
		data: D;
		type: Type;
	}
>;
export type StorageChanges = { [key: string]: chrome.storage.StorageChange };
export type VideoDetails = {
	duration: number;
	progress: number;
	videoId: Nullable<string>;
};
export type VideoHistoryEntry = {
	id: string;
	status: VideoHistoryStatus;
	timestamp: number;
};
export type VideoHistoryStatus = "watched" | "watching";
export type VideoHistoryStorage = Record<string, VideoHistoryEntry>;
export type YouTubePlayerDiv = HTMLDivElement & YouTubePlayer;
export type YouTubePlaylistItem = {
	contentDetails: {
		videoId: string;
	};
};
export type YouTubePlaylistResponse = {
	items: YouTubePlaylistItem[];
	nextPageToken?: string;
};
export type YouTubeVideoItem = {
	contentDetails: {
		duration: string; // ISO 8601 duration format
	};
};
// #endregion Configuration types

export type YouTubeVideoResponse = {
	items: YouTubeVideoItem[];
};
