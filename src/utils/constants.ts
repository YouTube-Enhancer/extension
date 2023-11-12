import z from "zod";
import type { PartialConfigurationToZodSchema, configuration } from "../@types";
import { availableLocales } from "../i18n/index";
import {
	screenshotFormat,
	screenshotType,
	onScreenDisplayColor,
	onScreenDisplayType,
	onScreenDisplayPosition,
	youtubePlayerQualityLevel
} from "../@types";
export const outputFolderName = "dist";
export const defaultConfiguration = {
	// Options
	// General
	enable_scroll_wheel_volume_control: false,
	enable_remember_last_volume: false,
	enable_automatically_set_quality: false,
	enable_forced_playback_speed: false,
	enable_volume_boost: false,
	enable_screenshot_button: false,
	enable_maximize_player_button: false,
	enable_video_history: false,
	enable_remaining_time: false,
	enable_loop_button: false,
	enable_hide_scrollbar: false,
	screenshot_save_as: "file",
	screenshot_format: "png",
	// Images
	osd_display_color: "white",
	osd_display_type: "text",
	osd_display_position: "center",
	osd_display_hide_time: 750,
	osd_display_padding: 5,
	osd_display_opacity: 75,
	volume_adjustment_steps: 5,
	volume_boost_amount: 1,
	player_quality: "auto",
	player_speed: 1,
	language: "en-US"
} satisfies configuration;

export const configurationImportSchema: PartialConfigurationToZodSchema<configuration> = z.object({
	enable_scroll_wheel_volume_control: z.boolean().optional(),
	enable_remember_last_volume: z.boolean().optional(),
	enable_automatically_set_quality: z.boolean().optional(),
	enable_forced_playback_speed: z.boolean().optional(),
	enable_volume_boost: z.boolean().optional(),
	enable_screenshot_button: z.boolean().optional(),
	enable_maximize_player_button: z.boolean().optional(),
	enable_video_history: z.boolean().optional(),
	enable_remaining_time: z.boolean().optional(),
	enable_loop_button: z.boolean().optional(),
	enable_hide_scrollbar: z.boolean().optional(),
	screenshot_save_as: z.enum(screenshotType).optional(),
	screenshot_format: z.enum(screenshotFormat).optional(),
	osd_display_color: z.enum(onScreenDisplayColor).optional(),
	osd_display_type: z.enum(onScreenDisplayType).optional(),
	osd_display_position: z.enum(onScreenDisplayPosition).optional(),
	osd_display_hide_time: z.number().optional(),
	osd_display_padding: z.number().optional(),
	osd_display_opacity: z.number().min(1).max(100).optional(),
	volume_adjustment_steps: z.number().min(1).max(100).optional(),
	volume_boost_amount: z.number().optional(),
	player_quality: z.enum(youtubePlayerQualityLevel).optional(),
	player_speed: z.number().min(0.25).max(4.0).step(0.25).optional(),
	remembered_volume: z.number().optional(),
	language: z.enum(availableLocales).optional()
});
