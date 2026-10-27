/**
 * Runs Innertube commands through YouTube's own command pipeline, ytd-app.resolveCommand,
 * when it is available. On current builds `resolveCommand` is not exposed on `ytd-app`, so
 * callers fall back to their own Innertube client for the request itself. Confirmation
 * snackbars are a separate concern: YouTube renders its save/remove feedback as a
 * `snackbar-view-model` inside `<snackbar-container>`, which `showSnackbar` replicates.
 */

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

/**
 * Shows a confirmation snackbar matching YouTube's own save/remove feedback: a
 * `snackbar-view-model` inside `<snackbar-container>`, with an optional video thumbnail on
 * the left (YouTube includes one when saving to a playlist). YouTube exposes no public
 * snackbar API, so this replicates the exact markup the popup renders. Returns true when
 * the snackbar was shown.
 */
export function showSnackbar(text: string, thumbnailUrl?: string): boolean {
	const container = document.querySelector("snackbar-container") ?? document.body;
	const wrapper = document.createElement("div");
	wrapper.className = "ytSnackbarContainerSnackbarContainer ytSnackbarContainerOpened";
	const snack = document.createElement("snackbar-view-model");
	snack.className = "snackbarViewModelHost snackbarViewModelSwipeable";
	wrapper.appendChild(snack);
	container.appendChild(wrapper);
	// Populate after connect so the custom element's initial (empty) render is overwritten;
	// with no later prop change our markup persists for the snackbar's lifetime. The explicit
	// size and visibility override ytCoreImageHost's hidden-until-loaded state (YouTube's own
	// loader never runs on an img we create), so the thumbnail actually paints. The image is
	// built with DOM APIs rather than interpolated into markup, so a crafted URL cannot break
	// out of an attribute context.
	snack.innerHTML =
		`<div class="snackbarViewModelEngagementBarWrapper">` +
		`<div class="snackbarViewModelTitleSubtextWrapper"><div class="snackbarViewModelTitle">` +
		`<span class="ytAttributedStringHost ytAttributedStringWhiteSpacePreWrap" role="text"></span>` +
		`</div></div></div>`;
	if (thumbnailUrl) {
		const engagementBar = snack.querySelector(".snackbarViewModelEngagementBarWrapper");
		const image = document.createElement("img");
		image.className =
			"ytCoreImageHost snackbarViewModelImageContainer ytCoreImageContentModeScaleAspectFit";
		image.alt = "";
		image.width = 86;
		image.height = 48;
		image.style.cssText = "width:86px;height:48px;flex:none;visibility:visible";
		image.src = thumbnailUrl;
		engagementBar?.insertBefore(image, engagementBar.firstChild);
	}
	const span = snack.querySelector("span");
	if (span) span.textContent = text;
	window.setTimeout(() => wrapper.remove(), 5000);
	return true;
}
