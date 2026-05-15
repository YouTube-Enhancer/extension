export type VideoHistoryEntry = {
	id: string;
	status: VideoHistoryStatus;
	timestamp: number;
};
export const videoHistoryStatuses = ["watched", "watching"] as const;
export type VideoHistoryStatus = (typeof videoHistoryStatuses)[number];
export type VideoHistoryStorage = Record<string, VideoHistoryEntry>;

export const videoHistoryResumeTypes = ["automatic", "prompt"] as const;
export type VideoHistoryResumeType = (typeof videoHistoryResumeTypes)[number];
