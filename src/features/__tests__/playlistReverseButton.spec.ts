import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/playlistReverseButton/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage } from "@/src/utils/_tests/navigation";
import { readStoredState } from "@/src/utils/_tests/storage";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

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
			test(`reverse button should be present when enabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect(page.locator("#yte-playlist-reverse-button")).toBeAttached({ timeout: 10000 });
				await expect(page.locator("#yte-button-container")).toBeAttached({ timeout: 5000 });
			});
			test(`should reverse playlist order on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistOrder(page);
				expect(before.length).toBeGreaterThan(1);
				await button.click();
				// Compare the whole array: a rotation, a swap or a partial reversal must not pass as a reversal.
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual([...before].reverse());
			});
			test(`should maintain reversed order after disable then re-enable on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistOrder(page);
				expect(before.length).toBeGreaterThan(1);
				const reversed = [...before].reverse();
				await button.click();
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual(reversed);
				await disableFeature(page, "playlistReverseButton.enabled");
				await expect(button).not.toBeAttached();
				await expect(page.locator("#yte-button-container")).not.toBeAttached();
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual(before);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual(reversed);
			});
			test(`should persist reversed order after full page reload on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, ["playlistLength"]);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistOrder(page);
				expect(before.length).toBeGreaterThan(1);
				const reversed = [...before].reverse();
				await button.click();
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 10000 }).toEqual(reversed);
				await reloadPage(page, pageType);
				await expect.poll(async () => getPlaylistOrder(page), { timeout: 15000 }).toEqual(reversed);
			});
		} else {
			const playlistRequirements: ("playlistLength" | "playlistManagementButtons")[] = ["playlistLength", "playlistManagementButtons"];
			test(`reverse button should be present when enabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect(page.locator("#yte-playlist-reverse-button")).toBeAttached({ timeout: 10000 });
			});
			test(`should reverse playlist order on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistPageOrder(page);
				expect(before.length).toBeGreaterThan(1);
				await button.click();
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 10000 }).toEqual([...before].reverse());
				await expect
					.poll(
						async () => {
							const storedState = await readStoredState(page);
							return (storedState.playlistReverseButton as undefined | { isReversed: boolean })?.isReversed;
						},
						{ timeout: 10000 }
					)
					.toBe(true);
			});
			test(`should maintain reversed order after disable then re-enable on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistPageOrder(page);
				expect(before.length).toBeGreaterThan(1);
				const reversed = [...before].reverse();
				await button.click();
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 10000 }).toEqual(reversed);
				await disableFeature(page, "playlistReverseButton.enabled");
				await expect(button).not.toBeAttached();
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 10000 }).toEqual(before);
				await enableFeature(page, "playlistReverseButton.enabled");
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 10000 }).toEqual(reversed);
			});
			test(`should persist reversed order after full page reload on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType, playlistRequirements);
				await enableFeature(page, "playlistReverseButton.enabled");
				const button = page.locator("#yte-playlist-reverse-button");
				await expect(button).toBeAttached({ timeout: 10000 });
				const before = await getPlaylistPageOrder(page);
				expect(before.length).toBeGreaterThan(1);
				const reversed = [...before].reverse();
				await button.click();
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 10000 }).toEqual(reversed);
				await reloadPage(page, pageType);
				await expect.poll(async () => getPlaylistPageOrder(page), { timeout: 15000 }).toEqual(reversed);
			});
		}
	}
});
