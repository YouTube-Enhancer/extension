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
	youtubePlayerMinSpeed,
	youtubePlayerQualityLevels,
	youtubePlayerSpeedStep
} from "../types";
import { isNewYouTubeVideoLayout } from "../utils/utilities";

export const deepDarkCssID = "yte-deep-dark-css";
export const outputFolderName = "dist";
export const defaultConfiguration = {
	button_placements: {
		copyTimestampUrlButton: "player_controls_right",
		decreasePlaybackSpeedButton: "player_controls_left",
		forwardButton: "player_controls_right",
		hideEndScreenCardsButton: "player_controls_right",
		increasePlaybackSpeedButton: "player_controls_left",
		loopButton: "feature_menu",
		maximizePlayerButton: "feature_menu",
		miniPlayerButton: "feature_menu",
		openTranscriptButton: "feature_menu",
		rewindButton: "player_controls_right",
		screenshotButton: "feature_menu",
		volumeBoostButton: "feature_menu"
	},
	custom_css_code: "",
	deep_dark_custom_theme_colors: {
		colorShadow: "#383c4a4d",
		dimmerText: "#cccccc",
		hoverBackground: "#4e5467",
		mainBackground: "#22242d",
		mainColor: "#367bf0",
		mainText: "#eeeeee",
		secondBackground: "#242730"
	},
	deep_dark_preset: "Deep-Dark",
	enable_automatic_theater_mode: false,
	enable_automatically_disable_ambient_mode: false,
	enable_automatically_disable_autoplay: false,
	enable_automatically_disable_closed_captions: false,
	enable_automatically_enable_closed_captions: false,
	enable_automatically_maximize_player: false,
	enable_automatically_set_quality: false,
	enable_automatically_show_more_videos_on_end_screen: false,
	enable_comments_mini_player: false,
	enable_comments_mini_player_button: false,
	enable_copy_timestamp_url_button: false,
	enable_custom_css: false,
	enable_deep_dark_theme: false,
	enable_default_to_original_audio_track: false,
	enable_forced_playback_speed: false,
	enable_forward_rewind_buttons: false,
	enable_global_volume: false,
	enable_hide_artificial_intelligence_summary: false,
	enable_hide_end_screen_cards: false,
	enable_hide_end_screen_cards_button: false,
	enable_hide_live_stream_chat: false,
	enable_hide_members_only_videos: false,
	enable_hide_official_artist_videos_from_home_page: false,
	enable_hide_paid_promotion_banner: false,
	enable_hide_playables: false,
	enable_hide_playlist_recommendations_from_home_page: false,
	enable_hide_scrollbar: false,
	enable_hide_shorts: false,
	enable_hide_sidebar_recommended_videos: false,
	enable_hide_translate_comment: false,
	enable_loop_button: false,
	enable_maximize_player_button: false,
	enable_open_transcript_button: false,
	enable_open_youtube_settings_on_hover: false,
	enable_pausing_background_players: false,
	enable_playback_speed_buttons: false,
	enable_playlist_length: false,
	enable_playlist_remove_button: false,
	enable_playlist_reset_button: false,
	enable_redirect_remover: false,
	enable_remaining_time: false,
	enable_remember_last_volume: false,
	enable_restore_fullscreen_scrolling: false,
	enable_save_to_watch_later_button: false,
	enable_screenshot_button: false,
	enable_scroll_wheel_speed_control: false,
	enable_scroll_wheel_volume_control: false,
	enable_scroll_wheel_volume_control_hold_modifier_key: false,
	enable_scroll_wheel_volume_control_hold_right_click: false,
	enable_share_shortener: false,
	enable_shorts_auto_scroll: false,
	enable_skip_continue_watching: false,
	enable_timestamp_peek: false,
	enable_video_history: false,
	enable_volume_boost: false,
	feature_menu_open_type: "hover",
	forward_rewind_buttons_time: 5,
	global_volume: 25,
	language: "en-US",
	mini_player_default_position: "bottom_right",
	mini_player_default_size: "400x225",
	open_settings_on_major_or_minor_version_change: true,
	osd_display_color: "white",
	osd_display_hide_time: 750,
	osd_display_opacity: 75,
	osd_display_padding: 5,
	osd_display_position: "center",
	osd_display_type: "text",
	playback_buttons_speed: 0.25,
	player_quality: "auto",
	player_quality_fallback_strategy: "lower",
	player_speed: 1,
	playlist_length_get_method: "api",
	playlist_watch_time_get_method: "youtube",
	remembered_volumes: {
		shortsPageVolume: 100,
		watchPageVolume: 100
	},
	screenshot_format: "png",
	screenshot_save_as: "file",
	scroll_wheel_speed_control_modifier_key: "altKey",
	scroll_wheel_volume_control_modifier_key: "ctrlKey",
	speed_adjustment_steps: 0.25,
	video_history_resume_type: "prompt",
	volume_adjustment_steps: 5,
	volume_boost_amount: 5,
	volume_boost_mode: "global",
	youtube_data_api_v3_key: ""
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
		RemoveEmpty<{
			[K in keyof T]: NumbersOnly<T[K]>;
		}>
	:	never;
type RemoveEmpty<T> = {
	[K in keyof T as T[K] extends never ? never
	: T[K] extends object ?
		IsEmptyObject<T[K]> extends true ?
			never
		:	K
	:	K]: T[K];
};
export function validateNumbers(obj: configuration, constraints: ConstraintTree, path: (number | string)[] = []): void {
	for (const key of Object.keys(constraints) as (keyof typeof constraints)[]) {
		const { [key]: rule } = constraints;
		const value = (obj as any)?.[key];
		const currentPath = [...path, key];

		// Nested object → recurse
		if (isConstraintTree(rule)) {
			if (value && typeof value === "object") {
				validateNumbers(value, rule, currentPath);
			}
			continue;
		}
		// Leaf constraint → validate number
		if (typeof value !== "number") continue;
		const { max, min, step } = rule;
		const label = currentPath.map(String).join(".");
		if (min !== undefined && value < min) {
			throw new Error(`${label} must be >= ${min}`);
		}
		if (max !== undefined && value > max) {
			throw new Error(`${label} must be <= ${max}`);
		}
		if (step !== undefined && (value - (min ?? 0)) % step !== 0) {
			throw new Error(`${label} must be in steps of ${step}`);
		}
	}
}

function isConstraintTree(value: any): value is ConstraintTree {
	return typeof value === "object" && value !== null && !("min" in value || "max" in value || "step" in value);
}
export const numberConstraints: ConfigurationNumericConstraints = {
	global_volume: { max: 100, min: 0 },
	osd_display_opacity: { max: 100, min: 1 },
	playback_buttons_speed: { max: 1.0, min: youtubePlayerSpeedStep, step: youtubePlayerSpeedStep },
	player_speed: { max: 16.0, min: youtubePlayerMinSpeed, step: youtubePlayerSpeedStep },
	remembered_volumes: { shortsPageVolume: { max: 100, min: 0 }, watchPageVolume: { max: 100, min: 0 } },
	speed_adjustment_steps: { max: 1.0, min: 0.05, step: 0.05 },
	volume_adjustment_steps: { max: 100, min: 1 }
};
export const configurationImportSchema: TypeToPartialZodSchema<
	configuration,
	"button_placements",
	{
		button_placements: ZodMiniObject<{
			[K in AllButtonNames]: ZodMiniEnum<{ [K in ButtonPlacement]: K }>;
		}>;
	},
	true
> = z.object({
	button_placements: z.object({
		...buttonNames.reduce(
			(acc, featureName) => ({ ...acc, [featureName]: z.enum(buttonPlacements) }),
			{} as Record<AllButtonNames, ZodMiniEnum<{ [K in ButtonPlacement]: K }>>
		)
	}),
	custom_css_code: z.optional(z.string()),
	deep_dark_custom_theme_colors: z.optional(
		z.object({
			colorShadow: z.string(),
			dimmerText: z.string(),
			hoverBackground: z.string(),
			mainBackground: z.string(),
			mainColor: z.string(),
			mainText: z.string(),
			secondBackground: z.string()
		})
	),
	deep_dark_preset: z.optional(z.enum(deepDarkPreset)),
	enable_automatic_theater_mode: z.optional(z.boolean()),
	enable_automatically_disable_ambient_mode: z.optional(z.boolean()),
	enable_automatically_disable_autoplay: z.optional(z.boolean()),
	enable_automatically_disable_closed_captions: z.optional(z.boolean()),
	enable_automatically_enable_closed_captions: z.optional(z.boolean()),
	enable_automatically_maximize_player: z.optional(z.boolean()),
	enable_automatically_set_quality: z.optional(z.boolean()),
	enable_automatically_show_more_videos_on_end_screen: z.optional(z.boolean()),
	enable_comments_mini_player: z.optional(z.boolean()),
	enable_comments_mini_player_button: z.optional(z.boolean()),
	enable_copy_timestamp_url_button: z.optional(z.boolean()),
	enable_custom_css: z.optional(z.boolean()),
	enable_deep_dark_theme: z.optional(z.boolean()),
	enable_default_to_original_audio_track: z.optional(z.boolean()),
	enable_forced_playback_speed: z.optional(z.boolean()),
	enable_forward_rewind_buttons: z.optional(z.boolean()),
	enable_global_volume: z.optional(z.boolean()),
	enable_hide_artificial_intelligence_summary: z.optional(z.boolean()),
	enable_hide_end_screen_cards: z.optional(z.boolean()),
	enable_hide_end_screen_cards_button: z.optional(z.boolean()),
	enable_hide_live_stream_chat: z.optional(z.boolean()),
	enable_hide_members_only_videos: z.optional(z.boolean()),
	enable_hide_official_artist_videos_from_home_page: z.optional(z.boolean()),
	enable_hide_paid_promotion_banner: z.optional(z.boolean()),
	enable_hide_playables: z.optional(z.boolean()),
	enable_hide_playlist_recommendations_from_home_page: z.optional(z.boolean()),
	enable_hide_scrollbar: z.optional(z.boolean()),
	enable_hide_shorts: z.optional(z.boolean()),
	enable_hide_sidebar_recommended_videos: z.optional(z.boolean()),
	enable_hide_translate_comment: z.optional(z.boolean()),
	enable_loop_button: z.optional(z.boolean()),
	enable_maximize_player_button: z.optional(z.boolean()),
	enable_open_transcript_button: z.optional(z.boolean()),
	enable_open_youtube_settings_on_hover: z.optional(z.boolean()),
	enable_pausing_background_players: z.optional(z.boolean()),
	enable_playback_speed_buttons: z.optional(z.boolean()),
	enable_playlist_length: z.optional(z.boolean()),
	enable_playlist_remove_button: z.optional(z.boolean()),
	enable_playlist_reset_button: z.optional(z.boolean()),
	enable_redirect_remover: z.optional(z.boolean()),
	enable_remaining_time: z.optional(z.boolean()),
	enable_remember_last_volume: z.optional(z.boolean()),
	enable_restore_fullscreen_scrolling: z.optional(z.boolean()),
	enable_save_to_watch_later_button: z.optional(z.boolean()),
	enable_screenshot_button: z.optional(z.boolean()),
	enable_scroll_wheel_speed_control: z.optional(z.boolean()),
	enable_scroll_wheel_volume_control: z.optional(z.boolean()),
	enable_scroll_wheel_volume_control_hold_modifier_key: z.optional(z.boolean()),
	enable_scroll_wheel_volume_control_hold_right_click: z.optional(z.boolean()),
	enable_share_shortener: z.optional(z.boolean()),
	enable_shorts_auto_scroll: z.optional(z.boolean()),
	enable_skip_continue_watching: z.optional(z.boolean()),
	enable_timestamp_peek: z.optional(z.boolean()),
	enable_video_history: z.optional(z.boolean()),
	enable_volume_boost: z.optional(z.boolean()),
	feature_menu_open_type: z.optional(z.enum(featureMenuOpenTypes)),
	forward_rewind_buttons_time: z.optional(z.number()),
	global_volume: z.optional(z.number()),
	language: z.optional(z.enum(availableLocales)),
	mini_player_default_position: z.optional(z.enum(miniPlayerPositions)),
	mini_player_default_size: z.optional(z.enum(miniPlayerSizes)),
	open_settings_on_major_or_minor_version_change: z.optional(z.boolean()),
	osd_display_color: z.optional(z.enum(onScreenDisplayColors)),
	osd_display_hide_time: z.optional(z.number()),
	osd_display_opacity: z.optional(z.number()),
	osd_display_padding: z.optional(z.number()),
	osd_display_position: z.optional(z.enum(onScreenDisplayPositions)),
	osd_display_type: z.optional(z.enum(onScreenDisplayTypes)),
	playback_buttons_speed: z.optional(z.number()),
	player_quality: z.optional(z.enum(youtubePlayerQualityLevels)),
	player_quality_fallback_strategy: z.optional(z.enum(PlayerQualityFallbackStrategy)),
	player_speed: z.optional(z.number()),
	playlist_length_get_method: z.optional(z.enum(playlistLengthGetMethod)),
	playlist_watch_time_get_method: z.optional(z.enum(playlistWatchTimeGetMethod)),
	remembered_volumes: z.optional(
		z.object({
			shortsPageVolume: z.optional(z.number()),
			watchPageVolume: z.optional(z.number())
		})
	),
	screenshot_format: z.optional(z.enum(screenshotFormats)),
	screenshot_save_as: z.optional(z.enum(screenshotTypes)),
	scroll_wheel_speed_control_modifier_key: z.optional(z.enum(modifierKeys)),
	scroll_wheel_volume_control_modifier_key: z.optional(z.enum(modifierKeys)),
	speed_adjustment_steps: z.optional(z.number()),
	video_history_resume_type: z.optional(z.enum(videoHistoryResumeTypes)),
	volume_adjustment_steps: z.optional(z.number()),
	volume_boost_amount: z.optional(z.number()),
	volume_boost_mode: z.optional(z.enum(volumeBoostModes)),
	youtube_data_api_v3_key: z.optional(z.string())
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
