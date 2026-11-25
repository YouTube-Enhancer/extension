import { errors, type Page } from "@playwright/test";

import {
	ambientModePathSelectors,
	shortsAmbientModeItemSelector,
	shortsAmbientSwitchSelector,
	shortsMenuButtonSelector,
	shortsOpenSheetSelector,
	shortsSheetItemSelector
} from "@/src/features/automaticallyDisableAmbientMode/constants";
import { settingsPanelMenuSelector } from "@/src/utils/dom/selectors";
import { expect } from "@/tests/harness";

export { settingsPanelMenuSelector, shortsOpenSheetSelector };
/** The feature's own watch page entries, legacy and modern player layout. */
export const ambientModeMenuItemSelector = Object.values(ambientModePathSelectors.watch).join(", ");
const openSheetItemsSelector = `${shortsOpenSheetSelector} :is(${shortsSheetItemSelector})`;
const openSheetAmbientRowSelector = `${shortsOpenSheetSelector} :is(${shortsAmbientModeItemSelector})`;

/** What the shorts page holds by way of sheets and rows, for a skip or failure message that says why. */
export async function describeShortsSheet(page: Page): Promise<string> {
	return page.evaluate(
		([menuButton, openSheet, items, row]) => {
			const dropdowns = Array.from(
				document.querySelectorAll("ytd-popup-container tp-yt-iron-dropdown")
			).map(
				(element) =>
					`aria-hidden=${element.getAttribute("aria-hidden")} style=${(element.getAttribute("style") ?? "").slice(0, 40)}`
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
		[
			shortsMenuButtonSelector,
			shortsOpenSheetSelector,
			openSheetItemsSelector,
			openSheetAmbientRowSelector
		] as const
	);
}

/**
 * Puts the shorts page's ambient mode switch on, for a test that needs ambient mode on before the feature can be
 * expected to turn it off. A settled read answers an already-on switch without a click; otherwise the sheet is
 * opened, the switch is clicked the way the feature clicks it when it reads off, and the sheet is closed with
 * Escape on every path out before the state is polled for, since the switch may apply a moment later. Resolves to
 * whether ambient mode really reached on: if YouTube refuses the click - the old "cannot be switched on as a
 * precondition" claim, which this helper exists to test - the answer is false and the caller skips.
 */
export async function ensureShortsAmbientOn(page: Page): Promise<boolean> {
	if ((await readSettledShortsAmbientState(page)) === true) return true;
	// Opened outside the guarded block: a container still hidden after the budget is an environment problem the
	// reads surface rather than swallow, so it stays a failure instead of becoming a quiet skip.
	const opened = await openShortsSheet(page);
	try {
		if (!opened) return false;
		const state = await readOpenShortsAmbientState(page);
		if (state === true) return true;
		if (state === null) return false;
		const toggle = page
			.locator(shortsOpenSheetSelector)
			.locator(shortsAmbientModeItemSelector)
			.first()
			.locator(shortsAmbientSwitchSelector)
			.first();
		// A click that cannot land (detached, covered, timed out) is YouTube refusing, not a test failure: the
		// caller's skip says so, and the poll below decides for the slower refusals.
		await toggle.click({ timeout: 5000 });
	} catch {
		return false;
	} finally {
		await closeShortsSheet(page);
	}
	try {
		await expect
			.poll(async () => readShortsAmbientState(page), { intervals: [1500], timeout: 12_000 })
			.toBe(true);
		return true;
	} catch {
		return false;
	}
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
				const settingsButton = document.querySelector<HTMLButtonElement>(
					"button.ytp-settings-button"
				);
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
 * The sheet's ambient mode answer once it has stopped flaking: polled for ~15 s until the row exists and its
 * switch reads, the way the assertions in the specs poll, so that one starved read under suite load cannot decide
 * a skip on its own.
 */
export async function readSettledShortsAmbientState(page: Page): Promise<boolean | null> {
	let settled: boolean | null = null;
	await expect
		.poll(
			async () => {
				settled = await readShortsAmbientState(page);
				return settled;
			},
			{ intervals: [1500], timeout: 15_000 }
		)
		.not.toBeNull();
	return settled;
}

/**
 * Reads the ambient mode switch of the shorts page the way the feature does, through the reel's "more" sheet:
 * opened by a real click, read, and closed again. Resolves to null when the sheet offers no such row, which is the
 * case on every reel after the one the page loaded on, and while the feature itself holds the sheet out of sight.
 */
export async function readShortsAmbientState(page: Page): Promise<boolean | null> {
	if (!(await openShortsSheet(page))) return null;
	const state = await readOpenShortsAmbientState(page);
	await closeShortsSheet(page);
	return state;
}

/** Closes the sheet the way the feature leaves it: Escape, then a short wait for the dropdown to be gone. */
async function closeShortsSheet(page: Page): Promise<void> {
	await page.keyboard.press("Escape");
	await page
		.locator(shortsOpenSheetSelector)
		.locator(shortsSheetItemSelector)
		.first()
		.waitFor({ state: "hidden", timeout: 5000 })
		.catch(() => {});
}

/**
 * Waits out the feature's own hold on the popup container and opens the reel's "more" sheet with real presses.
 * The feature hides YouTube's popup container while it works the sheet itself; a caller waits for that to be over
 * rather than fight it for the one sheet. The wait surfaces its timeout instead of swallowing it: a container
 * still hidden after the budget means no sheet can be seen at all, and proceeding silently used to turn that into
 * a false "no ambient row" answer. A sheet that does not open on the first press is pressed again, since the
 * button takes a moment to come alive. Resolves to whether the sheet opened.
 */
async function openShortsSheet(page: Page): Promise<boolean> {
	await expect
		.poll(
			async () =>
				page
					.locator("ytd-popup-container")
					.evaluate((element) => getComputedStyle(element).display !== "none"),
			{ timeout: 15_000 }
		)
		.toBe(true);
	// Chained locators rather than one selector: the runner's selector engine does not take :is().
	const sheetItems = page.locator(shortsOpenSheetSelector).locator(shortsSheetItemSelector);
	let opened = false;
	for (let attempt = 0; attempt < 3 && !opened; attempt++) {
		if ((await sheetItems.count()) === 0)
			await page.locator(shortsMenuButtonSelector).first().click();
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
	return opened;
}

/**
 * Reads the ambient mode switch out of an already open sheet, so the open/close pair stays with the two functions
 * that own it. Resolves to null when the sheet offers no such row; the rows fill in over a few frames, so the
 * ambient row gets its own short wait before it counts as absent.
 */
async function readOpenShortsAmbientState(page: Page): Promise<boolean | null> {
	const row = page.locator(shortsOpenSheetSelector).locator(shortsAmbientModeItemSelector).first();
	const hasRow = await row.waitFor({ state: "visible", timeout: 2000 }).then(
		() => true,
		(error: unknown) => {
			if (error instanceof errors.TimeoutError) return false;
			throw error;
		}
	);
	if (!hasRow) return null;
	return (
		(await row.locator(shortsAmbientSwitchSelector).first().getAttribute("aria-checked")) === "true"
	);
}
