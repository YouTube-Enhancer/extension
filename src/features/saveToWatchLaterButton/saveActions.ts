// The save and remove requests, shared by the card buttons and the actions-row toggle.

import { buildPlaylistEditCommand, buildToastCommand, dispatchNativeCommand } from "@/src/utils/dom/nativeCommands";
import { setNativeButtonBusy, type YtButtonViewModelElement } from "@/src/utils/dom/nativeComponents";
import { createTooltip } from "@/src/utils/dom/tooltip";
import { getInnertubeClient } from "@/src/utils/youtube";

// One entry per video with a request in flight. Blocks double-clicks.
export const inFlightSaves = new Set<string>();

export function performPlaylistEdit({
	host,
	isCurrent,
	onSuccess,
	removing,
	videoId
}: {
	host: YtButtonViewModelElement;
	isCurrent: () => boolean;
	onSuccess: () => void;
	removing: boolean;
	videoId: string;
}) {
	if (inFlightSaves.has(videoId)) return;

	/**
	 * YouTube's own pipeline goes first, and it shows its own toast. Acceptance is not completion, but YouTube's save
	 * UI is optimistic in the same way.
	 */
	const action = removing ? "ACTION_REMOVE_VIDEO_BY_VIDEO_ID" : "ACTION_ADD_VIDEO";
	if (dispatchNativeCommand(buildPlaylistEditCommand({ action, playlistId: "WL", videoId }))) {
		onSuccess();
		return;
	}

	// Fall back to the Innertube client.
	inFlightSaves.add(videoId);
	setNativeButtonBusy(host, true);
	void (async () => {
		try {
			const youtube = await getInnertubeClient();
			if (removing) await youtube.playlist.removeVideos("WL", [videoId]);
			else await youtube.playlist.addVideos("WL", [videoId]);
			onSuccess();
		} catch (error) {
			// Show no feedback on a page that a teardown already left.
			if (!isCurrent()) return;
			setNativeButtonBusy(host, false);
			showSaveError(host, error, removing);
		} finally {
			inFlightSaves.delete(videoId);
		}
	})();
}

function showSaveError(host: HTMLElement, error: unknown, removing: boolean) {
	const message = `${window.i18nextInstance.t((translations) =>
		removing ?
			translations.pages.content.features.saveToWatchLaterButton.extras.failedToRemoveVideo
		:	translations.pages.content.features.saveToWatchLaterButton.extras.failedToSaveVideo
	)}: ${error instanceof Error ? error.message : String(error)}`;
	// This branch runs when the command pipeline was unavailable, so the toast can fail too.
	if (!dispatchNativeCommand(buildToastCommand(message))) {
		const { listener, remove } = createTooltip({
			element: host,
			featureName: "saveToWatchLaterButton",
			id: "yte-feature-saveToWatchLaterButton-tooltip",
			text: message
		});
		listener();
		// The tooltip removes itself on mouseleave. Remove it as well when the pointer never entered.
		window.setTimeout(remove, 5000);
	}
}
