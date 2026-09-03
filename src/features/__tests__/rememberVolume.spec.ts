import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { metadata } from "@/src/features/rememberVolume/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, volume } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { getCurrentVolume, setVolume } from "@/src/utils/_tests/player";
import { readStoredState } from "@/src/utils/_tests/storage";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

// A live stream is a /watch document (isWatchPage() is true, isLivePage() is false), so restoreVolume and
// setupVolumeChangeListener run the identical code path as on watch; the live fixture costs up to 120 s per test.
const testPages = resolvePageTypes(metadata.dependencies?.includePages).filter((pageType) => pageType !== "live");
const { live, shorts, watch } = pageTypeRecord;
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
	test(`restores the per-page remembered volume across an in-page (SPA) navigation on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "rememberVolume.enabled");
		await setVolume(page, volume, watch);
		await expect.poll(() => getCurrentVolume(page, watch), { timeout: 10000 }).toBe(volume);
		await expect.poll(async () => readStoredVolume(page, watch), { timeout: 10000 }).toBe(volume);
		// A genuine in-document navigation is the only path that reaches onNavigate; every helper navigation
		// used by the cases above tears the document down and runs onEnable instead.
		await spaNavigateToRelatedVideo(page);
		await expect
			.poll(() => getCurrentVolume(page, watch), {
				intervals: [200],
				timeout: 10000
			})
			.toBe(volume);
		// restoreVolume re-attaches the volumechange listener, so the video that is playing now has to be
		// recorded as well - a lost listener would freeze the remembered volume at the previous video's value.
		await setVolume(page, 45, watch);
		await expect.poll(async () => readStoredVolume(page, watch), { timeout: 10000 }).toBe(45);
	});
	test(`remembered volume works on the ${live} page type`, async ({ page }) => {
		await navigateToPageType(page, live);
		await enableFeature(page, "rememberVolume.enabled");
		await setVolume(page, volume, live);
		await expect.poll(() => getCurrentVolume(page, live), { timeout: 10000 }).toBe(volume);
		// getCurrentPageType() reports "live", yet the document is a /watch page, so the recording has to land
		// in the watch bucket - a gating regression would leave the state untouched instead.
		await expect.poll(async () => readStoredVolume(page, watch), { timeout: 10000 }).toBe(volume);
		await disableFeature(page, "rememberVolume.enabled");
		await setVolume(page, 80, live);
		await expect.poll(() => getCurrentVolume(page, live), { timeout: 10000 }).toBe(80);
		await enableFeature(page, "rememberVolume.enabled");
		await expect.poll(() => getCurrentVolume(page, live), { timeout: 10000 }).toBe(volume);
	});
	test(`applies the built-in default remembered volume when nothing is stored on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		// hydrateState merges the feature's defaults into its in-page state only; storage is written by the
		// volumechange listener, which has never run on this fresh profile - so nothing is stored yet.
		expect(await readStoredVolume(page, watch)).toBeUndefined();
		// The built-in default, from `state` in src/features/rememberVolume/index.ts.
		const defaultVolume = 25;
		const startingVolume = 80;
		await setVolume(page, startingVolume, watch);
		await expect.poll(() => getCurrentVolume(page, watch), { timeout: 10000 }).toBe(startingVolume);
		await enableFeature(page, "rememberVolume.enabled");
		// A first-time user is pulled onto the built-in default, not left on the volume they were watching at.
		await expect
			.poll(() => getCurrentVolume(page, watch), {
				intervals: [200],
				timeout: 10000
			})
			.toBe(defaultVolume);
		// The restore is also what first puts the default into storage, which proves the value above came from
		// the feature rather than from YouTube's own persisted volume.
		await expect.poll(async () => readStoredVolume(page, watch), { timeout: 10000 }).toBe(defaultVolume);
	});
	test(`a stored volume of 0 is recorded but never restored on ${shorts}`, async ({ page }) => {
		await navigateToPageType(page, shorts);
		await enableFeature(page, "rememberVolume.enabled");
		await setVolume(page, 0, shorts);
		await expect.poll(() => getCurrentVolume(page, shorts), { timeout: 10000 }).toBe(0);
		// The listener has no truthiness guard, so muting is recorded like any other volume.
		await expect.poll(async () => readStoredVolume(page, shorts), { timeout: 10000 }).toBe(0);
		// The intermediate watch visit moves the player off 0 so the missing restore is observable.
		await navigateToPageType(page, watch);
		await setVolume(page, volume, watch);
		await expect.poll(() => getCurrentVolume(page, watch), { timeout: 10000 }).toBe(volume);
		await navigateToPageType(page, shorts);
		// restoreVolume guards on `shortsPageVolume` being truthy, so the muted preference is dropped.
		await expectToStay(async () => (await getCurrentVolume(page, shorts)) !== 0, true, { page });
	});

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
