import type { configuration } from "../types";

export const outputFolderName = "dist";
export const defaultConfiguration = {
	// Options
	// General
	enable_scroll_wheel_volume_control: true,
	enable_remember_last_volume: true,
	enable_automatically_set_quality: true,
	enable_forced_playback_speed: false,
	enable_volume_boost: false,
	enable_screenshot_button: false,
	enable_maximize_player_button: false,
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
	volume_boost_amount: 1
} satisfies configuration;
export const YoutubePlayerQualityLabels = ["144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "2160p", "2880p", "4320p", "auto"] as const;
export const YoutubePlayerQualityLevels = [
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
export const YoutubePlayerSpeedRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
