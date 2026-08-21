import { expect, test } from "playwright.config";

import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
const { home, watch } = pageTypeRecord;

async function getCurrentTime(page: Parameters<typeof navigateToPageType>[0]): Promise<number> {
	return await page.evaluate(() => {
		const v = document.querySelector<HTMLVideoElement>("div#movie_player video");
		return v?.currentTime ?? 0;
	});
}

test.describe("videoHistory", () => {
	test("video history resume prompt should appear when navigating back", async ({ page }) => {
		await navigateToPageType(page, watch, ["videoHistory"]);
		await enableFeature(page, "videoHistory.enabled");
		await setOption(page, "videoHistory.resumeType", "prompt");
		await expect.poll(() => getCurrentTime(page), { timeout: 15000 }).toBeGreaterThan(0);
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch, ["videoHistory"]);
		await disableFeature(page, "videoHistory.enabled");
		await enableFeature(page, "videoHistory.enabled");
		const resumePrompt = page.locator("#resume-prompt");
		await expect(resumePrompt).toBeAttached();
	});
	test("video history resume prompt button should resume playback when clicked", async ({ page }) => {
		await navigateToPageType(page, watch, ["videoHistory"]);
		await enableFeature(page, "videoHistory.enabled");
		await setOption(page, "videoHistory.resumeType", "prompt");
		const video = page.locator("div#movie_player video");
		await expect(video).toBeAttached();
		await expect.poll(() => getCurrentTime(page), { timeout: 15000 }).toBeGreaterThan(1);
		const watchedTime = await video.evaluate((v) => (v as HTMLVideoElement).currentTime);
		expect(watchedTime).toBeGreaterThan(1);
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch, ["videoHistory"]);
		await disableFeature(page, "videoHistory.enabled");
		await enableFeature(page, "videoHistory.enabled");
		const resumePrompt = page.locator("#resume-prompt");
		await expect(resumePrompt).toBeAttached();
		const resumeButton = page.locator("#resume-prompt-button");
		await expect(resumeButton).toBeVisible();
		await resumeButton.click();
		await page.waitForFunction((expectedTime) => {
			const v = document.querySelector<HTMLVideoElement>("div#movie_player video");
			return v && v.currentTime >= expectedTime - 2 && !v.paused;
		}, watchedTime);
		const resumedTime = await video.evaluate((v) => (v as HTMLVideoElement).currentTime);
		expect(resumedTime).toBeGreaterThan(watchedTime - 2);
		expect(resumedTime).toBeLessThan(watchedTime + 10);
	});
	test("video history should automatically resume when navigating back", async ({ page }) => {
		await navigateToPageType(page, watch, ["videoHistory"]);
		await enableFeature(page, "videoHistory.enabled");
		await setOption(page, "videoHistory.resumeType", "automatic");
		const video = page.locator("div#movie_player video");
		await expect(video).toBeAttached();
		await expect.poll(() => getCurrentTime(page), { timeout: 15000 }).toBeGreaterThan(1);
		const watchedTime = await video.evaluate((v) => (v as HTMLVideoElement).currentTime);
		expect(watchedTime).toBeGreaterThan(1);
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch, ["videoHistory"]);
		await page.waitForFunction(() => {
			const v = document.querySelector<HTMLVideoElement>("div#movie_player video");
			return v && v.readyState >= 2;
		});
		const resumedTime = await video.evaluate((v) => (v as HTMLVideoElement).currentTime);
		expect(resumedTime).toBeGreaterThan(watchedTime - 2);
		expect(resumedTime).toBeLessThan(watchedTime + 10);
	});
	test("video history resume prompt should not appear when disabled", async ({ page }) => {
		await navigateToPageType(page, watch, ["videoHistory"]);
		await disableFeature(page, "videoHistory.enabled");
		// Wait some time to ensure history would have been recorded if feature were enabled
		await page.waitForTimeout(500);
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch, ["videoHistory"]);
		const resumePrompt = page.locator("#resume-prompt");
		await expect(resumePrompt).not.toBeAttached();
	});
});
