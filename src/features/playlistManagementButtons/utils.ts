import type { Innertube } from "youtubei.js/web";

type EditPlaylistResponse = {
	frameworkUpdates: {
		entityBatchUpdate: Record<string, unknown>;
	};
	newHeader: {
		playlistHeaderRenderer: Record<string, unknown>;
	};
};

export async function removeFromPlaylist(youtube: Innertube, playlistId: string, setVideoId: string) {
	const response = await youtube.actions.execute("/browse/edit_playlist", {
		actions: [
			{
				action: "ACTION_REMOVE_VIDEO",
				setVideoId
			}
		],
		params: "CAFAAQ%3D%3D",
		playlistId
	});

	const editPlaylistResponse = response.data as EditPlaylistResponse;

	document.querySelector("ytd-app")?.dispatchEvent(
		new CustomEvent("yt-action", {
			detail: {
				actionName: "yt-playlist-remove-videos-action",
				args: [{ playlistRemoveVideosAction: { setVideoIds: [setVideoId] } }],
				returnValue: []
			}
		})
	);

	const updateRegularPlaylistSidebar = () => {
		const { entityBatchUpdate } = editPlaylistResponse.frameworkUpdates || {};

		if (entityBatchUpdate) {
			document.querySelector("ytd-app")?.dispatchEvent(
				new CustomEvent("yt-action", {
					detail: {
						actionName: "yt-entity-update-command",
						args: [{ entityUpdateCommand: { entityBatchUpdate } }],
						returnValue: []
					}
				})
			);
		}
	};

	const updateWatchLaterPlaylistSidebar = () => {
		const { playlistHeaderRenderer } = editPlaylistResponse.newHeader || {};

		if (playlistHeaderRenderer) {
			document.querySelector("ytd-playlist-header-renderer")?.dispatchEvent(
				new CustomEvent("yt-new-playlist-header", {
					detail: playlistHeaderRenderer
				})
			);
		}
	};

	updateRegularPlaylistSidebar();
	updateWatchLaterPlaylistSidebar();
}
