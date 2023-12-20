import z from "zod";

import type { TypeToPartialZodSchema, configuration } from "../types";

import { availableLocales } from "../i18n/index";
import {
	featureMenuOpenType,
	modifierKey,
	onScreenDisplayColor,
	onScreenDisplayPosition,
	onScreenDisplayType,
	screenshotFormat,
	screenshotType,
	volumeBoostMode,
	youtubePlayerQualityLevel
} from "../types";
export const outputFolderName = "dist";
export const defaultConfiguration = {
	enable_automatic_theater_mode: false,
	enable_automatically_set_quality: false,
	enable_forced_playback_speed: false,
	enable_hide_scrollbar: false,
	enable_loop_button: false,
	enable_maximize_player_button: false,
	enable_open_transcript_button: false,
	enable_remaining_time: false,
	enable_remember_last_volume: false,
	enable_screenshot_button: false,
	enable_scroll_wheel_volume_control: false,
	enable_scroll_wheel_volume_control_hold_modifier_key: false,
	enable_scroll_wheel_volume_control_hold_right_click: false,
	enable_video_history: false,
	enable_volume_boost: false,
	feature_menu_open_type: "hover",
	language: "en-US",
	osd_display_color: "white",
	osd_display_hide_time: 750,
	osd_display_opacity: 75,
	osd_display_padding: 5,
	osd_display_position: "center",
	osd_display_type: "text",
	player_quality: "auto",
	player_speed: 1,
	remembered_volumes: {
		shortsPageVolume: 100,
		watchPageVolume: 100
	},
	screenshot_format: "png",
	screenshot_save_as: "file",
	scroll_wheel_volume_control_modifier_key: "ctrlKey",
	volume_adjustment_steps: 5,
	volume_boost_amount: 1,
	volume_boost_mode: "global"
} satisfies configuration;
export const configurationImportSchema: TypeToPartialZodSchema<configuration> = z.object({
	enable_automatic_theater_mode: z.boolean().optional(),
	enable_automatically_set_quality: z.boolean().optional(),
	enable_forced_playback_speed: z.boolean().optional(),
	enable_hide_scrollbar: z.boolean().optional(),
	enable_loop_button: z.boolean().optional(),
	enable_maximize_player_button: z.boolean().optional(),
	enable_open_transcript_button: z.boolean().optional(),
	enable_remaining_time: z.boolean().optional(),
	enable_remember_last_volume: z.boolean().optional(),
	enable_screenshot_button: z.boolean().optional(),
	enable_scroll_wheel_volume_control: z.boolean().optional(),
	enable_scroll_wheel_volume_control_hold_modifier_key: z.boolean().optional(),
	enable_scroll_wheel_volume_control_hold_right_click: z.boolean().optional(),
	enable_video_history: z.boolean().optional(),
	enable_volume_boost: z.boolean().optional(),
	feature_menu_open_type: z.enum(featureMenuOpenType).optional(),
	language: z.enum(availableLocales).optional(),
	osd_display_color: z.enum(onScreenDisplayColor).optional(),
	osd_display_hide_time: z.number().optional(),
	osd_display_opacity: z.number().min(1).max(100).optional(),
	osd_display_padding: z.number().optional(),
	osd_display_position: z.enum(onScreenDisplayPosition).optional(),
	osd_display_type: z.enum(onScreenDisplayType).optional(),
	player_quality: z.enum(youtubePlayerQualityLevel).optional(),
	player_speed: z.number().min(0.25).max(4.0).step(0.25).optional(),
	remembered_volumes: z
		.object({
			shortsPageVolume: z.number().min(0).max(100).optional(),
			watchPageVolume: z.number().min(0).max(100).optional()
		})
		.optional(),
	screenshot_format: z.enum(screenshotFormat).optional(),
	screenshot_save_as: z.enum(screenshotType).optional(),
	scroll_wheel_volume_control_modifier_key: z.enum(modifierKey).optional(),
	volume_adjustment_steps: z.number().min(1).max(100).optional(),
	volume_boost_amount: z.number().optional(),
	volume_boost_mode: z.enum(volumeBoostMode).optional()
});
