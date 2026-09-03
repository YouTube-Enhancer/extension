import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/rememberVolume/index.metadata";
import { pageTypeRecord, volume } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getCurrentVolume, setVolume } from "@/src/utils/_tests/player";
import { readStoredState } from "@/src/utils/_tests/storage";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

// A live stream is a /watch document (isWatchPage() is true, isLivePage() is false), so restoreVolume and
// setupVolumeChangeListener run the identical code path as on watch; the live fixture costs up to 120 s per test.
const testPages = resolvePageTypes(metadata.dependencies?.includePages).filter((pageType) => pageType !== "live");
const { home, shorts, watch } = pageTypeRecord;
test.describe("rememberVolume", () => {
	for (const pageType of testPages) {
		test(`video volume shouldn't be remembered when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "rememberVolume.enabled");
			await setVolume(page, volume, pageType);
			await expect.poll(() => getCurrentVolume(page, pageType), { timeout: 10000 }).toBe(volume);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await expect
				.poll(() => getCurrentVolume(page, pageType), {
					intervals: [200],
					timeout: 5000
				})
				.not.toBe(volume);
		});
		test(`persists remembered volume after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "rememberVolume.enabled");
			await setVolume(page, volume, pageType);
			await expect.poll(() => getCurrentVolume(page, pageType), { timeout: 10000 }).toBe(volume);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expect
				.poll(() => getCurrentVolume(page, pageType), {
					intervals: [200],
					timeout: 5000
				})
				.toBe(volume);
		});
		test(`restores original volume when disabled after being enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "rememberVolume.enabled");
			await setVolume(page, volume, pageType);
			await expect.poll(() => getCurrentVolume(page, pageType), { timeout: 10000 }).toBe(volume);
			await disableFeature(page, "rememberVolume.enabled");
			await setVolume(page, 50, pageType);
			await expect.poll(() => getCurrentVolume(page, pageType), { timeout: 10000 }).toBe(50);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await expect
				.poll(() => getCurrentVolume(page, pageType), {
					intervals: [200],
					timeout: 5000
				})
				.not.toBe(volume);
		});
		test(`re-applies volume after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "rememberVolume.enabled");
			await setVolume(page, volume, pageType);
			await expect.poll(() => getCurrentVolume(page, pageType), { timeout: 10000 }).toBe(volume);
			await disableFeature(page, "rememberVolume.enabled");
			await enableFeature(page, "rememberVolume.enabled");
			await expect
				.poll(() => getCurrentVolume(page, pageType), {
					intervals: [200],
					timeout: 5000
				})
				.toBe(volume);
		});
	}
	test.describe("state persistence", () => {
		test("rememberVolume state is stored in extension storage", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "rememberVolume.enabled");
			await setVolume(page, volume, watch);
			await expect.poll(() => getCurrentVolume(page, watch), { timeout: 10000 }).toBe(volume);

			await navigateToPageType(page, shorts);
			await setVolume(page, volume, shorts);
			await expect.poll(() => getCurrentVolume(page, shorts), { timeout: 10000 }).toBe(volume);

			const state = await readStoredState(page);
			const rememberVolumeState = state.rememberVolume as undefined | { shortsPageVolume: number; watchPageVolume: number };
			expect(rememberVolumeState).toBeDefined();
			expect(rememberVolumeState!.watchPageVolume).toBe(volume);
			expect(rememberVolumeState!.shortsPageVolume).toBe(volume);
		});

		test("rememberVolume stores independent volumes per page type", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "rememberVolume.enabled");
			await setVolume(page, 50, watch);
			await expect.poll(() => getCurrentVolume(page, watch), { timeout: 10000 }).toBe(50);

			await navigateToPageType(page, shorts);
			await setVolume(page, 80, shorts);
			await expect.poll(() => getCurrentVolume(page, shorts), { timeout: 10000 }).toBe(80);

			await navigateToPageType(page, watch);
			await expect.poll(() => getCurrentVolume(page, watch), { timeout: 10000 }).not.toBe(80);

			await navigateToPageType(page, shorts);
			await expect.poll(() => getCurrentVolume(page, shorts), { timeout: 10000 }).not.toBe(50);
		});
	});
});
