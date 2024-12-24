import { isWatchPage, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

export async function enableTimestampPeek() {
	const {
		data: {
			options: { enable_timestamp_peek }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_timestamp_peek) return;
	if (!isWatchPage()) return;
	await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);
	// Get the player element
	const playerContainer = document.querySelector<HTMLDivElement>("div#movie_player");
	// If player element is not available, return
	if (!playerContainer) return;
	// TODO: observe comments for more timestamps to handle preview for
	// TODO: handle timestamps in comments
}
