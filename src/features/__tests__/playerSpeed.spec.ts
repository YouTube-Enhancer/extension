import { expect, test } from "playwright.config";

import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getValueFromYouTubePlayer } from "@/src/utils/_tests/player";

const testPages = ["watch", "shorts"] as const;
const speeds = [2, 0.5, 1.5] as const;

test.describe("playerSpeed", () => {
	for (const pageType of testPages) {
		for (const speed of speeds) {
			test(`should set playback speed to ${speed} on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await setOption(page, "playerSpeed.speed", speed);
				await enableFeature(page, "playerSpeed.enabled");
				const playbackRate = await getValueFromYouTubePlayer(page, "getPlaybackRate", pageType);
				expect(playbackRate).toBeTruthy();
				expect(playbackRate).toBe(speed);
			});
		}
		test(`should not set playback speed when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "playerSpeed.enabled");
			const playbackRate = await getValueFromYouTubePlayer(page, "getPlaybackRate", pageType);
			expect(playbackRate).toBeTruthy();
			expect(playbackRate).not.toBe(2);
		});
	}
});
