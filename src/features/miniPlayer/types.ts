export const miniPlayerPositions = ["bottom_center", "bottom_left", "bottom_right", "top_center", "top_left", "top_right"] as const;
export type MiniPlayerPosition = (typeof miniPlayerPositions)[number];
export const miniPlayerSizes = ["320x180", "400x225", "480x270", "560x315"] as const;
export type MiniPlayerOptions = {
	defaultPosition: MiniPlayerPosition;
	defaultSize: MiniPlayerSize;
};
export type MiniPlayerSize = (typeof miniPlayerSizes)[number];
