import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { isLivePage, isShortsPage, isWatchPage, waitForElement, waitForSpecificMessage } from "@/src/utils/utilities";

import { restorePlayerVolume, setPlayerVolume } from "./utils";

export async function disableGlobalVolume(): Promise<void> {
	const playerContainer: Nullable<YouTubePlayerDiv> = await getPlayerContainer();
	if (!playerContainer) return;
	await restorePlayerVolume(playerContainer);
}

export async function enableGlobalVolume(): Promise<void> {
	const playerContainer: Nullable<YouTubePlayerDiv> = await getPlayerContainer();
	if (!playerContainer) return;
	const {
		data: {
			options: { enable_global_volume, global_volume }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_global_volume) return;
	await setPlayerVolume(playerContainer, global_volume);
}

async function getPlayerContainer(): Promise<Nullable<YouTubePlayerDiv>> {
	const container: Nullable<YouTubePlayerDiv> =
		isWatchPage() || isLivePage() ? await waitForElement<YouTubePlayerDiv>("#movie_player")
		: isShortsPage() ? await waitForElement<YouTubePlayerDiv>("#shorts-player")
		: null;
	if (!container?.getVolume || !container.setVolume) return null;
	return container;
}
