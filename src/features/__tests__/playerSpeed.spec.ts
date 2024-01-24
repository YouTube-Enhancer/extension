import {
	disableFeature,
	enableFeature,
	expect,
	getValueFromYouTubePlayer,
	navigateToOptionsPage,
	navigateToYoutubePage,
	selectOption,
	test
} from "playwright.config";

test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});

test("should enable automatically set playback speed", async ({ page }) => {
	await enableFeature(page, "enable_forced_playback_speed");
});
test("should disable automatically set playback speed", async ({ page }) => {
	await disableFeature(page, "enable_forced_playback_speed");
});
test("should set playback speed to 2", async ({ page }) => {
	await enableFeature(page, "enable_forced_playback_speed");
	await selectOption(page, "player_speed", 2);
	await navigateToYoutubePage(page);
	const playbackRate = await getValueFromYouTubePlayer(page, "getPlaybackRate");
	expect(playbackRate).toBeTruthy();
	expect(playbackRate).toBe(2);
});
test("should not set playback speed to 2", async ({ page }) => {
	await disableFeature(page, "enable_forced_playback_speed");
	await navigateToYoutubePage(page);
	const playbackRate = await getValueFromYouTubePlayer(page, "getPlaybackRate");
	expect(playbackRate).toBeTruthy();
	expect(playbackRate).not.toBe(2);
});
