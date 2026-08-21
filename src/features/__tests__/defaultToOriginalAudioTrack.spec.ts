import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/defaultToOriginalAudioTrack/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("defaultToOriginalAudioTrack", () => {
	for (const pageType of testPages) {
		test(`should set default audio track on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "defaultToOriginalAudioTrack.enabled");
			const playerHasAudioTrackAPI = await page.evaluate(() => {
				const selector = document.location.pathname.startsWith("/shorts") ? "#shorts-player" : "div#movie_player";
				const player = document.querySelector<HTMLDivElement & { getAudioTrack?: () => unknown }>(selector);
				return typeof player?.getAudioTrack === "function";
			});
			expect(playerHasAudioTrackAPI).toBe(true);
		});
		test(`should not set audio track when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "defaultToOriginalAudioTrack.enabled");
			await expect(page.locator("div#movie_player, #shorts-player")).toBeAttached();
		});
	}
});
