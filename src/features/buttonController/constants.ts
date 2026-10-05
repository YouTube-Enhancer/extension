import { pageReadinessSelectors } from "@/src/utils/dom/pageReadiness";

export const buttonContainerId = "yte-button-container";
/** Where YouTube keeps its own player controls; the two placements inside the player append to them. */
export const playerControlsSelectors = {
	player_controls_left: pageReadinessSelectors.playerControlsLeft,
	player_controls_right: pageReadinessSelectors.playerControlsRight
} as const;
