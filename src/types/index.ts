import type { ParseKeys, TFunction, TOptions } from "i18next";
import type { YouTubePlayer } from "youtube-player/dist/types";
import type { ZodMiniArray, ZodMiniObject, ZodMiniOptional, ZodMiniType } from "zod/v4-mini";

import type EnUS from "@/public/locales/en-US.json.d";
import type { DeepDarkPreset } from "@/src/deepDarkPresets";
import type {
	AnyFeatureBase,
	CoreFeatureKeys,
	FeatureKeys,
	FeatureKeysWithState,
	FeatureState,
	NonFeatureKeys
} from "@/src/features/_registry/types";
import type { FeatureMenuOpenType } from "@/src/features/featureMenu/types";
import type { MiniPlayerPosition, MiniPlayerSize } from "@/src/features/miniPlayer/types";
import type { PlayerQualityFallbackStrategy, YoutubePlayerQualityLevel } from "@/src/features/playerQuality/types";
import type { PlaylistLengthGetMethod, PlaylistWatchTimeGetMethod } from "@/src/features/playlistLength/types";
import type { ScreenshotFormat, ScreenshotType } from "@/src/features/screenshotButton/types";
import type { VideoHistoryResumeType } from "@/src/features/videoHistory/types";
import type { VolumeBoostMode } from "@/src/features/volumeBoost/types";
import type { i18nInstanceType } from "@/src/i18n";
import type { AvailableLocales } from "@/src/i18n/constants";
import type { OnScreenDisplayColor, OnScreenDisplayPosition, OnScreenDisplayType } from "@/src/ui/OnScreenDisplayManager/types";
export type AnyFunction = (...args: any[]) => void;
export type Brand<T, U> = T & { __brand: U };
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
export type Path<T, Prefix extends string = ""> =
	T extends Primitive ? never
	: T extends readonly (infer U)[] ?
		Path<U, Prefix extends "" ? `${number}` : `${Prefix}.${number}`> | (Prefix extends "" ? `${number}` : `${Prefix}.${number}`)
	:	{
			[K in Extract<keyof T, string>]: T[K] extends Primitive ?
				Prefix extends "" ?
					K
				:	`${Prefix}.${K}`
			: T[K] extends readonly (infer U)[] ? Path<U, Prefix extends "" ? `${K}.${number}` : `${Prefix}.${K}.${number}`>
			: Path<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>;
		}[Extract<keyof T, string>];
export type PathSegments<P extends string> = P extends `${infer Head}.${infer Tail}` ? [Head, ...PathSegments<Tail>] : [P];
export type PathValue<T, P extends string> =
	P extends `${infer Head}.${infer Tail}` ?
		Head extends keyof T ? PathValue<T[Head], Tail>
		: Head extends `${number}` ?
			T extends readonly (infer U)[] ?
				PathValue<U, Tail>
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
type Primitive = bigint | boolean | Nullable<number> | string | symbol | undefined;
// Taken from https://github.com/colinhacks/zod/issues/53#issuecomment-1681090113
type TypeToZod<T> = {
	[K in keyof T]: T[K] extends boolean | Nullable<number> | string | undefined ?
		undefined extends T[K] ?
			ZodMiniOptional<ZodMiniType<Exclude<T[K], undefined>>>
		:	ZodMiniType<T[K]>
	:	ZodMiniObject<TypeToZod<T[K]>>;
};
// #endregion Utility types
// #region Constants
export const youtubePlayerMaxSpeed = 16;
export const youtubePlayerMinSpeed = 0.07;
export const youtubePlayerSpeedStep = 0.01;
export const modifierKeys = ["altKey", "ctrlKey", "shiftKey"] as const;
export type ModifierKey = (typeof modifierKeys)[number];
export const buttonPlacements = ["below_player", "feature_menu", "player_controls_left", "player_controls_right"] as const;
export type AllButtonNames = Exclude<ExtractButtonNames<TOptionsKeys>, "featureMenu">;
export type ButtonPlacement = (typeof buttonPlacements)[number];
export type FullscreenPlacement = "same" | Exclude<ButtonPlacement, "below_player">;
export const fullscreenPlacements = [
	"same" as const,
	...buttonPlacements.filter((p): p is Exclude<ButtonPlacement, "below_player"> => p !== "below_player")
] satisfies readonly FullscreenPlacement[];
export type DeepDarkCustomThemeColors = {
	colorShadow: string;
	dimmerText: string;
	hoverBackground: string;
	mainBackground: string;
	mainColor: string;
	mainText: string;
	secondBackground: string;
};
export type FeatureToMultiButtonMap = {
	[K in MultiButtonFeatureNames]: {
		[Button in keyof EnUS["pages"]["content"]["features"][K]["buttons"]]: "";
	};
};
export type MultiButtonFeatureNames = ExtractButtonFeatureNames<`pages.content.features.${string}.buttons.${string}.label` & TOptionsKeys>;
export type MultiButtonNames = Exclude<AllButtonNames, SingleButtonFeatureNames>;
export type SingleButtonFeatureNames = Exclude<
	ExtractButtonFeatureNames<`pages.content.features.${string}.button.label` & TOptionsKeys>,
	"featureMenu"
