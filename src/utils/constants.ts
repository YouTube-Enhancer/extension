import { z, ZodMiniEnum, ZodMiniObject } from "zod/v4-mini";

import type { AllButtonNames, ButtonPlacement, configuration, TypeToPartialZodSchema } from "../types";

import { deepDarkPreset } from "../deepDarkPresets";
import { availableLocales } from "../i18n/constants";
import {
	buttonNames,
	buttonPlacements,
	featureMenuOpenTypes,
	miniPlayerPositions,
	miniPlayerSizes,
	modifierKeys,
	onScreenDisplayColors,
	onScreenDisplayPositions,
	onScreenDisplayTypes,
	PlayerQualityFallbackStrategy,
	playlistLengthGetMethod,
	playlistWatchTimeGetMethod,
	screenshotFormats,
	screenshotTypes,
	videoHistoryResumeTypes,
	volumeBoostModes,
	youtubePlayerMaxSpeed,
	youtubePlayerMinSpeed,
	youtubePlayerQualityLevels,
	youtubePlayerSpeedStep
} from "../types";
import { isNewYouTubeVideoLayout } from "../utils/utilities";

export const deepDarkCssID = "yte-deep-dark-css";
export const outputFolderName = "dist";
export const defaultConfiguration = {
	automaticallyDisableAmbientMode: { enabled: false },
	automaticallyDisableAutoPlay: { enabled: false },
	automaticallyDisableClosedCaptions: { enabled: false },
	automaticallyEnableClosedCaptions: { enabled: false },
	automaticallyMaximizePlayer: { enabled: false },
	automaticallyShowMoreVideosOnEndScreen: { enabled: false },
	automaticTheaterMode: { enabled: false },
	blockNumberKeySeeking: { enabled: false },
	buttonPlacement: {
		copyTimestampUrlButton: "player_controls_right",
		decreasePlaybackSpeedButton: "player_controls_left",
		flipVideoHorizontalButton: "player_controls_left",
		flipVideoVerticalButton: "player_controls_left",
		forwardButton: "player_controls_right",
		hideEndScreenCardsButton: "player_controls_right",
		increasePlaybackSpeedButton: "player_controls_left",
		loopButton: "feature_menu",
		maximizePlayerButton: "feature_menu",
		miniPlayerButton: "feature_menu",
		monoToStereoButton: "player_controls_left",
		openTranscriptButton: "feature_menu",
		rewindButton: "player_controls_right",
		screenshotButton: "feature_menu",
		volumeBoostButton: "feature_menu"
	},
	copyTimestampUrlButton: { enabled: false },
	customCSS: { code: "", enabled: false },
	deepDarkCSS: {
		colors: {
			colorShadow: "#383c4a4d",
			dimmerText: "#cccccc",
			hoverBackground: "#4e5467",
			mainBackground: "#22242d",
			mainColor: "#367bf0",
			mainText: "#eeeeee",
			secondBackground: "#242730"
		},
		enabled: false,
		preset: "Deep-Dark"
	},
	defaultToOriginalAudioTrack: { enabled: false },
	featureMenu: { openType: "click" },
	flipVideoButtons: { flipHorizontal: { enabled: false }, flipVertical: { enabled: false } },
	forwardRewindButtons: { enabled: false, time: 5 },
	globalVolume: {
		enabled: false,
		volume: 25
	},
	hideArtificialIntelligenceSummary: { enabled: false },
	hideEndScreenCards: { enabled: false },
	hideEndScreenCardsButton: { enabled: false },
	hideLiveStreamChat: { enabled: false },
	hideMembersOnlyVideos: { enabled: false },
	hideOfficialArtistVideosFromHomePage: { enabled: false },
	hidePaidPromotionBanner: { enabled: false },
	hidePlayables: { enabled: false },
	hidePlaylistRecommendationsFromHomePage: { enabled: false },
	hidePosts: { enabled: false },
	hideScrollBar: { enabled: false },
	hideShorts: {
		channel: { enabled: false },
		home: { enabled: false },
		search: { enabled: false },
		sidebar: { enabled: false },
		videos: { enabled: false }
	},
	hideSidebarRecommendedVideos: { enabled: false },
	hideTranslateComment: { enabled: false },
	language: "en-US",
	loopButton: { enabled: false },
	maximizePlayerButton: { enabled: false },
	miniPlayer: { defaultPosition: "bottom_right", defaultSize: "400x225", enabled: false },
	miniPlayerButton: { enabled: false },
	monoToStereoButton: { enabled: false },
	onScreenDisplay: { color: "white", hideTime: 750, opacity: 75, padding: 5, position: "center", type: "text" },
	openSettingsOnMajorOrMinorVersionChange: true,
	openTranscriptButton: { enabled: false },
	openYouTubeSettingsOnHover: { enabled: false },
	pauseBackgroundPlayers: { enabled: false },
	playbackSpeedButtons: { enabled: false, speed: 0.25 },
	playerQuality: { enabled: false, fallbackStrategy: "lower", quality: "auto" },
	playerSpeed: { enabled: false, speed: 1 },
	playlistLength: { enabled: false, lengthGetMethod: "api", watchTimeGetMethod: "youtube" },
	playlistManagementButtons: { removeButton: { enabled: false }, resetButton: { enabled: false } },
	remainingTime: { enabled: false },
	rememberVolume: { enabled: false, shortsPageVolume: 100, watchPageVolume: 100 },
	removeRedirect: { enabled: false },
	restoreFullscreenScrolling: { enabled: false },
	saveToWatchLaterButton: { enabled: false },
	screenshotButton: { enabled: false, format: "png", saveAs: "file" },
	scrollWheelSpeedControl: { enabled: false, modifierKey: "altKey", steps: 0.25 },
	scrollWheelVolumeControl: { enabled: false, holdModifierKey: false, holdRightClick: false, modifierKey: "ctrlKey", steps: 5 },
	shareShortener: { enabled: false },
	shortsAutoScroll: { enabled: false },
	skipContinueWatching: { enabled: false },
	timestampPeek: { enabled: false },
	videoHistory: { enabled: false, resumeType: "prompt" },
	volumeBoost: { amount: 5, enabled: false, mode: "global" },
	youtubeDataApiV3Key: ""
} satisfies configuration;
type ConfigurationNumericConstraints = Partial<NumbersOnly<configuration>>;
type ConstraintTree = {
	[key: string]: ConstraintTree | NumberConstraint;
};
type IsEmptyObject<T> = keyof T extends never ? true : false;
type NumberConstraint = { max?: number; min?: number; step?: number };
/**
 * Recursively keeps ONLY numeric fields.
 * - number  -> NumberConstraint
 * - object  -> same object but filtered to numeric sub-keys
 * - anything else -> never (removed)
 */
