import type { PageType } from "@/src/features/_registry/types";
import type { ButtonPlacement } from "@/src/types";

import { buttonContainerId } from "@/src/features/buttonPlacement/utils";

export const placementSelectors = {
	below_player: `#${buttonContainerId}`,
	player_controls_left: ".ytp-left-controls",
	player_controls_right: ".ytp-right-controls"
} as const;
export const volume = 10;
export const pageTypeRecord = {
	channel_home: "channel_home",
	channel_videos: "channel_videos",
	home: "home",
	live: "live",
	playlist: "playlist",
	search: "search",
	shorts: "shorts",
	subscriptions: "subscriptions",
	watch: "watch"
} satisfies Record<PageType, PageType>;
export const placementRecord = {
	below: "below_player",
	left: "player_controls_left",
	menu: "feature_menu",
	right: "player_controls_right"
} satisfies Record<"below" | "left" | "menu" | "right", ButtonPlacement>;