>;
export type SingleButtonNames = Exclude<AllButtonNames, MultiButtonNames>;
export type SnakeToCamel<S extends string> = S extends `${infer T}_${infer U}` ? `${T}${Capitalize<SnakeToCamel<U>>}` : S;
export type TOptionsKeys = ParseKeys<"en-US", TOptions, undefined>;
export type TSelectFunc = (t: i18nInstanceType["t"]) => string;
export type TSelectorFunc = Parameters<TFunction<"en-US">>[0];
const featureToMultiButtonMapEntries = {
	forwardRewindButtons: {
		forwardButton: "",
		rewindButton: ""
	},
	playbackSpeedButtons: {
		decreasePlaybackSpeedButton: "",
		increasePlaybackSpeedButton: ""
	}
} satisfies FeatureToMultiButtonMap;
export const featureToMultiButtonsMap = new Map(
	Object.keys(featureToMultiButtonMapEntries).map((key) => [
		key,

		Object.keys(featureToMultiButtonMapEntries[key]) as KeysOfUnion<FeatureToMultiButtonMap[typeof key]>[]
	])
);
export type FeatureButtonId = `yte-feature-${AllButtonNames}-button`;
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
export type Author = Brand<string, "author">;
export type BaseMessage<T extends MessageAction, S extends MessageSource> = {
	action: T;
	source: S;
	timestamp?: number;
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
	copyTimestampUrlButton: {
		button: { enabled: boolean; fullscreenPlacement: FullscreenPlacement; placement: ButtonPlacement };
	};
	customCSS: { code: string; enabled: boolean };
	deepDarkCSS: { colors: DeepDarkCustomThemeColors; enabled: boolean; preset: DeepDarkPreset };
	defaultToOriginalAudioTrack: { enabled: boolean };
	featureMenu: { openType: FeatureMenuOpenType };
	flipVideoButtons: {
		buttons: {
			flipVideoHorizontalButton: { enabled: boolean; fullscreenPlacement: FullscreenPlacement; placement: ButtonPlacement };
			flipVideoVerticalButton: { enabled: boolean; fullscreenPlacement: FullscreenPlacement; placement: ButtonPlacement };
		};
	};
	forwardRewindButtons: { button: { enabled: boolean; fullscreenPlacement: FullscreenPlacement; placement: ButtonPlacement }; time: number };
	globalVolume: {
		enabled: boolean;
		volume: number;
	};
	hideArtificialIntelligenceSummary: { enabled: boolean };
	hideEndScreenCards: { enabled: boolean };
	hideEndScreenCardsButton: {
		button: { enabled: boolean; fullscreenPlacement: FullscreenPlacement; placement: ButtonPlacement };
	};
	hideLiveStreamChat: { enabled: boolean };
	hideMembersOnlyVideos: { enabled: boolean };
	hideOfficialArtistVideosFromHomePage: { enabled: boolean };
	hidePaidPromotionBanner: { enabled: boolean };
	hidePlayables: { enabled: boolean };
	hidePlaylistRecommendationsFromHomePage: { enabled: boolean };
	hidePosts: { enabled: boolean };
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
	loopButton: {
		button: { enabled: boolean; fullscreenPlacement: FullscreenPlacement; placement: ButtonPlacement };
	};
	maximizePlayerButton: {
		button: { enabled: boolean; fullscreenPlacement: FullscreenPlacement; placement: ButtonPlacement };
	};
	miniPlayer: {
		defaultPosition: MiniPlayerPosition;
		defaultSize: MiniPlayerSize;
		enabled: boolean;
	};
	miniPlayerButton: {
		button: { enabled: boolean; fullscreenPlacement: FullscreenPlacement; placement: ButtonPlacement };
	};
	monoToStereoButton: {
		button: { enabled: boolean; fullscreenPlacement: FullscreenPlacement; placement: ButtonPlacement };
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
	openTranscriptButton: {
		button: { enabled: boolean; fullscreenPlacement: FullscreenPlacement; placement: ButtonPlacement };
	};
	openYouTubeSettingsOnHover: { enabled: boolean };
	pauseBackgroundPlayers: { enabled: boolean };
	playbackSpeedButtons: { button: { enabled: boolean; fullscreenPlacement: FullscreenPlacement; placement: ButtonPlacement }; speed: number };
	playerQuality: { enabled: boolean; fallbackStrategy: PlayerQualityFallbackStrategy; quality: YoutubePlayerQualityLevel };
	playerSpeed: {
		enabled: boolean;
		speed: number;
	};
	playlistLength: { enabled: boolean; lengthGetMethod: PlaylistLengthGetMethod; watchTimeGetMethod: PlaylistWatchTimeGetMethod };
	playlistManagementButtons: {
		removeButton: { enabled: boolean };
		resetButton: { enabled: boolean };
	};
	remainingTime: { enabled: boolean };
	rememberVolume: { enabled: boolean };
	removeRedirect: { enabled: boolean };
	restoreFullscreenScrolling: { enabled: boolean };
	saveToWatchLaterButton: { enabled: boolean };
	screenshotButton: {
		button: { enabled: boolean; fullscreenPlacement: FullscreenPlacement; placement: ButtonPlacement };
		format: ScreenshotFormat;
		saveAs: ScreenshotType;
	};
	scrollWheelSpeedControl: { enabled: boolean; modifierKey: ModifierKey; steps: number };
	scrollWheelVolumeControl: { enabled: boolean; holdModifierKey: boolean; holdRightClick: boolean; modifierKey: ModifierKey; steps: number };
	shareShortener: { enabled: boolean };
	shortsAutoScroll: { enabled: boolean };
	skipContinueWatching: { enabled: boolean };
	timestampPeek: { enabled: boolean };
	videoHistory: { enabled: boolean; resumeType: VideoHistoryResumeType };
	volumeBoost: {
		amount: number;
		button: { fullscreenPlacement: FullscreenPlacement; placement: ButtonPlacement };
		enabled: boolean;
		mode: VolumeBoostMode;
	};
	youtubeDataApiV3Key: string;
};
export type configurationId = Path<configuration>;
export type configurationKeys = keyof configuration;
export type ContentSendOnlyMessageMappings = {
	backgroundPlayers: SendDataMessage<"send_data", "content", "backgroundPlayers">;
	featureStateUpdate: SendDataMessage<"send_data", "content", "featureStateUpdate", { id: FeatureKeys; state: unknown }>;
	pageLoaded: SendDataMessage<"send_data", "content", "pageLoaded">;
	setVolumeBoostAmount: SendDataMessage<"send_data", "content", "setVolumeBoostAmount", number>;
	/**
	 * ⚠ Test-only entrypoint.
	 * Directly writes to browser.storage.local via content script pipeline.
	 * Exists solely to support E2E tests (Playwright). Not a runtime feature.
	 */
	test_setConfigValue: SendDataMessage<
		"send_data",
		"content",
		"test_setConfigValue",
		{
			key: Path<configuration>;
			value: PathValue<configuration, Path<configuration>>;
		}
	>;
};
export type ContentSendOnlyMessages = ContentSendOnlyMessageMappings[keyof ContentSendOnlyMessageMappings];
export type ContentToBackgroundSendOnlyMessageMappings = {
	pauseBackgroundPlayers: ActionMessage<"pauseBackgroundPlayers">;
};
export type ContentToBackgroundSendOnlyMessages = ContentToBackgroundSendOnlyMessageMappings[keyof ContentToBackgroundSendOnlyMessageMappings];
export type CrowdinLanguageProgressResponse = {
	data: {
		data: {
			approvalProgress: number;
			language: {
				androidCode: string;
				dialectOf: Nullable<string>;
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
export type DevToolsDataResponseMessage<Type extends DevToolsMessageType, D = undefined> = Prettify<
	BaseMessage<"data_response", "extension"> & {
		data: D;
		extensionId: string;
		requestId: string;
		tabId: number;
		type: Type;
	}
>;

export type DevToolsMessageMappings = {
	devtools_clear_performance_metrics: {
		request: DevToolsRequestDataMessage<"devtools_clear_performance_metrics">;
		response: DevToolsDataResponseMessage<"devtools_clear_performance_metrics", { cleared: boolean }>;
	};
	devtools_get_all_feature_configs: {
		request: DevToolsRequestDataMessage<"devtools_get_all_feature_configs">;
		response: DevToolsDataResponseMessage<"devtools_get_all_feature_configs", { configs: { [K in FeatureKeys]?: configuration[K] } }>;
	};
	devtools_get_core_config: {
		request: DevToolsRequestDataMessage<"devtools_get_core_config">;
		response: DevToolsDataResponseMessage<"devtools_get_core_config", { config: configuration }>;
	};
	devtools_get_feature_config: {
		request: DevToolsRequestDataMessage<"devtools_get_feature_config", { id: FeatureKeys }>;
		response: DevToolsDataResponseMessage<"devtools_get_feature_config", { config?: configuration[FeatureKeys]; id: FeatureKeys }>;
	};
	devtools_get_feature_state: {
		request: DevToolsRequestDataMessage<"devtools_get_feature_state", { id: FeatureKeysWithState }>;
		response: DevToolsDataResponseMessage<
			"devtools_get_feature_state",
			{ id: FeatureKeysWithState; state: FeatureState[`state:${FeatureKeysWithState}`] }
		>;
	};
	devtools_get_features: {
		request: DevToolsRequestDataMessage<"devtools_get_features">;
		response: DevToolsDataResponseMessage<"devtools_get_features", { features: AnyFeatureBase[] }>;
	};
	devtools_get_performance_metrics: {
		request: DevToolsRequestDataMessage<"devtools_get_performance_metrics">;
		response: DevToolsDataResponseMessage<"devtools_get_performance_metrics", { errors: unknown[]; metrics: unknown[] }>;
	};
	devtools_invalidate_cache: {
		request: DevToolsRequestDataMessage<"devtools_invalidate_cache", { keys: string[] }>;
		response: DevToolsDataResponseMessage<"devtools_invalidate_cache", { ok: boolean }>;
	};
	devtools_toggle_feature: {
		request: DevToolsRequestDataMessage<"devtools_toggle_feature", { enabled: boolean; id: FeatureKeys; path: string }>;
		response: DevToolsDataResponseMessage<"devtools_toggle_feature", { enabled: boolean; id: FeatureKeys }>;
	};
	devtools_update_core_config: {
		request: DevToolsRequestDataMessage<"devtools_update_core_config", { path: CoreFeatureKeys | NonFeatureKeys; value: unknown }>;
		response: DevToolsDataResponseMessage<"devtools_update_core_config", { config: Pick<configuration, CoreFeatureKeys | NonFeatureKeys> }>;
	};
	devtools_update_feature_config: {
		request: DevToolsRequestDataMessage<"devtools_update_feature_config", { id: FeatureKeys; path: string; value: unknown }>;
		response: DevToolsDataResponseMessage<"devtools_update_feature_config", { config?: configuration[FeatureKeys]; id: FeatureKeys }>;
	};
};
export type DevToolsMessages = DevToolsMessageMappings[keyof DevToolsMessageMappings];
export type DevToolsMessageType = keyof DevToolsMessageMappings;
export type DevToolsRequestDataMessage<Type extends string, D = undefined, S extends MessageSource = "devtools"> = Prettify<
	BaseMessage<"request_data", S> & {
		data: D;
		extensionId: string;
		requestId: string;
		tabId: number;
		timestamp: number;
		type: Type;
	}
>;

export type ExtensionSendOnlyMessageMappings = {
	featureConfigChange: DataResponseMessage<"featureConfigChange", { config: configuration[FeatureKeys]; id: FeatureKeys }>;
	featureEnabledStateChange: DataResponseMessage<
		"featureEnabledStateChange",
		{ config: configuration[FeatureKeys]; enabled: boolean; id: FeatureKeys }
	>;
	featureMenuOpenTypeChange: DataResponseMessage<"featureMenuOpenTypeChange", { featureMenuOpenType: FeatureMenuOpenType }>;
	languageChange: DataResponseMessage<"languageChange", { language: AvailableLocales }>;
};
export type ExtensionSendOnlyMessages = ExtensionSendOnlyMessageMappings[keyof ExtensionSendOnlyMessageMappings];

export type FilterMessagesBySource<T extends Messages, S extends MessageSource> = {
	[K in keyof T]: Extract<T[K], { source: S }>;
};
export type MaybePromise<T> = Promise<T> | T;
// #endregion Constants
// #region Extension Messaging Types
export type MessageAction = "data_response" | "request_action" | "request_data" | "send_data";

export type MessageMappings = Prettify<{
	extensionURL: {
		request: RequestDataMessage<"extensionURL">;
		response: DataResponseMessage<"extensionURL", { extensionURL: string }>;
	};
	options: {
		request: RequestDataMessage<"options">;
		response: DataResponseMessage<"options", { options: configuration }>;
	};
	state: {
		request: RequestDataMessage<"state">;
		response: DataResponseMessage<"state", { [K in FeatureKeysWithState]: FeatureState[`state:${K}`] }>;
	};
}>;
export type Messages = MessageMappings[keyof MessageMappings];
export type MessageSource = "content" | "devtools" | "extension";
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
export type StorageChange<T> = {
	newValue: T;
	oldValue: T;
};
export type StorageChanges<T> = {
	[K in keyof T]?: StorageChange<T[K]>;
};
export type VideoDetails = {
	duration: number;
	progress: number;
	videoId: Nullable<string>;
};
// #endregion Configuration types

export type VideoId = Brand<string, "videoId">;
export type YouTubeNavigateStart = {
	pageType: string;
	url: string;
};
export type YouTubePlayerDiv = HTMLDivElement & YouTubePlayer;

export type YtActionEvent = CustomEvent<{
	actionName: string;
}>;
