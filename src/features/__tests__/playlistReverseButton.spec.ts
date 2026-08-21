import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/playlistReverseButton/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { readStoredState } from "@/src/utils/_tests/storage";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home } = pageTypeRecord;

async function getPlaylistOrder(page: Parameters<typeof navigateToPageType>[0]): Promise<string[]> {
	return await page.evaluate(() => {
		const items = document.querySelectorAll<HTMLAnchorElement>("ytd-playlist-panel-video-renderer a#thumbnail");
		if (items.length > 0) {
			return Array.from(items).map((a) => {
				const url = new URL(a.href);
				return url.searchParams.get("v") ?? "";
			});
		}
		const playlistId = new URLSearchParams(window.location.search).get("list");
		if (!playlistId) return [];
		const fallbackItems = document.querySelectorAll<HTMLAnchorElement>(`#playlist a[href*="list=${playlistId}"]`);
		return Array.from(fallbackItems).map((a) => {
			const url = new URL(a.href);
			return url.searchParams.get("v") ?? "";
		});
	});
}

async function getPlaylistPageOrder(page: Parameters<typeof navigateToPageType>[0]): Promise<string[]> {
	return await page.evaluate(() => {
		const items = document.querySelectorAll<HTMLAnchorElement>("ytd-playlist-video-renderer a#thumbnail");
		return Array.from(items).map((a) => {
			const url = new URL(a.href);
			return url.searchParams.get("v") ?? "";
		});
	});
}

