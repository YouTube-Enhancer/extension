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
