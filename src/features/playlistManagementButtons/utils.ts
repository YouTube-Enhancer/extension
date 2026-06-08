import { Innertube } from "youtubei.js/web";

type EditPlaylistResponse = {
	data: {
		frameworkUpdates: {
			entityBatchUpdate: unknown;
		};
		newHeader: {
			playlistHeaderRenderer: unknown;
		};
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
	// Not the best typing but it'll do for now
	const castResponse = response as unknown as EditPlaylistResponse;
	document.querySelector("ytd-app")?.dispatchEvent(
		new CustomEvent("yt-action", {
			detail: {
				actionName: "yt-playlist-remove-videos-action",
				args: [{ playlistRemoveVideosAction: { setVideoIds: [setVideoId] } }],
				returnValue: []
			}
		})
	);

	// triggers a sidebar update for regular playlists
	if (castResponse?.data?.frameworkUpdates?.entityBatchUpdate) {
		document.querySelector("ytd-app")?.dispatchEvent(
			new CustomEvent("yt-action", {
				detail: {
					actionName: "yt-entity-update-command",
					args: [{ entityUpdateCommand: { entityBatchUpdate: castResponse.data.frameworkUpdates.entityBatchUpdate } }],
					returnValue: []
				}
			})
		);
	}

	// triggers a sidebar update for the WL playlist
	if (castResponse?.data?.newHeader?.playlistHeaderRenderer) {
		document.querySelector("ytd-playlist-header-renderer")?.dispatchEvent(
			new CustomEvent("yt-new-playlist-header", {
				detail: castResponse.data.newHeader.playlistHeaderRenderer
			})
		);
	}
}
