// Run Innertube commands through YouTube's own command pipeline (ytd-app.resolveCommand).
// YouTube then handles the request, the authentication, and the response actions,
// which includes its own toasts.

export type InnertubeCommand = Record<string, unknown>;

interface YtdAppWithCommands extends HTMLElement {
	resolveCommand?: (command: InnertubeCommand) => unknown;
}

export function buildPlaylistEditCommand({
	action = "ACTION_ADD_VIDEO",
	playlistId,
	videoId
}: {
	action?: string;
	playlistId: string;
	videoId: string;
}): InnertubeCommand {
	return {
		commandMetadata: {
			webCommandMetadata: {
				apiUrl: "/youtubei/v1/browse/edit_playlist",
				sendPost: true
			}
		},
		playlistEditEndpoint: {
			actions: [{ action, addedVideoId: videoId }],
			playlistId
		}
	};
}

export function buildToastCommand(text: string): InnertubeCommand {
	return {
		openPopupAction: {
			popup: {
				notificationActionRenderer: {
					responseText: { simpleText: text }
				}
			},
			popupType: "TOAST"
		}
	};
}

// True means the dispatcher accepted the command, not that the request completed.
export function dispatchNativeCommand(command: InnertubeCommand): boolean {
	const app = document.querySelector<YtdAppWithCommands>("ytd-app");
	if (!app || typeof app.resolveCommand !== "function") return false;
	try {
		app.resolveCommand(command);
		return true;
	} catch {
		return false;
	}
}
