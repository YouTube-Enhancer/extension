import type { ParseKeys, TFunction, TOptions } from "i18next";
import type EnUS from "public/locales/en-US.json";
import type { YouTubePlayer } from "youtube-player/dist/types";
import type { ZodMiniArray, ZodMiniObject, ZodMiniOptional, ZodMiniType } from "zod/v4-mini";

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
export type OmitAndOverride<Input, Omitted extends keyof Input, Override extends { [Key in Omitted]: ZodMiniType }> = Override & {
	[K in keyof Omit<Input, Omitted>]: Omit<Input, Omitted>[K] extends any[] ? ZodOptionalType<ZodMiniType<Omit<Input, Omitted>[K]>>
	: Omit<Input, Omitted>[K] extends object ? ZodOptionalType<ZodMiniObject<TypeToZod<Omit<Input, Omitted>[K]>>>
	: ZodOptionalType<ZodMiniType<Omit<Input, Omitted>[K]>>;
};
export type ParentType<T, Segments extends readonly PropertyKey[]> =
	Segments extends readonly [...infer Rest extends readonly PropertyKey[], infer _Last] ? Traverse<T, Rest> : never;
export type Path<T> =
	T extends Primitive ? never
	: T extends readonly (infer U)[] ? `${number}.${Path<U>}` | `${number}`
	: {
			[K in Extract<keyof T, string>]: T[K] extends Primitive ? K
			: T[K] extends readonly (infer U)[] ? `${K}.${number}.${Path<U>}` | `${K}.${number}` | K
			: `${K}.${Path<T[K]>}` | K;
		}[Extract<keyof T, string>];
export type PathSegments<P extends string> = P extends `${infer Head}.${infer Tail}` ? [Head, ...PathSegments<Tail>] : [P];
export type PathValue<T, P extends Path<T>> =
	P extends `${infer Head}.${infer Tail}` ?
		Head extends keyof T ? PathValue<T[Head], Extract<Tail, Path<T[Head]>>>
		: Head extends `${number}` ?
			T extends readonly (infer U)[] ?
				PathValue<U, Extract<Tail, Path<U>>>
			:	never
		:	never
	: P extends keyof T ? T[P]
	: P extends `${number}` ?
		T extends readonly (infer U)[] ?
			U
		:	never
	:	never;
export type Prettify<T> = {
	[K in keyof T]: T[K];
};
export type Traverse<T, Segments extends readonly PropertyKey[]> =
	Segments extends readonly [infer K, ...infer Rest extends readonly PropertyKey[]] ?
		K extends keyof T ?
			Traverse<T[K], Rest>
		:	never
	:	T;
export type TypeToPartialZodSchema<
	Input,
	Omitted extends keyof Input = never,
	Override extends { [Key in Omitted]: ZodMiniType } = never,
	Omit = false
> = ZodMiniObject<
	Omit extends true ? OmitAndOverride<Input, Omitted, Override>
	:	{
			[K in keyof Input]: Input[K] extends any[] ? ZodOptionalType<ZodMiniType<Input[K]>>
			: Input[K] extends object ? ZodOptionalType<ZodMiniObject<TypeToZod<Input[K]>>>
			: ZodOptionalType<ZodMiniType<Input[K]>>;
		}
