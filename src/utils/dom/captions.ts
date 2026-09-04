import type { YouTubePlayerDiv } from "@/src/types";

/**
 * Whether the player offers captions right now. YouTube hides the subtitles button while the video has no caption
 * track - during an ad, and for a while after a live stream reloads - and drops clicks on it. The button's own
 * label is no signal: it can read "unavailable" on a video with five tracks. The player response's caption tracks
 * decide: a video lists them there or has none. A live stream is the exception - it keeps its auto-generated
 * track outside the response and lists it only once captions are on - so a live response without a caption
 * section says nothing and the click is simply tried. The captions module's own track list is not consulted:
 * after an in-page navigation it can still be the previous video's for a while.
 */
export function captionsAvailable(playerContainer: YouTubePlayerDiv, subtitlesButton: HTMLButtonElement): boolean {
	if (subtitlesButton.style.display === "none") return false;
	try {
		const response = playerContainer.getPlayerResponse();
		const captionTracks = response.captions?.playerCaptionsTracklistRenderer?.captionTracks;
		if (Array.isArray(captionTracks)) return captionTracks.length > 0;
		return response.videoDetails?.isLive === true;
	} catch {
		return true;
	}
}

/**
 * Whether the player is showing the video the page is on. During an in-page navigation, and during an ad, it is
 * not, and a click then lands on a video that is about to go away.
 */
export async function playerShowsPageVideo(playerContainer: YouTubePlayerDiv): Promise<boolean> {
	const pageVideoId = new URL(window.location.href).searchParams.get("v");
	if (!pageVideoId) return true;
	try {
		const { video_id: playerVideoId } = await playerContainer.getVideoData();
		return playerVideoId === pageVideoId;
	} catch {
		return true;
	}
}
