import { errors, expect, type Page } from "@playwright/test";

import {
	ambientModePathSelectors,
	shortsAmbientModeItemSelector,
	shortsAmbientSwitchSelector,
	shortsMenuButtonSelector,
	shortsOpenSheetSelector,
	shortsSheetItemSelector
} from "@/src/features/automaticallyDisableAmbientMode/constants";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";

export { settingsPanelMenuSelector, shortsOpenSheetSelector };
/** The feature's own watch page entries, legacy and modern player layout. */
export const ambientModeMenuItemSelector = Object.values(ambientModePathSelectors.watch).join(", ");
const openSheetItemsSelector = `${shortsOpenSheetSelector} :is(${shortsSheetItemSelector})`;
const openSheetAmbientRowSelector = `${shortsOpenSheetSelector} :is(${shortsAmbientModeItemSelector})`;

/** What the shorts page holds by way of sheets and rows, for a skip or failure message that says why. */
export async function describeShortsSheet(page: Page): Promise<string> {
	return page.evaluate(
		([menuButton, openSheet, items, row]) => {
			const dropdowns = Array.from(document.querySelectorAll("ytd-popup-container tp-yt-iron-dropdown")).map(
				(element) => `aria-hidden=${element.getAttribute("aria-hidden")} style=${(element.getAttribute("style") ?? "").slice(0, 40)}`
			);
			const visibleItems = Array.from(document.querySelectorAll(items)).map((element) =>
				(element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 30)
			);
			return JSON.stringify({
				ambientRows: document.querySelectorAll(row).length,
				dropdowns,
				menuButtons: document.querySelectorAll(menuButton).length,
				openSheets: document.querySelectorAll(openSheet).length,
				visibleItems
			});
		},
		[shortsMenuButtonSelector, shortsOpenSheetSelector, openSheetItemsSelector, openSheetAmbientRowSelector] as const
	);
}

/**
 * Whether the player's settings menu offers the ambient mode entry. The panel is filled in lazily, so the menu is
 * opened and closed once while hidden, the way the feature itself does it, and left as it was found. Live streams
 * only sometimes carry the entry, which is why the live hunt asks before settling on a stream.
 */
export async function hasAmbientModeMenuItem(page: Page, timeout = 4000): Promise<boolean> {
	const deadline = Date.now() + timeout;
	do {
		const found = await page.evaluate(
			([menuSelector, itemSelector]) => {
				const settingsButton = document.querySelector<HTMLButtonElement>("button.ytp-settings-button");
				const settingsMenu = document.querySelector<HTMLDivElement>(menuSelector);
				if (!settingsButton || !settingsMenu) return false;
				const panel = settingsMenu.querySelector<HTMLDivElement>("div.ytp-panel-menu");
				if (!panel?.hasChildNodes()) {
					settingsMenu.classList.add("hidden");
					settingsButton.click();
					settingsButton.click();
					settingsMenu.classList.remove("hidden");
				}
				return document.querySelector(itemSelector) !== null;
			},
			[settingsPanelMenuSelector, ambientModeMenuItemSelector] as const
		);
		if (found) return true;
		await page.waitForTimeout(500);
	} while (Date.now() < deadline);
	return false;
}

/**
 * Reads the ambient mode switch of the shorts page the way the feature does, through the reel's "more" sheet:
 * opened by a real click, read, and closed again. Resolves to null when the sheet offers no such row, which is the
 * case on every reel after the one the page loaded on, and while the feature itself holds the sheet out of sight.
 * A sheet that does not open on the first press is pressed again, since the button takes a moment to come alive.
 */
export async function readShortsAmbientState(page: Page): Promise<boolean | null> {
	// The feature hides YouTube's popup container while it works the sheet itself; a read waits for that to be over
	// rather than fight it for the one sheet.
	await expect
		.poll(async () => page.locator("ytd-popup-container").evaluate((element) => getComputedStyle(element).display !== "none"), { timeout: 5000 })
		.toBe(true)
		.catch(() => {});
	// Chained locators rather than one selector: the runner's selector engine does not take :is().
	const sheetItems = page.locator(shortsOpenSheetSelector).locator(shortsSheetItemSelector);
	let opened = false;
	for (let attempt = 0; attempt < 3 && !opened; attempt++) {
		if ((await sheetItems.count()) === 0) await page.locator(shortsMenuButtonSelector).first().click();
		opened = await sheetItems
			.first()
			.waitFor({ state: "visible", timeout: 3000 })
			.then(
				() => true,
				(error: unknown) => {
					if (error instanceof errors.TimeoutError) return false;
					throw error;
				}
			);
		if (!opened) await page.waitForTimeout(1000);
	}
	if (!opened) return null;
	// The rows fill in over a few frames; the ambient row gets its own short wait before it counts as absent.
	const row = page.locator(shortsOpenSheetSelector).locator(shortsAmbientModeItemSelector).first();
	const hasRow = await row.waitFor({ state: "visible", timeout: 2000 }).then(
		() => true,
		(error: unknown) => {
			if (error instanceof errors.TimeoutError) return false;
			throw error;
		}
	);
	const state = hasRow ? (await row.locator(shortsAmbientSwitchSelector).first().getAttribute("aria-checked")) === "true" : null;
	await page.keyboard.press("Escape");
	await sheetItems
		.first()
		.waitFor({ state: "hidden", timeout: 5000 })
		.catch(() => {});
	return state;
}