>;
export type TypeToZodSchema<T> = ZodMiniObject<{
	[K in keyof T]: T[K] extends any[] ? ZodMiniArray<ZodMiniType<T[K][number]>>
	: T[K] extends object ? ZodMiniObject<TypeToZod<T[K]>>
	: ZodMiniType<T[K]>;
}>;
export type WithId<S extends string> = `#${S}`;
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export type ZodOptionalType<T extends ZodMiniType> = ZodMiniOptional<T>;
type Primitive = bigint | boolean | null | number | string | symbol | undefined;
// Taken from https://github.com/colinhacks/zod/issues/53#issuecomment-1681090113
type TypeToZod<T> = {
	[K in keyof T]: T[K] extends boolean | null | number | string | undefined ?
		undefined extends T[K] ?
			ZodMiniOptional<ZodMiniType<Exclude<T[K], undefined>>>
		:	ZodMiniType<T[K]>
	:	ZodMiniObject<TypeToZod<T[K]>>;
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
export const screenshotTypes = ["file", "clipboard", "both"] as const;
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
export const miniPlayerPositions = ["bottom_center", "bottom_left", "bottom_right", "top_center", "top_left", "top_right"] as const;
export type MiniPlayerPosition = (typeof miniPlayerPositions)[number];
export const miniPlayerSizes = ["320x180", "400x225", "480x270", "560x315"] as const;
export type MiniPlayerSize = (typeof miniPlayerSizes)[number];
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
export type TSelectorFunc = Parameters<TFunction<"en-US">>[0];
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
	flipVideoHorizontalButton: "",
	flipVideoVerticalButton: "",
	forwardButton: "",
	hideEndScreenCardsButton: "",
	increasePlaybackSpeedButton: "",
	loopButton: "",
	maximizePlayerButton: "",
	miniPlayerButton: "",
	monoToStereoButton: "",
	openTranscriptButton: "",
	rewindButton: "",
	screenshotButton: "",
	volumeBoostButton: ""
} satisfies Record<AllButtonNames, "">);
export const buttonNameToSettingName = {
	copyTimestampUrlButton: "copyTimestampUrlButton",
	decreasePlaybackSpeedButton: "playbackSpeedButtons",
	flipVideoHorizontalButton: "flipVideoButtons",
	flipVideoVerticalButton: "flipVideoButtons",
	forwardButton: "forwardRewindButtons",
	hideEndScreenCardsButton: "hideEndScreenCardsButton",
	increasePlaybackSpeedButton: "playbackSpeedButtons",
	loopButton: "loopButton",
	maximizePlayerButton: "maximizePlayerButton",
	miniPlayerButton: "miniPlayerButton",
	monoToStereoButton: "monoToStereoButton",
	openTranscriptButton: "openTranscriptButton",
	rewindButton: "forwardRewindButtons",
	screenshotButton: "screenshotButton",
	volumeBoostButton: "volumeBoost"
} satisfies Record<AllButtonNames, configurationKeys>;
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
	automaticallyDisableAmbientMode: { enabled: boolean };
	automaticallyDisableAutoPlay: { enabled: boolean };
	automaticallyDisableClosedCaptions: { enabled: boolean };
	automaticallyEnableClosedCaptions: { enabled: boolean };
	automaticallyMaximizePlayer: { enabled: boolean };
	automaticallyShowMoreVideosOnEndScreen: { enabled: boolean };
	automaticTheaterMode: { enabled: boolean };
	blockNumberKeySeeking: { enabled: boolean };
	buttonPlacement: ButtonPlacementConfigurationMap;
	copyTimestampUrlButton: { enabled: boolean };
	customCSS: { code: string; enabled: boolean };
	deepDarkCSS: { colors: DeepDarkCustomThemeColors; enabled: boolean; preset: DeepDarkPreset };
	defaultToOriginalAudioTrack: { enabled: boolean };
	featureMenu: { openType: FeatureMenuOpenType };
	flipVideoButtons: { flipHorizontal: { enabled: boolean }; flipVertical: { enabled: boolean } };
	forwardRewindButtons: { enabled: boolean; time: number };
	globalVolume: {
		enabled: boolean;
		volume: number;
	};
	hideArtificialIntelligenceSummary: { enabled: boolean };
	hideEndScreenCards: { enabled: boolean };
	hideEndScreenCardsButton: { enabled: boolean };
	hideLiveStreamChat: { enabled: boolean };
	hideMembersOnlyVideos: { enabled: boolean };
	hideOfficialArtistVideosFromHomePage: { enabled: boolean };
	hidePaidPromotionBanner: { enabled: boolean };
	hidePlayables: { enabled: boolean };
	hidePlaylistRecommendationsFromHomePage: { enabled: boolean };
	hideScrollBar: { enabled: boolean };
	hideShorts: {
		channel: { enabled: boolean };
		home: { enabled: boolean };
		search: { enabled: boolean };
		sidebar: { enabled: boolean };
		videos: { enabled: boolean };
	};
	hideSidebarRecommendedVideos: { enabled: boolean };
	hideTranslateComment: { enabled: boolean };
	language: AvailableLocales;
	loopButton: { enabled: boolean };
	maximizePlayerButton: { enabled: boolean };
	miniPlayer: {
		defaultPosition: MiniPlayerPosition;
		defaultSize: MiniPlayerSize;
		enabled: boolean;
	};
	miniPlayerButton: { enabled: boolean };
	monoToStereoButton: {
		enabled: boolean;
	};
	onScreenDisplay: {
		color: OnScreenDisplayColor;
		hideTime: number;
		opacity: number;
		padding: number;
		position: OnScreenDisplayPosition;
		type: OnScreenDisplayType;
	};
	openSettingsOnMajorOrMinorVersionChange: boolean;
	openTranscriptButton: { enabled: boolean };
	openYouTubeSettingsOnHover: { enabled: boolean };
	pauseBackgroundPlayers: { enabled: boolean };
	playbackSpeedButtons: { enabled: boolean; speed: number };
	playerQuality: { enabled: boolean; fallbackStrategy: PlayerQualityFallbackStrategy; quality: YoutubePlayerQualityLevel };
	playerSpeed: {
		enabled: boolean;
		speed: number;
	};
	playlistLength: { enabled: boolean; lengthGetMethod: PlaylistLengthGetMethod; watchTimeGetMethod: PlaylistWatchTimeGetMethod };
	playlistManagementButtons: { removeButton: { enabled: boolean }; resetButton: { enabled: boolean } };
	remainingTime: { enabled: boolean };
	rememberVolume: RememberedVolumes & { enabled: boolean };
	removeRedirect: { enabled: boolean };
	restoreFullscreenScrolling: { enabled: boolean };
	saveToWatchLaterButton: { enabled: boolean };
	screenshotButton: { enabled: boolean; format: ScreenshotFormat; saveAs: ScreenshotType };
	scrollWheelSpeedControl: { enabled: boolean; modifierKey: ModifierKey; steps: number };
	scrollWheelVolumeControl: { enabled: boolean; holdModifierKey: boolean; holdRightClick: boolean; modifierKey: ModifierKey; steps: number };
	shareShortener: { enabled: boolean };
	shortsAutoScroll: { enabled: boolean };
	skipContinueWatching: { enabled: boolean };
	timestampPeek: { enabled: boolean };
	videoHistory: { enabled: boolean; resumeType: VideoHistoryResumeType };
	volumeBoost: { amount: number; enabled: boolean; mode: VolumeBoostMode };
	youtubeDataApiV3Key: string;
};
export type configurationId = Path<configuration>;
export type configurationKeys = keyof configuration;
export type ContentSendOnlyMessageMappings = {
	backgroundPlayers: SendDataMessage<"send_data", "content", "backgroundPlayers">;
	pageLoaded: SendDataMessage<"send_data", "content", "pageLoaded">;
	setRememberedVolume: SendDataMessage<"send_data", "content", "setRememberedVolume", RememberedVolumes>;
	setVolumeBoostAmount: SendDataMessage<"send_data", "content", "setVolumeBoostAmount", number>;
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
	automaticallyDisableAutoPlayChange: DataResponseMessage<"automaticallyDisableAutoPlayChange", { automaticallyDisableAutoPlayEnabled: boolean }>;
	automaticallyDisableClosedCaptionsChange: DataResponseMessage<
		"automaticallyDisableClosedCaptionsChange",
		{ automaticallyDisableClosedCaptionsEnabled: boolean }
	>;
	automaticallyEnableClosedCaptionsChange: DataResponseMessage<
		"automaticallyEnableClosedCaptionsChange",
		{ automaticallyEnableClosedCaptionsEnabled: boolean }
	>;
	automaticallyMaximizePlayerChange: DataResponseMessage<"automaticallyMaximizePlayerChange", { automaticallyMaximizePlayerEnabled: boolean }>;
	automaticallyShowMoreVideosOnEndScreenChange: DataResponseMessage<
		"automaticallyShowMoreVideosOnEndScreenChange",
		{ automaticallyShowMoreVideosOnEndScreenEnabled: boolean }
	>;
	automaticTheaterModeChange: DataResponseMessage<"automaticTheaterModeChange", { automaticTheaterModeEnabled: boolean }>;
	blockNumberKeySeekingChange: DataResponseMessage<"blockNumberKeySeekingChange", { blockNumberKeySeekingEnabled: boolean }>;
	buttonPlacementChange: DataResponseMessage<"buttonPlacementChange", ButtonPlacementChange>;
	commentsMiniPlayerChange: DataResponseMessage<"commentsMiniPlayerChange", { miniPlayerEnabled: boolean }>;
	copyTimestampUrlButtonChange: DataResponseMessage<"copyTimestampUrlButtonChange", { copyTimestampUrlButtonEnabled: boolean }>;
	customCSSChange: DataResponseMessage<"customCSSChange", { customCSSCode: string; customCSSEnabled: boolean }>;
	deepDarkThemeChange: DataResponseMessage<
		"deepDarkThemeChange",
		{ deepDarkCustomThemeColors: DeepDarkCustomThemeColors; deepDarkPreset: DeepDarkPreset; deepDarkThemeEnabled: boolean }
	>;
	defaultToOriginalAudioTrackChange: DataResponseMessage<"defaultToOriginalAudioTrackChange", { defaultToOriginalAudioTrackEnabled: boolean }>;
	featureMenuOpenTypeChange: DataResponseMessage<"featureMenuOpenTypeChange", { featureMenuOpenType: FeatureMenuOpenType }>;
	flipVideoHorizontalButtonChange: DataResponseMessage<"flipVideoHorizontalButtonChange", { flipVideoHorizontalButtonEnabled: boolean }>;
	flipVideoVerticalButtonChange: DataResponseMessage<"flipVideoVerticalButtonChange", { flipVideoVerticalButtonEnabled: boolean }>;
	forwardRewindButtonsChange: DataResponseMessage<"forwardRewindButtonsChange", { forwardRewindButtonsEnabled: boolean }>;
	globalVolumeChange: DataResponseMessage<"globalVolumeChange", { globalVolumeEnabled: boolean }>;
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
	hideMembersOnlyVideosChange: DataResponseMessage<"hideMembersOnlyVideosChange", { hideMembersOnlyVideosEnabled: boolean }>;
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
	hideShortsChange: DataResponseMessage<
		"hideShortsChange",
		{
			enableHideShortsChannel: boolean;
			enableHideShortsHome: boolean;
			enableHideShortsSearch: boolean;
			enableHideShortsSidebar: boolean;
			enableHideShortsVideos: boolean;
		}
	>;
	hideSidebarRecommendedVideosChange: DataResponseMessage<"hideSidebarRecommendedVideosChange", { hideSidebarRecommendedVideosEnabled: boolean }>;
	hideTranslateCommentChange: DataResponseMessage<"hideTranslateCommentChange", { hideTranslateCommentEnabled: boolean }>;
	languageChange: DataResponseMessage<"languageChange", { language: AvailableLocales }>;
	loopButtonChange: DataResponseMessage<"loopButtonChange", { loopButtonEnabled: boolean }>;
	maximizeButtonChange: DataResponseMessage<"maximizeButtonChange", { maximizePlayerButtonEnabled: boolean }>;
	miniPlayerButtonChange: DataResponseMessage<"miniPlayerButtonChange", { miniPlayerButtonEnabled: boolean }>;
	miniPlayerDefaultsChange: DataResponseMessage<"miniPlayerDefaultsChange", { defaultPosition: MiniPlayerPosition; defaultSize: MiniPlayerSize }>;
	monoToStereoButtonChange: DataResponseMessage<"monoToStereoButtonChange", { monoToStereoButtonEnabled: boolean }>;
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
	playlistRemoveButtonChange: DataResponseMessage<"playlistRemoveButtonChange", { playlistRemoveButtonEnabled: boolean }>;
	playlistResetButtonChange: DataResponseMessage<"playlistResetButtonChange", { playlistResetButtonEnabled: boolean }>;
	playlistWatchTimeGetMethodChange: DataResponseMessage<"playlistWatchTimeGetMethodChange", undefined>;
	remainingTimeChange: DataResponseMessage<"remainingTimeChange", { remainingTimeEnabled: boolean }>;
	rememberVolumeChange: DataResponseMessage<"rememberVolumeChange", { rememberVolumeEnabled: boolean }>;
	removeRedirectChange: DataResponseMessage<"removeRedirectChange", { removeRedirectEnabled: boolean }>;
	restoreFullscreenScrollingChange: DataResponseMessage<"restoreFullscreenScrollingChange", { restoreFullscreenScrollingEnabled: boolean }>;
	saveToWatchLaterButtonChange: DataResponseMessage<"saveToWatchLaterButtonChange", { saveToWatchLaterButtonEnabled: boolean }>;
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
	timestampPeekChange: DataResponseMessage<"timestampPeekChange", { timestampPeekEnabled: boolean }>;
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
	message: TSelectorFunc;
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
export type YouTubeNavigateStart = {
	pageType: string;
	url: string;
};
export type YouTubePlayerDiv = HTMLDivElement & YouTubePlayer;
// #endregion Configuration types

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
export type YouTubeVideoResponse = {
	items: YouTubeVideoItem[];
};
export type YtActionEvent = CustomEvent<{
	actionName: string;
}>;
