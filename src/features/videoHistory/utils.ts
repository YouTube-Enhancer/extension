import type { VideoHistoryStatus, VideoHistoryStorage } from "@/src/types";
export function getVideoHistory() {
	return JSON.parse(window.localStorage.getItem("videoHistory") ?? "{}") as VideoHistoryStorage;
}
export function setVideoHistory(id: string, timestamp: number, status: VideoHistoryStatus) {
	const history = getVideoHistory();
	window.localStorage.setItem("videoHistory", JSON.stringify(Object.assign(history, { [id]: { id, timestamp, status } })));
}