type NumbersOnly<T> =
	T extends number ? NumberConstraint
	: T extends object ?
		Partial<
			RemoveEmpty<{
				[K in keyof T]: NumbersOnly<T[K]>;
			}>
		>
	:	never;
type RemoveEmpty<T> = {
	[K in keyof T as T[K] extends never ? never
	: T[K] extends object ?
		IsEmptyObject<T[K]> extends true ?
			never
		:	K
	:	K]: T[K];
};
export function validateNumbers<T extends Record<string, unknown>>(obj: T, constraints: ConstraintTree, path: (number | string)[] = []): void {
	const EPSILON = 1e-8;
	for (const key in constraints) {
		if (!Object.prototype.hasOwnProperty.call(constraints, key)) continue;
		const { [key]: rule } = constraints;
		const { [key]: value } = obj as Record<string, unknown>;
		const currentPath = [...path, key];
		// Nested object → recurse
		if (isConstraintTree(rule)) {
			if (value && typeof value === "object" && !Array.isArray(value)) {
				validateNumbers(value as Record<string, unknown>, rule, currentPath);
			}
			continue;
		}
		// Leaf constraint → validate number
		if (typeof value !== "number") continue;
		const { max, min, step } = rule;
		const label = currentPath.map(String).join(".");
		if (min !== undefined && value < min - EPSILON) {
			throw new Error(`${label} must be >= ${min}`);
		}
		if (max !== undefined && value > max + EPSILON) {
			throw new Error(`${label} must be <= ${max}`);
		}
		if (step !== undefined) {
			const base = min ?? 0;
			const remainder = (value - base) % step;
			if (!(Math.abs(remainder) < EPSILON || Math.abs(remainder - step) < EPSILON)) {
				throw new Error(`${label} must be in steps of ${step}`);
			}
		}
	}
}

function isConstraintTree(value: any): value is ConstraintTree {
	return typeof value === "object" && value !== null && !("min" in value || "max" in value || "step" in value);
}
export const numberConstraints: ConfigurationNumericConstraints = {
	globalVolume: { volume: { max: 100, min: 0 } },
	onScreenDisplay: { opacity: { max: 100, min: 1 } },
	playbackSpeedButtons: { speed: { max: 1.0, min: youtubePlayerSpeedStep, step: youtubePlayerSpeedStep } },
	playerSpeed: { speed: { max: youtubePlayerMaxSpeed, min: youtubePlayerMinSpeed, step: youtubePlayerSpeedStep } },
	rememberVolume: { shortsPageVolume: { max: 100, min: 0 }, watchPageVolume: { max: 100, min: 0 } },
	scrollWheelSpeedControl: { steps: { max: 1.0, min: 0.05, step: 0.05 } },
	scrollWheelVolumeControl: { steps: { max: 100, min: 1 } }
};
export const configurationImportSchema: TypeToPartialZodSchema<
	configuration,
	"buttonPlacement",
	{
		buttonPlacement: ZodMiniObject<{
			[K in AllButtonNames]: ZodMiniEnum<{ [K in ButtonPlacement]: K }>;
		}>;
	},
	true
