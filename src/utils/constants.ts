import type { configuration } from "../types";

export const outputFolderName = "dist";
export const defaultConfiguration = {
	// Options
	// General
	enable_scroll_wheel_volume_control: true,
	enable_remember_last_volume: true,
	enable_automatically_set_quality: true,
	// Images
	osd_display_color: "white",
	osd_display_type: "text",
	osd_display_position: "center",
	osd_display_opacity: 75,
	volume_adjustment_steps: 5
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
