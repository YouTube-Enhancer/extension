import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { Nullable } from "@/src/types";

import { metadata } from "@/src/features/playlistLength/index.metadata";
import { playlistLengthGetMethod } from "@/src/features/playlistLength/types";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const pageTypes = resolvePageTypes(metadata.dependencies?.includePages);
const { watch } = pageTypeRecord;
const UI = {
	percent: "#yte-playlist-length-ui-percentageWatched",
	root: "#yte-playlist-length-ui",
	times: "#yte-playlist-length-ui-times"
};

async function getTimes(page: Page): Promise<Nullable<string>> {
	return await page.locator(UI.times).textContent();
}

test.describe("playlistLength", () => {
	for (const pageType of pageTypes) {
		test(`should render UI when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["playlistLength"]);
			await disableFeature(page, "playlistLength.enabled");
			await enableFeature(page, "playlistLength.enabled");
			await expect(page.locator(UI.root)).toBeVisible({ timeout: 15000 });
			await expect(page.locator(UI.times)).not.toHaveText("");
			await expect(page.locator(UI.percent)).toContainText("%");
		});
		test(`should not render UI when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["playlistLength"]);
			await disableFeature(page, "playlistLength.enabled");
			await expect(page.locator(UI.root)).toHaveCount(0);
		});
		for (const method of playlistLengthGetMethod) {
			test(`should support ${method} method on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await disableFeature(page, "playlistLength.enabled");
				await setOption(page, "playlistLength.lengthGetMethod", method);
				await enableFeature(page, "playlistLength.enabled");
				await expect(page.locator(UI.root)).toBeVisible({ timeout: 15000 });
			});
		}
	}
	test("should update UI when playback rate changes (watch only behavior)", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "playlistLength.enabled");
		const before = await getTimes(page);
		await page.locator("video").evaluate((video: HTMLVideoElement) => {
			video.playbackRate = 2;
			video.dispatchEvent(new Event("ratechange"));
		});
		await expect.poll(async () => await getTimes(page)).not.toBe(before);
	});
});
