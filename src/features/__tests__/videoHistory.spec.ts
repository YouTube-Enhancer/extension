import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/videoHistory/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage } from "@/src/utils/_tests/utils";
const { home, watch } = pageTypeRecord;
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

async function getCurrentTime(page: Parameters<typeof navigateToPageType>[0]): Promise<number> {
	return await page.evaluate(() => {
		const v = document.querySelector<HTMLVideoElement>("div#movie_player video");
		return v?.currentTime ?? 0;
	});
}

test.describe("videoHistory", () => {
	test("toggling video history should not crash the page", async ({ page }) => {
		await navigateToPageType(page, watch, ["videoHistory"]);
		await expect(page.locator("div#yte-message-from-extension")).toBeAttached();
		await enableFeature(page, "videoHistory.enabled");
		await expect(page.locator("div#yte-message-from-extension")).toBeAttached();
		await disableFeature(page, "videoHistory.enabled");
		await expect(page.locator("div#yte-message-from-extension")).toBeAttached();
	});
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
	test("video history close button should hide the resume prompt", async ({ page }) => {
		await navigateToPageType(page, watch, ["videoHistory"]);
		await enableFeature(page, "videoHistory.enabled");
		await setOption(page, "videoHistory.resumeType", "prompt");
		await expect.poll(() => getCurrentTime(page), { timeout: 15000 }).toBeGreaterThan(0);
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch, ["videoHistory"]);
		await disableFeature(page, "videoHistory.enabled");
		await enableFeature(page, "videoHistory.enabled");
		const resumePrompt = page.locator("#resume-prompt");
		await expect(resumePrompt).toBeAttached({ timeout: 10000 });
		const closeButton = page.locator("#resume-prompt-close-button");
		await expect(closeButton).toBeVisible();
		await closeButton.click();
		await expect(resumePrompt).not.toBeVisible();
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
	test("video history should persist after full page reload", async ({ page }) => {
		await navigateToPageType(page, watch, ["videoHistory"]);
		await enableFeature(page, "videoHistory.enabled");
		await setOption(page, "videoHistory.resumeType", "prompt");
		await expect.poll(() => getCurrentTime(page), { timeout: 15000 }).toBeGreaterThan(0);
		await navigateToPageType(page, home);
		await page.reload();
		await navigateToPageType(page, watch, ["videoHistory"]);
		const resumePrompt = page.locator("#resume-prompt");
		await expect(resumePrompt).toBeAttached({ timeout: 15000 });
	});
	test("video history should not create resume prompt on live video", async ({ page }) => {
		await navigateToPageType(page, "live");
		await enableFeature(page, "videoHistory.enabled");
		await expect(page.locator("#resume-prompt")).not.toBeAttached();
	});
	test(`should not create resume prompt on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "videoHistory.enabled");
		await expect(page.locator("#resume-prompt")).not.toBeAttached();
	});
});
