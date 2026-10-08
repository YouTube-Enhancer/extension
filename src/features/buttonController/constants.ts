import { readinessSelectors } from "@/src/utils/dom/readiness";

export const buttonContainerId = "yte-button-container";
/** Where YouTube keeps its own player controls; the two placements inside the player append to them. */
export const playerControlsSelectors = {
	player_controls_left: readinessSelectors.playerControlsLeft,
	player_controls_right: readinessSelectors.playerControlsRight
} as const;
