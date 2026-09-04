import type { YouTubePlayerDiv } from "@/src/types";

/**
 * Whether the player is showing the video the page is on. During an in-page navigation, and during an ad, it is
 * not, and anything read from or done to the player then belongs to a video that is about to go away.
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
