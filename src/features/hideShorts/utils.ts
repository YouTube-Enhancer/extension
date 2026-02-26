import { modifyElementClassList } from "@/src/utils/utilities";

export type ShortsSection = "channel" | "home" | "search" | "sidebar" | "videos";

export type ShortsVisibilitySettings = Record<ShortsSection, boolean>;

const shortsClassMap: Record<ShortsSection, string> = {
	channel: "yte-hide-shorts-channel",
	home: "yte-hide-shorts-home",
	search: "yte-hide-shorts-search",
	sidebar: "yte-hide-shorts-sidebar",
	videos: "yte-hide-shorts-videos"
};

export const applyShortsVisibility = (settings: ShortsVisibilitySettings): void => {
	for (const key of Object.keys(shortsClassMap)) {
		modifyElementClassList(settings[key] ? "add" : "remove", {
			className: shortsClassMap[key],
			element: document.body
		});
	}
};
