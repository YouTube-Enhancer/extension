import { expect, test } from "playwright.config";

import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

test.describe("videoHistory", () => {
	test("video history resume prompt should appear when navigating back", async ({ page }) => {
		await navigateToPageType(page, "watch", true);
		await enableFeature(page, "videoHistory.enabled");
		await setOption(page, "videoHistory.resumeType", "prompt");
		// Wait some time for history to be recorded
		await page.waitForTimeout(2000);
		// Navigate away
		await navigateToPageType(page, "home");
		// Navigate back to the same video
		await navigateToPageType(page, "watch", true);
		// Check if the resume prompt appears
		const resumePrompt = page.locator("#resume-prompt");
		await expect(resumePrompt).toBeAttached();
	});
	test("video history resume prompt button should resume playback when clicked", async ({ page }) => {
		await navigateToPageType(page, "watch", true);
		await enableFeature(page, "videoHistory.enabled");
		await setOption(page, "videoHistory.resumeType", "prompt");
		const video = page.locator("div#movie_player video");
		await expect(video).toBeAttached();
		// Let playback progress
		await page.waitForTimeout(2000);
		const watchedTime = await video.evaluate((v) => (v as HTMLVideoElement).currentTime);
		expect(watchedTime).toBeGreaterThan(1);
		// Navigate away
		await navigateToPageType(page, "home");
		// Return to same video
		await navigateToPageType(page, "watch", true);
		// Verify prompt appears
		const resumePrompt = page.locator("#resume-prompt");
		await expect(resumePrompt).toBeAttached();
		// Click resume button
		const resumeButton = page.locator("#resume-prompt-button");
		await expect(resumeButton).toBeVisible();
		await resumeButton.click();
		// Wait for playback to continue/resume
		await page.waitForFunction(() => {
			const v = document.querySelector<HTMLVideoElement>("div#movie_player video");
			return v && v.currentTime > 0 && !v.paused;
		});
		const resumedTime = await video.evaluate((v) => (v as HTMLVideoElement).currentTime);
		expect(resumedTime).toBeGreaterThan(watchedTime - 2);
		expect(resumedTime).toBeLessThan(watchedTime + 10);
	});
	test("video history should automatically resume when navigating back", async ({ page }) => {
		await navigateToPageType(page, "watch", true);
		await enableFeature(page, "videoHistory.enabled");
		await setOption(page, "videoHistory.resumeType", "automatic");
		const video = page.locator("div#movie_player video");
		await expect(video).toBeAttached();
		await page.waitForTimeout(2000);
		const watchedTime = await video.evaluate((v) => (v as HTMLVideoElement).currentTime);
		expect(watchedTime).toBeGreaterThan(1);
		await navigateToPageType(page, "home");
		await navigateToPageType(page, "watch", true);
		await page.waitForFunction(() => {
			const v = document.querySelector<HTMLVideoElement>("div#movie_player video");
			return v && v.readyState >= 2;
		});
		const resumedTime = await video.evaluate((v) => (v as HTMLVideoElement).currentTime);
		expect(resumedTime).toBeGreaterThan(watchedTime - 2);
		expect(resumedTime).toBeLessThan(watchedTime + 10);
	});
	test("video history resume prompt should not appear when disabled", async ({ page }) => {
		await navigateToPageType(page, "watch", true);
		await disableFeature(page, "videoHistory.enabled");
		// Wait some time
		await page.waitForTimeout(2000);
		// Navigate away
		await navigateToPageType(page, "home");
		// Navigate back to the same video
		await navigateToPageType(page, "watch", true);
		// Check if the resume prompt does not appear
		const resumePrompt = page.locator("#resume-prompt");
		await expect(resumePrompt).not.toBeAttached();
	});
});
