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
export const FpsPreference = ["default", "higher", "lower"] as const;
export type FpsPreference = (typeof FpsPreference)[number];
/**
 * Parts of YouTube's player API that the `youtube-player` typings do not cover. `getPreferredQuality()`
 * returns the quality the player was last *asked* to play ("auto" when nothing is pinned) and is updated
 * synchronously by `setPlaybackQualityRange()`, which is the call behind both YouTube's quality menu and the
 * public player API. Optional because older players do not expose it.
 */
export type PlayerQualityRequestApi = {
	getPreferredQuality?: () => string;
};
