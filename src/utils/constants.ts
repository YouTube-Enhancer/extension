import z, { ZodEnum, ZodObject } from "zod";

import type { AllButtonNames, ButtonPlacement, TypeToPartialZodSchema, configuration } from "../types";

import { deepDarkPreset } from "../deepDarkPresets";
import { availableLocales } from "../i18n/index";
import {
	PlayerQualityFallbackStrategy,
	buttonNames,
	buttonPlacements,
	featureMenuOpenTypes,
	modifierKeys,
	onScreenDisplayColors,
	onScreenDisplayPositions,
	onScreenDisplayTypes,
	screenshotFormats,
	screenshotTypes,
	videoHistoryResumeTypes,
	volumeBoostModes,
	youtubePlayerQualityLevels
} from "../types";

export const outputFolderName = "dist";
export const defaultConfiguration = {
	button_placements: {
		decreasePlaybackSpeedButton: "player_controls_left",
		forwardButton: "player_controls_right",
		hideEndScreenCardsButton: "player_controls_right",
		increasePlaybackSpeedButton: "player_controls_left",
		loopButton: "feature_menu",
		maximizePlayerButton: "feature_menu",
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
	enable_automatically_set_quality: false,
	enable_custom_css: false,
	enable_deep_dark_theme: false,
	enable_forced_playback_speed: false,
	enable_forward_rewind_buttons: false,
	enable_hide_end_screen_cards: false,
	enable_hide_end_screen_cards_button: false,
	enable_hide_live_stream_chat: false,
	enable_hide_scrollbar: false,
	enable_hide_shorts: false,
	enable_hide_translate_comment: false,
	enable_loop_button: false,
	enable_maximize_player_button: false,
	enable_open_transcript_button: false,
	enable_open_youtube_settings_on_hover: false,
	enable_pausing_background_players: false,
	enable_playback_speed_buttons: false,
	enable_redirect_remover: false,
	enable_remaining_time: false,
	enable_remember_last_volume: false,
	enable_screenshot_button: false,
	enable_scroll_wheel_speed_control: false,
	enable_scroll_wheel_volume_control: false,
	enable_scroll_wheel_volume_control_hold_modifier_key: false,
	enable_scroll_wheel_volume_control_hold_right_click: false,
	enable_share_shortener: false,
	enable_shorts_auto_scroll: false,
	enable_skip_continue_watching: false,
	enable_video_history: false,
	enable_volume_boost: false,
	feature_menu_open_type: "hover",
	forward_rewind_buttons_time: 5,
	language: "en-US",
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
	volume_boost_mode: "global"
} satisfies configuration;
export const configurationImportSchema: TypeToPartialZodSchema<
	configuration,
	"button_placements",
	{
		button_placements: ZodObject<{
			[K in AllButtonNames]: ZodEnum<[ButtonPlacement]>;
		}>;
	},
	true
> = z.object({
	button_placements: z.object({
		...buttonNames.reduce(
			(acc, featureName) => ({ ...acc, [featureName]: z.enum(buttonPlacements).optional() }),
			{} as Record<AllButtonNames, ZodEnum<[ButtonPlacement]>>
		)
	}),
	custom_css_code: z.string().optional(),
	deep_dark_custom_theme_colors: z
		.object({
			colorShadow: z.string(),
			dimmerText: z.string(),
			hoverBackground: z.string(),
			mainBackground: z.string(),
			mainColor: z.string(),
			mainText: z.string(),
			secondBackground: z.string()
		})
		.optional(),
	deep_dark_preset: z.enum(deepDarkPreset).optional(),
	enable_automatic_theater_mode: z.boolean().optional(),
	enable_automatically_set_quality: z.boolean().optional(),
	enable_custom_css: z.boolean().optional(),
	enable_deep_dark_theme: z.boolean().optional(),
	enable_forced_playback_speed: z.boolean().optional(),
	enable_forward_rewind_buttons: z.boolean().optional(),
	enable_hide_end_screen_cards: z.boolean().optional(),
	enable_hide_end_screen_cards_button: z.boolean().optional(),
	enable_hide_live_stream_chat: z.boolean().optional(),
	enable_hide_scrollbar: z.boolean().optional(),
	enable_hide_shorts: z.boolean().optional(),
	enable_hide_translate_comment: z.boolean().optional(),
	enable_loop_button: z.boolean().optional(),
	enable_maximize_player_button: z.boolean().optional(),
	enable_open_transcript_button: z.boolean().optional(),
	enable_open_youtube_settings_on_hover: z.boolean().optional(),
	enable_pausing_background_players: z.boolean().optional(),
	enable_playback_speed_buttons: z.boolean().optional(),
	enable_redirect_remover: z.boolean().optional(),
	enable_remaining_time: z.boolean().optional(),
	enable_remember_last_volume: z.boolean().optional(),
	enable_screenshot_button: z.boolean().optional(),
	enable_scroll_wheel_speed_control: z.boolean().optional(),
	enable_scroll_wheel_volume_control: z.boolean().optional(),
	enable_scroll_wheel_volume_control_hold_modifier_key: z.boolean().optional(),
	enable_scroll_wheel_volume_control_hold_right_click: z.boolean().optional(),
	enable_share_shortener: z.boolean().optional(),
	enable_shorts_auto_scroll: z.boolean().optional(),
	enable_skip_continue_watching: z.boolean().optional(),
	enable_video_history: z.boolean().optional(),
	enable_volume_boost: z.boolean().optional(),
	feature_menu_open_type: z.enum(featureMenuOpenTypes).optional(),
	forward_rewind_buttons_time: z.number().optional(),
	language: z.enum(availableLocales).optional(),
	osd_display_color: z.enum(onScreenDisplayColors).optional(),
	osd_display_hide_time: z.number().optional(),
	osd_display_opacity: z.number().min(1).max(100).optional(),
	osd_display_padding: z.number().optional(),
	osd_display_position: z.enum(onScreenDisplayPositions).optional(),
	osd_display_type: z.enum(onScreenDisplayTypes).optional(),
	playback_buttons_speed: z.number().min(0.25).max(4.0).step(0.25).optional(),
	player_quality: z.enum(youtubePlayerQualityLevels).optional(),
	player_quality_fallback_strategy: z.enum(PlayerQualityFallbackStrategy).optional(),
	player_speed: z.number().min(0.25).max(4.0).step(0.25).optional(),
	remembered_volumes: z
		.object({
			shortsPageVolume: z.number().min(0).max(100).optional(),
			watchPageVolume: z.number().min(0).max(100).optional()
		})
		.optional(),
	screenshot_format: z.enum(screenshotFormats).optional(),
	screenshot_save_as: z.enum(screenshotTypes).optional(),
	scroll_wheel_speed_control_modifier_key: z.enum(modifierKeys).optional(),
	scroll_wheel_volume_control_modifier_key: z.enum(modifierKeys).optional(),
	speed_adjustment_steps: z.number().min(0.05).max(1.0).step(0.05).optional(),
	video_history_resume_type: z.enum(videoHistoryResumeTypes).optional(),
	volume_adjustment_steps: z.number().min(1).max(100).optional(),
	volume_boost_amount: z.number().optional(),
	volume_boost_mode: z.enum(volumeBoostModes).optional()
});
export const DEV_MODE = process.env.__DEV__ === "true";
export const ENABLE_SOURCE_MAP = DEV_MODE === true ? "inline" : false;