test.describe("playlistReverseButton", () => {
	for (const pageType of testPages) {
		if (pageType === "watch") {
			test(`toggling reverse button should not crash the page on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect(page.locator("div#yte-message-from-extension")).toBeAttached();
				await disableFeature(page, "playlistReverseButton.enabled");
				await expect(page.locator("div#yte-message-from-extension")).toBeAttached();
			});
			test(`reverse button should be present when enabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect(page.locator("#yte-playlist-reverse-button")).toBeAttached({ timeout: 10000 });
				await expect(page.locator("#yte-button-container")).toBeAttached({ timeout: 5000 });
			});
			test(`reverse button should not be present when disabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect(page.locator("#yte-playlist-reverse-button")).toBeAttached({ timeout: 10000 });
				await disableFeature(page, "playlistReverseButton.enabled");
				await expect(page.locator("#yte-playlist-reverse-button")).not.toBeAttached();
				await expect(page.locator("#yte-button-container")).not.toBeAttached();
			});
			test(`should reverse playlist order on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistOrder(page);
				expect(before.length).toBeGreaterThan(1);
				await button.click();
				await page.waitForTimeout(500);
				const after = await getPlaylistOrder(page);
				expect(after.length).toBe(before.length);
				expect(after[0]).toBe(before[before.length - 1]);
				expect(after[after.length - 1]).toBe(before[0]);
			});
			test(`should restore original order when disabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistOrder(page);
				expect(before.length).toBeGreaterThan(1);
				await button.click();
				await page.waitForTimeout(500);
				const reversed = await getPlaylistOrder(page);
				expect(reversed[0]).toBe(before[before.length - 1]);
				await disableFeature(page, "playlistReverseButton.enabled");
				await page.waitForTimeout(500);
				const restored = await getPlaylistOrder(page);
				expect(restored.length).toBe(before.length);
				expect(restored[0]).toBe(before[0]);
				expect(restored[restored.length - 1]).toBe(before[before.length - 1]);
			});
			test(`should maintain reversed order after disable then re-enable on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistOrder(page);
				expect(before.length).toBeGreaterThan(1);
				await button.click();
				await page.waitForTimeout(500);
				const reversed = await getPlaylistOrder(page);
				expect(reversed[0]).toBe(before[before.length - 1]);
				await disableFeature(page, "playlistReverseButton.enabled");
				await enableFeature(page, "playlistReverseButton.enabled");
				await page.waitForTimeout(1000);
				const reEnabled = await getPlaylistOrder(page);
				expect(reEnabled.length).toBe(before.length);
				expect(reEnabled[0]).toBe(before[before.length - 1]);
				expect(reEnabled[reEnabled.length - 1]).toBe(before[0]);
			});
			test(`should maintain reversed order after navigation on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistOrder(page);
				expect(before.length).toBeGreaterThan(1);
				await button.click();
				await page.waitForTimeout(500);
				const reversed = await getPlaylistOrder(page);
				expect(reversed[0]).toBe(before[before.length - 1]);
				await navigateToPageType(page, home);
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await disableFeature(page, "playlistReverseButton.enabled");
				await enableFeature(page, "playlistReverseButton.enabled");
				await page.waitForTimeout(1000);
				const afterNav = await getPlaylistOrder(page);
				expect(afterNav.length).toBe(before.length);
				expect(afterNav[0]).toBe(before[before.length - 1]);
				expect(afterNav[afterNav.length - 1]).toBe(before[0]);
			});
			test(`should persist reversed order after full page reload on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistOrder(page);
				expect(before.length).toBeGreaterThan(1);
				await button.click();
				await page.waitForTimeout(500);
				const reversed = await getPlaylistOrder(page);
				expect(reversed[0]).toBe(before[before.length - 1]);
				await page.reload();
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await page.waitForTimeout(1000);
				const afterReload = await getPlaylistOrder(page);
				expect(afterReload.length).toBe(before.length);
				expect(afterReload[0]).toBe(before[before.length - 1]);
				expect(afterReload[afterReload.length - 1]).toBe(before[0]);
			});
		} else {
			const playlistRequirements: ("playlistLength" | "playlistManagementButtons")[] = ["playlistLength", "playlistManagementButtons"];
			test(`toggling reverse button should not crash the page on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect(page.locator("div#yte-message-from-extension")).toBeAttached();
				await disableFeature(page, "playlistReverseButton.enabled");
				await expect(page.locator("div#yte-message-from-extension")).toBeAttached();
			});
			test(`reverse button should be present when enabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect(page.locator("#yte-playlist-reverse-button")).toBeAttached({ timeout: 10000 });
			});
			test(`reverse button should not be present when disabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect(page.locator("#yte-playlist-reverse-button")).toBeAttached({ timeout: 10000 });
				await disableFeature(page, "playlistReverseButton.enabled");
				await expect(page.locator("#yte-playlist-reverse-button")).not.toBeAttached();
			});
			test(`should reverse playlist order on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistPageOrder(page);
				expect(before.length).toBeGreaterThan(1);
				await button.click();
				await page.waitForTimeout(500);
				const after = await getPlaylistPageOrder(page);
				expect(after.length).toBe(before.length);
				expect(after[0]).toBe(before[before.length - 1]);
				expect(after[after.length - 1]).toBe(before[0]);
			});
			test(`should restore original order when disabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistPageOrder(page);
				expect(before.length).toBeGreaterThan(1);
				await button.click();
				await page.waitForTimeout(500);
				const reversed = await getPlaylistPageOrder(page);
				expect(reversed[0]).toBe(before[before.length - 1]);
				await disableFeature(page, "playlistReverseButton.enabled");
				await page.waitForTimeout(500);
				const restored = await getPlaylistPageOrder(page);
				expect(restored.length).toBe(before.length);
				expect(restored[0]).toBe(before[0]);
				expect(restored[restored.length - 1]).toBe(before[before.length - 1]);
			});
			test(`should maintain reversed order after disable then re-enable on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistPageOrder(page);
				expect(before.length).toBeGreaterThan(1);
				await button.click();
				await page.waitForTimeout(500);
				const reversed = await getPlaylistPageOrder(page);
				expect(reversed[0]).toBe(before[before.length - 1]);
				await disableFeature(page, "playlistReverseButton.enabled");
				await enableFeature(page, "playlistReverseButton.enabled");
				await page.waitForTimeout(1000);
				const reEnabled = await getPlaylistPageOrder(page);
				expect(reEnabled.length).toBe(before.length);
				expect(reEnabled[0]).toBe(before[before.length - 1]);
				expect(reEnabled[reEnabled.length - 1]).toBe(before[0]);
			});
			test(`should maintain reversed order after navigation on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistPageOrder(page);
				expect(before.length).toBeGreaterThan(1);
				await button.click();
				await page.waitForTimeout(500);
				const reversed = await getPlaylistPageOrder(page);
				expect(reversed[0]).toBe(before[before.length - 1]);
				await navigateToPageType(page, home);
				await navigateToPageType(page, pageType, playlistRequirements);
				await page.waitForTimeout(1000);
				const afterNav = await getPlaylistPageOrder(page);
				expect(afterNav.length).toBe(before.length);
				expect(afterNav[0]).toBe(before[before.length - 1]);
				expect(afterNav[afterNav.length - 1]).toBe(before[0]);
			});
			test(`should persist reversed order after full page reload on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistPageOrder(page);
				expect(before.length).toBeGreaterThan(1);
				await button.click();
				await page.waitForTimeout(500);
				const reversed = await getPlaylistPageOrder(page);
				expect(reversed[0]).toBe(before[before.length - 1]);
				await page.reload();
				await navigateToPageType(page, pageType, playlistRequirements);
				await page.waitForTimeout(1000);
				const afterReload = await getPlaylistPageOrder(page);
				expect(afterReload.length).toBe(before.length);
				expect(afterReload[0]).toBe(before[before.length - 1]);
				expect(afterReload[afterReload.length - 1]).toBe(before[0]);
			});
		}
	}

	test(`reverse button should not be present on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "playlistReverseButton.enabled");
		await expect(page.locator("#yte-playlist-reverse-button")).not.toBeAttached();
	});

	test.describe("state persistence", () => {
		test("playlistReverseButton state is stored in extension storage", async ({ page }) => {
			await navigateToPageType(page, "playlist", ["playlistLength", "playlistManagementButtons"]);
			await enableFeature(page, "playlistReverseButton.enabled");
			const reverseButton = page.locator("#yte-playlist-reverse-button");
			await expect(reverseButton).toBeAttached({ timeout: 10000 });
			await reverseButton.click();
			await page.waitForTimeout(1500);

			const stateAfter = await readStoredState(page);
			const after = stateAfter.playlistReverseButton as undefined | { isReversed: boolean };
			expect(after).toBeDefined();
			expect(after!.isReversed).toBe(true);
		});
	});
});
