import type { Nullable, YouTubePlayerDiv } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { waitForElement } from "@/src/utils/dom/wait";
import { isLivePage, isShortsPage, isWatchPage } from "@/src/utils/url";

import { metadata } from "./index.metadata";
import { restorePlayerVolume, setPlayerVolume } from "./utils";

async function getPlayerContainer(): Promise<Nullable<YouTubePlayerDiv>> {
	const container: Nullable<YouTubePlayerDiv> =
		isWatchPage() || isLivePage() ? await waitForElement<YouTubePlayerDiv>("#movie_player")
		: isShortsPage() ? await waitForElement<YouTubePlayerDiv>("#shorts-player")
		: null;
	if (!container?.getVolume || !container.setVolume) return null;
	return container;
}
export default createFeature({
	...metadata,
	dependencies: { includePages: ["watch", "live", "shorts"] },
	onDisable: async () => {
		const playerContainer = await getPlayerContainer();
		if (!playerContainer) return;
		await restorePlayerVolume(playerContainer);
	},
	onEnable: async ({ volume }) => {
		const playerContainer = await getPlayerContainer();
		if (!playerContainer) return;
		await setPlayerVolume(playerContainer, volume);
	}
});
