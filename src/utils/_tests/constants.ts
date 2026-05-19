import { buttonContainerId } from "@/src/features/buttonPlacement/utils";

export const placementSelectors = {
	below_player: `#${buttonContainerId}`,
	player_controls_left: ".ytp-left-controls",
	player_controls_right: ".ytp-right-controls"
} as const;
export const volume = 10;
