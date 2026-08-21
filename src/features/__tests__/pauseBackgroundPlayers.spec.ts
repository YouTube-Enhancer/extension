import { expect, test } from "playwright.config";
import PlayerStates from "youtube-player/dist/constants/PlayerStates.js";

import { metadata } from "@/src/features/pauseBackgroundPlayers/index.metadata";
import { enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getValueFromYouTubePlayer } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("pauseBackgroundPlayers", () => {
	for (const pageType of testPages) {
		test(`pauses background players on ${pageType}`, async ({ context, page }) => {
			const pageA = page;
			const pageB = await context.newPage();
			await navigateToPageType(pageA, pageType);
			await enableFeature(pageA, "pauseBackgroundPlayers.enabled");
			await expect
				.poll(async () => await getValueFromYouTubePlayer(pageA, "getPlayerState", pageType), { timeout: 15000 })
				.toBe(PlayerStates.PLAYING);
			await navigateToPageType(pageB, pageType);
			await expect
				.poll(async () => await getValueFromYouTubePlayer(pageB, "getPlayerState", pageType), { timeout: 15000 })
				.toBe(PlayerStates.PLAYING);
			await expect.poll(async () => await getValueFromYouTubePlayer(pageA, "getPlayerState", pageType), { timeout: 15000 }).toBe(PlayerStates.PAUSED);
		});
	}
});