> = z.object({
	automaticallyDisableAmbientMode: z.optional(z.object({ enabled: z.boolean() })),
	automaticallyDisableAutoPlay: z.optional(z.object({ enabled: z.boolean() })),
	automaticallyDisableClosedCaptions: z.optional(z.object({ enabled: z.boolean() })),
	automaticallyEnableClosedCaptions: z.optional(z.object({ enabled: z.boolean() })),
	automaticallyMaximizePlayer: z.optional(z.object({ enabled: z.boolean() })),
	automaticallyShowMoreVideosOnEndScreen: z.optional(z.object({ enabled: z.boolean() })),
	automaticTheaterMode: z.optional(z.object({ enabled: z.boolean() })),
	blockNumberKeySeeking: z.optional(z.object({ enabled: z.boolean() })),
	buttonPlacement: z.object(
		buttonNames.reduce(
			(acc, featureName) => ({
				...acc,
				[featureName]: z.optional(z.enum(buttonPlacements))
			}),
			{} as Record<AllButtonNames, ZodMiniEnum<{ [K in ButtonPlacement]: K }>>
		)
	),
	copyTimestampUrlButton: z.optional(z.object({ enabled: z.boolean() })),
	customCSS: z.optional(z.object({ code: z.string(), enabled: z.boolean() })),
	deepDarkCSS: z.optional(
		z.object({
			colors: z.object({
				colorShadow: z.string(),
				dimmerText: z.string(),
				hoverBackground: z.string(),
				mainBackground: z.string(),
				mainColor: z.string(),
				mainText: z.string(),
				secondBackground: z.string()
			}),
			enabled: z.boolean(),
			preset: z.enum(deepDarkPreset)
		})
	),
	defaultToOriginalAudioTrack: z.optional(z.object({ enabled: z.boolean() })),
	featureMenu: z.optional(z.object({ openType: z.enum(featureMenuOpenTypes) })),
	flipVideoButtons: z.optional(
		z.object({
			flipHorizontal: z.object({ enabled: z.boolean() }),
			flipVertical: z.object({ enabled: z.boolean() })
		})
	),
	forwardRewindButtons: z.optional(z.object({ enabled: z.boolean(), time: z.number() })),
	globalVolume: z.optional(z.object({ enabled: z.boolean(), volume: z.number() })),
	hideArtificialIntelligenceSummary: z.optional(z.object({ enabled: z.boolean() })),
	hideEndScreenCards: z.optional(z.object({ enabled: z.boolean() })),
	hideEndScreenCardsButton: z.optional(z.object({ enabled: z.boolean() })),
	hideLiveStreamChat: z.optional(z.object({ enabled: z.boolean() })),
	hideMembersOnlyVideos: z.optional(z.object({ enabled: z.boolean() })),
	hideOfficialArtistVideosFromHomePage: z.optional(z.object({ enabled: z.boolean() })),
	hidePaidPromotionBanner: z.optional(z.object({ enabled: z.boolean() })),
	hidePlayables: z.optional(z.object({ enabled: z.boolean() })),
	hidePlaylistRecommendationsFromHomePage: z.optional(z.object({ enabled: z.boolean() })),
	hidePosts: z.optional(z.object({ enabled: z.boolean() })),
	hideScrollBar: z.optional(z.object({ enabled: z.boolean() })),
	hideShorts: z.optional(
		z.object({
			channel: z.object({ enabled: z.boolean() }),
			home: z.object({ enabled: z.boolean() }),
			search: z.object({ enabled: z.boolean() }),
			sidebar: z.object({ enabled: z.boolean() }),
			videos: z.object({ enabled: z.boolean() })
		})
	),
	hideSidebarRecommendedVideos: z.optional(z.object({ enabled: z.boolean() })),
	hideTranslateComment: z.optional(z.object({ enabled: z.boolean() })),
	language: z.optional(z.enum(availableLocales)),
	loopButton: z.optional(z.object({ enabled: z.boolean() })),
	maximizePlayerButton: z.optional(z.object({ enabled: z.boolean() })),
	miniPlayer: z.optional(
		z.object({
			defaultPosition: z.enum(miniPlayerPositions),
			defaultSize: z.enum(miniPlayerSizes),
			enabled: z.boolean()
		})
	),
	miniPlayerButton: z.optional(z.object({ enabled: z.boolean() })),
	monoToStereoButton: z.optional(z.object({ enabled: z.boolean() })),
	onScreenDisplay: z.optional(
		z.object({
			color: z.enum(onScreenDisplayColors),
			hideTime: z.number(),
			opacity: z.number(),
			padding: z.number(),
			position: z.enum(onScreenDisplayPositions),
			type: z.enum(onScreenDisplayTypes)
		})
	),
	openSettingsOnMajorOrMinorVersionChange: z.optional(z.boolean()),
	openTranscriptButton: z.optional(z.object({ enabled: z.boolean() })),
	openYouTubeSettingsOnHover: z.optional(z.object({ enabled: z.boolean() })),
	pauseBackgroundPlayers: z.optional(z.object({ enabled: z.boolean() })),
	playbackSpeedAdjustment: z.optional(z.object({ steps: z.number() })),
	playbackSpeedButtons: z.optional(z.object({ enabled: z.boolean(), speed: z.number() })),
	playerQuality: z.optional(
		z.object({ enabled: z.boolean(), fallbackStrategy: z.enum(PlayerQualityFallbackStrategy), quality: z.enum(youtubePlayerQualityLevels) })
	),
	playerSpeed: z.optional(z.object({ enabled: z.boolean(), speed: z.number() })),
	playlistLength: z.optional(
		z.object({ enabled: z.boolean(), lengthGetMethod: z.enum(playlistLengthGetMethod), watchTimeGetMethod: z.enum(playlistWatchTimeGetMethod) })
	),
	playlistManagementButtons: z.optional(
		z.object({
			removeButton: z.object({ enabled: z.boolean() }),
			resetButton: z.object({ enabled: z.boolean() })
		})
	),
	remainingTime: z.optional(z.object({ enabled: z.boolean() })),
	rememberVolume: z.optional(z.object({ enabled: z.boolean(), shortsPageVolume: z.optional(z.number()), watchPageVolume: z.optional(z.number()) })),
	removeRedirect: z.optional(z.object({ enabled: z.boolean() })),
	restoreFullscreenScrolling: z.optional(z.object({ enabled: z.boolean() })),
	saveToWatchLaterButton: z.optional(z.object({ enabled: z.boolean() })),
	screenshotButton: z.optional(z.object({ enabled: z.boolean(), format: z.enum(screenshotFormats), saveAs: z.enum(screenshotTypes) })),
	scrollWheelSpeedControl: z.optional(z.object({ enabled: z.boolean(), modifierKey: z.enum(modifierKeys), steps: z.number() })),
	scrollWheelVolumeControl: z.optional(
		z.object({
			enabled: z.boolean(),
			holdModifierKey: z.boolean(),
			holdRightClick: z.boolean(),
			modifierKey: z.enum(modifierKeys),
			steps: z.number()
		})
	),
	shareShortener: z.optional(z.object({ enabled: z.boolean() })),
	shortsAutoScroll: z.optional(z.object({ enabled: z.boolean() })),
	skipContinueWatching: z.optional(z.object({ enabled: z.boolean() })),
	timestampPeek: z.optional(z.object({ enabled: z.boolean() })),
	videoHistory: z.optional(z.object({ enabled: z.boolean(), resumeType: z.enum(videoHistoryResumeTypes) })),
	volumeAdjustment: z.optional(z.object({ steps: z.number() })),
	volumeBoost: z.optional(z.object({ amount: z.number(), enabled: z.boolean(), mode: z.enum(volumeBoostModes) })),
	youtubeDataApiV3Key: z.optional(z.string())
});
export const DEV_MODE = process.env.__DEV__ === "true";
export const ENABLE_SOURCE_MAP = DEV_MODE === true ? "inline" : false;
export const YouTube_Enhancer_Public_Youtube_Data_API_V3_Key = "AIzaSyA_z2BR_HSfKsPvuttqjD_6AY60zgqbm5k";
export const getCommentsPanelSelector = () =>
	isNewYouTubeVideoLayout() ?
		"ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-comments-section'] ytd-item-section-renderer[section-identifier='comment-item-section']"
	:	"ytd-comments.ytd-watch-flexy ytd-item-section-renderer[section-identifier='comment-item-section']";
export const commentsHeaderSelector = "ytd-comments div#header";
export const engagementPanelVisibility = ["ENGAGEMENT_PANEL_VISIBILITY_HIDDEN", "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"] as const;
export type EngagementPanelVisibility = (typeof engagementPanelVisibility)[number];
