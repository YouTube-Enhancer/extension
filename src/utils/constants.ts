import z from "zod";
import type { TypeToZod, configuration } from "../types";
import {
	screenshotFormat,
	screenshotType,
	onScreenDisplayColor,
	onScreenDisplayType,
	onScreenDisplayPosition,
	youtubePlayerQualityLevel
} from "../types";
export const outputFolderName = "dist";
export const defaultConfiguration = {
	// Options
	// General
	enable_scroll_wheel_volume_control: true,
	enable_remember_last_volume: true,
	enable_automatically_set_quality: false,
	enable_forced_playback_speed: false,
	enable_volume_boost: false,
	enable_screenshot_button: false,
	enable_maximize_player_button: false,
	enable_video_history: false,
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
	player_speed: 1
} satisfies configuration;

export const configurationSchemaProperties = {
	enable_scroll_wheel_volume_control: z.boolean(),
	enable_remember_last_volume: z.boolean(),
	enable_automatically_set_quality: z.boolean(),
	enable_forced_playback_speed: z.boolean(),
	enable_volume_boost: z.boolean(),
	enable_screenshot_button: z.boolean(),
	enable_maximize_player_button: z.boolean(),
	enable_video_history: z.boolean(),
	screenshot_save_as: z.enum(screenshotType),
	screenshot_format: z.enum(screenshotFormat),
	osd_display_color: z.enum(onScreenDisplayColor),
	osd_display_type: z.enum(onScreenDisplayType),
	osd_display_position: z.enum(onScreenDisplayPosition),
	osd_display_hide_time: z.number(),
	osd_display_padding: z.number(),
	osd_display_opacity: z.number().min(1).max(100),
	volume_adjustment_steps: z.number().min(1).max(100),
	volume_boost_amount: z.number(),
	player_quality: z.enum(youtubePlayerQualityLevel),
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore Figure out this error
	player_speed: z.number().min(0.25).max(4.0).step(0.25)
} satisfies TypeToZod<configuration>;
export const configurationSchema = z.object(configurationSchemaProperties);
