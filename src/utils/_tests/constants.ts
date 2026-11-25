import type { PageType } from "@/src/features/_registry/types";
import type { ButtonPlacement } from "@/src/types";

import { buttonContainerId } from "@/src/features/buttonController/buttonPlacementState";
import { readinessSelectors } from "@/src/utils/dom/readiness";

/** Where YouTube keeps its own player controls; the two placements inside the player append to them. */
const playerControlsSelectors = {
	player_controls_left: readinessSelectors.playerControlsLeft,
	player_controls_right: readinessSelectors.playerControlsRight
} as const;

export const placementSelectors = {
	below_player: `#${buttonContainerId}`,
	...playerControlsSelectors
} as const;
/**
 * Mirrors the PlayerStates enum from @types/youtube-player. The real `youtube-player` package is not a
 * dependency of this project (only its types are), so tests must not import it at runtime.
 */
export const PlayerStates = {
	BUFFERING: 3,
	ENDED: 0,
	PAUSED: 2,
	PLAYING: 1,
	UNSTARTED: -1,
	VIDEO_CUED: 5
} as const;
export const volume = 10;
export const pageTypeRecord = {
	channel_home: "channel_home",
	channel_posts: "channel_posts",
	channel_streams: "channel_streams",
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
