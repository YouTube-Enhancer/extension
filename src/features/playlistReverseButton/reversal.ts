import {
	getPlaylistData,
	getPlaylistPageData,
	type ManagerElement,
	type PanelElement,
	poll,
	reverseChildOrder,
	type YtdPlayerElement
} from "./utils";

function applyPlaylistPageReversal(): boolean {
	const result = getPlaylistPageData();
	if (!result) return false;

	const { contents } = result;
	contents.reverse();

	const listContainer = document.querySelector<HTMLElement>("ytd-playlist-video-list-renderer div#contents");
	if (listContainer) reverseChildOrder(listContainer);

	return true;
}

function applyReversal(): boolean {
	const result = getPlaylistData();
	if (!result) return false;

	const { autoplay, playlist, watchFlexy } = result;

	playlist.contents.reverse();
	playlist.currentIndex = playlist.totalVideos - playlist.currentIndex - 1;
	playlist.localCurrentIndex = playlist.contents.length - playlist.localCurrentIndex - 1;

	for (const set of autoplay.sets) {
		const { autoplayVideo: tmp, nextButtonVideo, previousButtonVideo } = set;
		set.autoplayVideo = previousButtonVideo;
		set.previousButtonVideo = nextButtonVideo;
		set.nextButtonVideo = tmp;
	}

	const clonedData = JSON.parse(JSON.stringify(watchFlexy.data));
	watchFlexy.updatePageData_?.(clonedData);

	setTimeout(() => {
		const player = document.querySelector<YtdPlayerElement>("ytd-player");
		const manager = document.querySelector<ManagerElement>("yt-playlist-manager");
		const panel = document.querySelector<PanelElement>("ytd-playlist-panel-renderer");

		player?.updatePlayerComponents?.(null, autoplay, null, playlist);
		if (manager) {
			manager.autoplayData = autoplay;
			manager.setPlaylistData?.(playlist);
		}
		player?.updatePlayerPlaylist_?.(playlist);
		if (panel) {
			panel.data = playlist;
			panel.updateData?.(playlist);
		}

		const activeItem = document.querySelector<HTMLElement>("ytd-playlist-panel-video-renderer[selected], ytd-playlist-video-renderer[selected]");
		activeItem?.scrollIntoView({ block: "nearest" });
	}, 100);

	return true;
}

function waitForDataRefresh(prevIndex: number, timeout = 3000): Promise<boolean> {
	return poll(
		getPlaylistData,
		(data): data is NonNullable<ReturnType<typeof getPlaylistData>> => data !== null && data.playlist.currentIndex !== prevIndex,
		100,
		timeout
	).then((r) => r !== null);
}

export { applyPlaylistPageReversal, applyReversal, waitForDataRefresh };
