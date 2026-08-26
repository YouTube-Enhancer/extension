import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import type { StoryboardRenderer } from "./core";

/**
 * The only file in `seekBar/` that may touch YouTube's DOM selectors, page
 * globals, or SPA events. Everything here is a default implementation of a
 * port that `attachMiniSeekBar` accepts as an option, so tests (and any future
 * non-YouTube host) can swap these out wholesale.
 */
type StoryboardWindow = {
	ytInitialPlayerResponse?: {
		storyboards?: {
			playerStoryboardSpecRenderer?: StoryboardRenderer;
		};
	};
	ytplayer?: {
		config?: {
			args?: {
				raw_player_response?: {
					storyboards?: {
						playerStoryboardSpecRenderer?: StoryboardRenderer;
					};
				};
			};
		};
	};
};
export function discoverStoryboardRenderer(pollTimeoutMs = 500): Promise<Nullable<StoryboardRenderer>> {
	const start = performance.now();
	return new Promise((resolve) => {
		const check = () => {
			const renderer = rendererFromPlayer();
			if (renderer) resolve(renderer);
			else if (performance.now() - start > pollTimeoutMs) resolve(rendererFromPageGlobals());
			else requestAnimationFrame(check);
		};
		check();
	});
}
export function findControlsHost(playerElement: HTMLElement): HTMLElement {
	return playerElement.querySelector<HTMLElement>(".html5-video-player") ?? playerElement;
}
export function findNativeProgressBar(playerElement: HTMLElement): Nullable<HTMLElement> {
	return playerElement.querySelector<HTMLElement>(".ytp-progress-bar-container");
}
export function findVideoElement(playerElement: HTMLElement): Nullable<HTMLVideoElement> {
	return playerElement.querySelector<HTMLVideoElement>("video.html5-main-video");
}
export function subscribeMediaChanged(callback: () => void): () => void {
	document.addEventListener("yt-navigate-finish", callback);
	document.addEventListener("yt-player-updated", callback);
	return () => {
		document.removeEventListener("yt-navigate-finish", callback);
		document.removeEventListener("yt-player-updated", callback);
	};
}
function rendererFromPageGlobals(): Nullable<StoryboardRenderer> {
	const spec =
		(window as StoryboardWindow).ytInitialPlayerResponse?.storyboards?.playerStoryboardSpecRenderer?.spec ??
		(window as StoryboardWindow).ytplayer?.config?.args?.raw_player_response?.storyboards?.playerStoryboardSpecRenderer?.spec ??
		null;
	return spec ? { spec } : null;
}
function rendererFromPlayer(): Nullable<StoryboardRenderer> {
	const player = document.querySelector<YouTubePlayerDiv>("#movie_player");
	return player?.getPlayerResponse?.()?.storyboards?.playerStoryboardSpecRenderer ?? null;
}
