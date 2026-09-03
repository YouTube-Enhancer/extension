import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { metadata } from "@/src/features/rememberVolume/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, volume } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getCurrentVolume, setVolume } from "@/src/utils/_tests/player";
import { readStoredState } from "@/src/utils/_tests/storage";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

// A live stream is a /watch document (isWatchPage() is true, isLivePage() is false), so restoreVolume and
// setupVolumeChangeListener run the identical code path as on watch; the live fixture costs up to 120 s per test.
const testPages = resolvePageTypes(metadata.dependencies?.includePages).filter((pageType) => pageType !== "live");
const { shorts, watch } = pageTypeRecord;
type RememberVolumeState = { shortsPageVolume: number; watchPageVolume: number };
/** Reads the volume the feature has recorded for `pageType`, or undefined when it never recorded one. */
async function readStoredVolume(page: Page, pageType: PageType): Promise<number | undefined> {
	const { rememberVolume } = (await readStoredState(page)) as { rememberVolume?: RememberVolumeState };
	return pageType === shorts ? rememberVolume?.shortsPageVolume : rememberVolume?.watchPageVolume;
}
test.describe("rememberVolume", () => {
	for (const pageType of testPages) {
		test(`video volume shouldn't be remembered when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "rememberVolume.enabled");
			const storedBefore = await readStoredVolume(page, pageType);
			await setVolume(page, volume, pageType);
			await expect.poll(() => getCurrentVolume(page, pageType), { timeout: 10000 }).toBe(volume);
			// YouTube persists the volume natively, so the player value proves nothing. The observable contract
			// is the extension side: with no volumechange listener the recorded volume never moves.
			await expectToStay(async () => readStoredVolume(page, pageType), storedBefore, { page });
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
		// onDisable only removes the volumechange listener - it never restores a volume - so the observable
		// contract is that the recorded volume stops changing.
		test(`stops recording volume changes after disable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "rememberVolume.enabled");
			await setVolume(page, volume, pageType);
			await expect.poll(() => getCurrentVolume(page, pageType), { timeout: 10000 }).toBe(volume);
			await expect.poll(async () => readStoredVolume(page, pageType), { timeout: 10000 }).toBe(volume);
			await disableFeature(page, "rememberVolume.enabled");
			await setVolume(page, 50, pageType);
			await expect.poll(() => getCurrentVolume(page, pageType), { timeout: 10000 }).toBe(50);
			await expectToStay(async () => readStoredVolume(page, pageType), volume, { page });
		});
		test(`re-applies volume after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "rememberVolume.enabled");
			await setVolume(page, volume, pageType);
			await expect.poll(() => getCurrentVolume(page, pageType), { timeout: 10000 }).toBe(volume);
			await disableFeature(page, "rememberVolume.enabled");
			// With the listener removed the recorded volume stays at `volume`, so re-enabling has to pull the
			// player back off 80 - otherwise the final poll would pass without onEnable doing anything.
			await setVolume(page, 80, pageType);
			await expect.poll(() => getCurrentVolume(page, pageType), { timeout: 10000 }).toBe(80);
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

			// The write travels volumechange -> setState -> content script -> storage, so it has to be polled for.
			await expect
				.poll(async () => (await readStoredState(page)).rememberVolume, { timeout: 10000 })
				.toMatchObject({ shortsPageVolume: volume, watchPageVolume: volume });
		});

		test("rememberVolume stores independent volumes per page type", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "rememberVolume.enabled");
			await setVolume(page, 50, watch);
			await expect.poll(() => getCurrentVolume(page, watch), { timeout: 10000 }).toBe(50);

			await navigateToPageType(page, shorts);
			await setVolume(page, 80, shorts);
			await expect.poll(() => getCurrentVolume(page, shorts), { timeout: 10000 }).toBe(80);

			// The feature stays enabled across both navigations, so onNavigate must restore the exact value it
			// recorded for each page type.
			await navigateToPageType(page, watch);
			await expect.poll(() => getCurrentVolume(page, watch), { timeout: 10000 }).toBe(50);

			await navigateToPageType(page, shorts);
			await expect.poll(() => getCurrentVolume(page, shorts), { timeout: 10000 }).toBe(80);
		});
	});
});
