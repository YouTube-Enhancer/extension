export const playlistWatchTimeGetMethod = ["duration", "youtube"] as const;
export type PlaylistWatchTimeGetMethod = (typeof playlistWatchTimeGetMethod)[number];
export const playlistLengthGetMethod = ["api", "html"] as const;
export type PlaylistLengthGetMethod = (typeof playlistLengthGetMethod)[number];
