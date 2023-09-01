import { VideoHistoryEntry, VideoHistoryStatus, VideoHistoryStorage } from "@/src/types";
export function getVideoHistory() {
	return JSON.parse(window.localStorage.getItem("videoHistory") ?? "{}") as VideoHistoryStorage;
}
export function addToHistory(videoId: string, timestamp: number, status: VideoHistoryStatus) {
	const history = getVideoHistory();
	const videoHistoryItem = { id: videoId, timestamp, status } satisfies VideoHistoryEntry;
	history[videoId] = videoHistoryItem;
	window.localStorage.setItem("videoHistory", JSON.stringify(history));
}
export function updateVideoHistory(videoId: string, timestamp: number) {
	const history = getVideoHistory();
	const { [videoId]: videoHistoryItem } = history;
	if (videoHistoryItem) {
		videoHistoryItem.timestamp = timestamp;
		videoHistoryItem.status = "watching";
	}
	window.localStorage.setItem("videoHistory", JSON.stringify(history));
}
export function checkVideoStatus(videoId: string) {
	const history = getVideoHistory();
	const { [videoId]: videoHistoryItem } = history;
	if (videoHistoryItem) {
		return videoHistoryItem.status;
	}
	return "unwatched";
}
export function markVideoAsWatched(videoId: string) {
	const history = getVideoHistory();
	const { [videoId]: videoHistoryItem } = history;
	if (videoHistoryItem) {
		videoHistoryItem.status = "watched";
	}
	window.localStorage.setItem("videoHistory", JSON.stringify(history));
}
