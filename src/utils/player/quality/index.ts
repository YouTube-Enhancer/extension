import type { Nullable } from "@/src/types";

import { type PlayerQualityFallbackStrategy, type YoutubePlayerQualityLevel, youtubePlayerQualityLevels } from "@/src/features/playerQuality/types";

export function chooseClosestQuality(
	selectedQuality: YoutubePlayerQualityLevel,
	availableQualities: YoutubePlayerQualityLevel[],
	fallbackStrategy: PlayerQualityFallbackStrategy
): Nullable<YoutubePlayerQualityLevel> {
	if (availableQualities.length === 0) return null;
	availableQualities = availableQualities.filter((q) => q !== "auto");
	if (availableQualities.includes(selectedQuality)) return selectedQuality;
	const selectedIndex = youtubePlayerQualityLevels.indexOf(selectedQuality);
	const mapped = availableQualities.map((quality) => ({
		index: youtubePlayerQualityLevels.indexOf(quality),
		quality
	}));
	if (mapped.length === 0) return null;
	const higher = mapped.filter((q) => q.index > selectedIndex).sort((a, b) => a.index - b.index);
	const lower = mapped.filter((q) => q.index < selectedIndex).sort((a, b) => b.index - a.index);
	if (fallbackStrategy === "higher") {
		return higher[0]?.quality ?? lower[0]?.quality ?? null;
	} else {
		return lower[0]?.quality ?? higher[0]?.quality ?? null;
	}
}
