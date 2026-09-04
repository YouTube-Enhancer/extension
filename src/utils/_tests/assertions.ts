import { expect, type Page } from "@playwright/test";

import type { PageType } from "@/src/features/_registry/types";
import type { YoutubePlayerQualityLevel } from "@/src/features/playerQuality/types";
import type { ButtonPlacement, FeatureButtonId, FeatureMenuItemId } from "@/src/types";

import { placementSelectors } from "@/src/utils/_tests/constants";
import { getValueFromYouTubePlayer } from "@/src/utils/_tests/player";

/** Fails when none of the selectors matches an element on the page. */
export async function expectAnyMatch(page: Page, selectors: readonly string[], { timeout = 10000 }: { timeout?: number } = {}): Promise<void> {
	await expect
		.poll(async () => page.evaluate((list) => list.some((selector) => document.querySelector(selector) !== null), [...selectors]), {
			message: `expected at least one element matching: ${selectors.join(", ")}`,
			timeout
		})
		.toBe(true);
}
export async function expectBodyWithClass(page: Page, bodyClass: string, { timeout = 10000 }: { timeout?: number } = {}): Promise<void> {
	await expect(page.locator("body")).toHaveClass(new RegExp(`(^|\\s)${bodyClass}(\\s|$)`), { timeout });
}
export async function expectBodyWithoutClass(page: Page, bodyClass: string, { timeout = 10000 }: { timeout?: number } = {}): Promise<void> {
	await expect(page.locator("body")).not.toHaveClass(new RegExp(`(^|\\s)${bodyClass}(\\s|$)`), { timeout });
}
/**
 * Asserts the player never reports `expectedQuality` during a settle window. Enforcement is asynchronous, so a
 * single read would sample before the feature could have acted.
 */
export async function expectCurrentQualityLevelToBeFalsy(page: Page, pageType: PageType = "watch", expectedQuality: YoutubePlayerQualityLevel) {
	await expectToStay(
		async () => {
			const currentQualityLevel = await getValueFromYouTubePlayer(page, "getPlaybackQuality", pageType);
			expect(currentQualityLevel).toBeTruthy();
			return currentQualityLevel !== expectedQuality;
		},
		true,
		{ page }
	);
}
export async function expectCurrentQualityLevelToBeTruthy(
	page: Page,
	pageType: PageType = "watch",
	expectedQuality: YoutubePlayerQualityLevel,
	{ timeout = 10000 }: { timeout?: number } = {}
) {
	await expect.poll(async () => getValueFromYouTubePlayer(page, "getPlaybackQuality", pageType), { timeout }).toBe(expectedQuality);
}
/**
 * Asserts every element matching the selectors is hidden. With `mode: "any"` a single hidden match is enough.
 * With `requireMatch` the assertion fails when no selector matches anything, instead of passing vacuously.
 */
export async function expectElementsHidden(
	page: Page,
	selectors: readonly string[],
	{ mode = "all", requireMatch = false }: { mode?: "all" | "any"; requireMatch?: boolean } = {}
): Promise<void> {
	if (requireMatch) await expectAnyMatch(page, selectors);
	for (const selector of selectors) {
		const locator = page.locator(selector);
		for (let count = await locator.count(), i = 0; i < count; i++) {
			if (mode === "any") {
				try {
					await expect(locator.nth(i)).toHaveCSS("display", "none", { timeout: 1000 });
					return;
				} catch {}
				continue;
			}
			await expect(locator.nth(i)).toHaveCSS("display", "none");
		}
	}
	if (mode === "any") throw new Error("No selectors matched the expected state");
}
export async function expectElementsNotHidden(
	page: Page,
	selectors: readonly string[],
	{ mode = "all", requireMatch = false }: { mode?: "all" | "any"; requireMatch?: boolean } = {}
): Promise<void> {
	if (requireMatch) await expectAnyMatch(page, selectors);
	for (const selector of selectors) {
		const locator = page.locator(selector);
		for (let count = await locator.count(), i = 0; i < count; i++) {
			if (mode === "any") {
				try {
					await expect(locator.nth(i)).not.toHaveCSS("display", "none", { timeout: 1000 });
					return;
				} catch {}
				continue;
			}
			await expect(locator.nth(i)).not.toHaveCSS("display", "none");
		}
	}
	if (mode === "any") throw new Error("No selectors matched the expected state");
}
export async function expectFeatureButtonToBeFalsy(page: Page, featureId: FeatureButtonId) {
	const featureButton = page.locator(`#${featureId}`);
	await expect(featureButton).not.toBeAttached();
}
export async function expectFeatureButtonToBeIn(
	page: Page,
	featureId: FeatureButtonId,
	placement: Exclude<ButtonPlacement, "feature_menu">,
	{ timeout = 10000 }: { timeout?: number } = {}
) {
	const { [placement]: selector } = placementSelectors;
	const container = page.locator(selector);
	await expect(container).toBeAttached({ timeout });
	const button = container.locator(`#${featureId}`);
	await expect(button).toBeAttached({ timeout });
}
/** The button controller places buttons once the player controls exist, which a live player renders late. */
// 30 s: a live stream's player controls, where the buttons go, can take twice as long to settle as a video's.
export async function expectFeatureButtonToBeTruthy(page: Page, featureId: FeatureButtonId, { timeout = 30000 }: { timeout?: number } = {}) {
	const featureButton = page.locator(`#${featureId}`);
	await expect(featureButton).toBeAttached({ timeout });
}
export async function expectFeatureMenuItemToBeFalsy(page: Page, featureId: FeatureMenuItemId) {
	const menuItem = page.locator(`#${featureId}`);
	await expect(menuItem).not.toBeAttached();
}
export async function expectFeatureMenuItemToBeTruthy(page: Page, featureId: FeatureMenuItemId) {
	const menuItem = page.locator(`#${featureId}`);
	await expect(menuItem).toBeAttached();
}
/** Asserts a toggle button's checked state (aria-checked) and, optionally, its title text. */
export async function expectToggleButtonState(
	page: Page,
	featureId: FeatureButtonId,
	checked: boolean,
	{ timeout = 10000, title }: { timeout?: number; title?: RegExp | string } = {}
): Promise<void> {
	const button = page.locator(`#${featureId}`);
	await expect(button).toHaveAttribute("aria-checked", String(checked), { timeout });
	if (title !== undefined) await expect(button).toHaveAttribute("data-title", title, { timeout });
}
/**
 * Asserts that `getter` keeps returning `expected` for the whole settle window. Use it for negative tests
 * ("X does not happen"), where a single poll would pass on its first sample before the feature could act.
 */
export async function expectToStay(
	getter: () => Promise<unknown>,
	expected: unknown,
	{ durationMs = 3000, intervalMs = 250, page }: { durationMs?: number; intervalMs?: number; page: Page }
): Promise<void> {
	const end = Date.now() + durationMs;
	do {
		expect(await getter()).toEqual(expected);
		await page.waitForTimeout(intervalMs);
	} while (Date.now() < end);
}
