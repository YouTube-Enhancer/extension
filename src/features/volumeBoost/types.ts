export const volumeBoostModes = ["global", "per_video"] as const;
export type VolumeBoostMode = (typeof volumeBoostModes)[number];
