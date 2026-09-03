import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/playerSpeed/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getCurrentSpeed } from "@/src/utils/_tests/player";
import { readStoredState } from "@/src/utils/_tests/storage";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
// No code branches on the speed value (resolveEffectiveSpeed forwards it unchanged), so one speed per page is enough.
const speed = 2;
const { home, watch } = pageTypeRecord;

test.describe("playerSpeed", () => {
	for (const pageType of testPages) {
		test(`should set playback speed to ${speed} on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerSpeed.speed", speed);
			await enableFeature(page, "playerSpeed.enabled");
			await page.waitForTimeout(1000);
			await expect.poll(async () => getCurrentSpeed(page, pageType), { timeout: pageType === "shorts" ? 15000 : 5000 }).toBe(speed);
		});
		test(`should persist playback speed after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerSpeed.speed", 2);
			await enableFeature(page, "playerSpeed.enabled");
			await expect.poll(async () => getCurrentSpeed(page, pageType), { timeout: pageType === "shorts" ? 15000 : 5000 }).toBe(2);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "playerSpeed.enabled");
			await enableFeature(page, "playerSpeed.enabled");
			await expect
				.poll(() => getCurrentSpeed(page, pageType), {
					intervals: [200],
					timeout: 5000
				})
				.toBe(2);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerSpeed.speed", 2);
			await enableFeature(page, "playerSpeed.enabled");
			await expect.poll(async () => getCurrentSpeed(page, pageType), { timeout: pageType === "shorts" ? 15000 : 5000 }).toBe(2);
			await disableFeature(page, "playerSpeed.enabled");
			await expect.poll(async () => getCurrentSpeed(page, pageType), { timeout: 5000 }).toBe(1);
			await enableFeature(page, "playerSpeed.enabled");
			await expect.poll(async () => getCurrentSpeed(page, pageType), { timeout: pageType === "shorts" ? 15000 : 5000 }).toBe(2);
		});
		test(`persists speed after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playerSpeed.speed", 2);
			await enableFeature(page, "playerSpeed.enabled");
			await expect.poll(async () => getCurrentSpeed(page, pageType), { timeout: pageType === "shorts" ? 15000 : 5000 }).toBe(2);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expect.poll(async () => getCurrentSpeed(page, pageType), { timeout: 15000 }).toBe(2);
		});
	}

	test.describe("state persistence", () => {
		test("playerSpeed state is stored in extension storage", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "playerSpeed.speed", 2);
			await enableFeature(page, "playerSpeed.enabled");
			await expect.poll(() => getCurrentSpeed(page, watch), { timeout: 5000 }).toBe(2);

			await page.locator("div#movie_player").hover();
			await page.locator(".ytp-settings-button").click();
			await page.waitForTimeout(1000);
			await page.evaluate(() => {
				const speedItem = Array.from(document.querySelectorAll<HTMLDivElement>(".ytp-menuitem")).find((item) =>
					item.querySelector(".ytp-menuitem-label")?.textContent?.toLowerCase().includes("speed")
				);
				speedItem?.click();
			});
			await page.waitForTimeout(1000);

			const state = await readStoredState(page);
			const playerSpeedState = state.playerSpeed as undefined | { playbackSpeed: number };
			expect(playerSpeedState).toBeDefined();
			expect(playerSpeedState!.playbackSpeed).toBe(2);
		});
	});
});
