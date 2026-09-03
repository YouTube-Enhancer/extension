import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { YtButtonViewModelElement, YtLockupViewModelElement } from "@/src/utils/dom/nativeComponents";

import { metadata } from "@/src/features/saveToWatchLaterButton/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPage, navigateToPageType, reloadPage, spaNavigateToRelatedVideo, waitForExtensionReady } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

const BUTTON_CLASS = "yte-save-to-watch-later-button";
const BUTTON_SELECTOR = `.${BUTTON_CLASS}`;
const ACTIONS_ROW_BUTTON_SELECTOR = `ytd-watch-metadata ytd-menu-renderer ${BUTTON_SELECTOR}`;
// Mirrors the feature's own constants and container query (saveToWatchLaterButton/constants.ts, index.ts), so
// the tests only look where the feature is allowed to place a button.
const LOCKUP_SELECTOR = "yt-lockup-view-model";
const LOCKUP_MENU_WRAPPER_SELECTOR = "div.ytLockupMetadataViewModelMenuButton";
const HOME_CONTAINER_SELECTOR = "ytd-two-column-browse-results-renderer[page-subtype='home']";
// Marks the one card a test acts on, so later assertions cannot silently pass on a different card.
const MARKED_LOCKUP_ATTRIBUTE = "data-yte-test-lockup";
// The saved/unsaved state is carried by the icon and the label the feature puts on the native button.
const SAVED_ICON = "CHECK_CIRCLE_THICK";
const UNSAVED_ICON = "WATCH_LATER";
const SAVE_LABEL = "Save to Watch Later";
const REMOVE_LABEL = "Remove from Watch Later";
// YouTube's pipeline toasts the save itself; the feature only toasts the removal.
const REMOVED_TOAST_TEXT = "Removed from Watch Later";
const { home, watch } = pageTypeRecord;

async function clickActionsRowButton(page: Page): Promise<void> {
	await page.locator(`${ACTIONS_ROW_BUTTON_SELECTOR} button`).first().click();
}

async function expectRemovedToast(page: Page): Promise<void> {
	await expect(page.getByText(REMOVED_TOAST_TEXT).first()).toBeVisible({ timeout: 10000 });
}

/** Marks the feed card built from `videoId`, so later assertions cannot silently pass on a different card. */
async function markCardForVideo(page: Page, videoId: string): Promise<void> {
	const marked = await page.evaluate(
		({ buttonClass, containerSelector, lockupSelector, marker, videoId }) => {
			const container = document.querySelector(containerSelector);
			if (!container) return false;
			for (const lockup of container.querySelectorAll(lockupSelector)) {
				if (!lockup.querySelector(`.${buttonClass}`)) continue;
				const { rawProps } = lockup as YtLockupViewModelElement;
				const contentId = typeof rawProps?.data === "function" ? rawProps.data().contentId : null;
				if (contentId !== videoId) continue;
				lockup.setAttribute(marker, "");
				return true;
			}
			return false;
		},
		{
			buttonClass: BUTTON_CLASS,
			containerSelector: HOME_CONTAINER_SELECTOR,
			lockupSelector: LOCKUP_SELECTOR,
			marker: MARKED_LOCKUP_ATTRIBUTE,
			videoId
		}
	);
	expect(marked, `no feed card with a save button for video ${videoId}`).toBe(true);
}

/** Reads the icon prop the feature put on the actions-row button; a state change replaces the whole host. */
async function readActionsRowIcon(page: Page): Promise<null | string> {
	return page.evaluate((selector) => {
		const host = document.querySelector<YtButtonViewModelElement>(selector);
		const iconName: unknown = host?.rawProps?.data.iconName;
		return typeof iconName === "string" ? iconName : null;
	}, ACTIONS_ROW_BUTTON_SELECTOR);
}

/** Returns the video ids of the first `limit` feed cards that carry a save button. */
async function readCardVideoIds(page: Page, limit: number): Promise<string[]> {
	return page.evaluate(
		({ buttonClass, containerSelector, limit, lockupSelector }) => {
			const container = document.querySelector(containerSelector);
			const ids: string[] = [];
			if (!container) return ids;
			for (const lockup of container.querySelectorAll(lockupSelector)) {
				if (ids.length >= limit) break;
				if (!lockup.querySelector(`.${buttonClass}`)) continue;
				const { rawProps } = lockup as YtLockupViewModelElement;
				const contentId = typeof rawProps?.data === "function" ? rawProps.data().contentId : null;
				// YouTube video ids have exactly 11 characters, and one video can occupy two cards.
				if (typeof contentId === "string" && /^[\w-]{11}$/.test(contentId) && !ids.includes(contentId)) ids.push(contentId);
			}
			return ids;
		},
		{ buttonClass: BUTTON_CLASS, containerSelector: HOME_CONTAINER_SELECTOR, limit, lockupSelector: LOCKUP_SELECTOR }
	);
}

/**
 * Counts the feed cards the feature is responsible for, using its own eligibility rules: a lockup with
 * unreadable data can hydrate on a later pass, and a lockup without YouTube's menu wrapper has nowhere to put
 * a button, so neither is counted as a miss.
 */
async function readLockupStats(page: Page) {
	return page.evaluate(
		({ buttonClass, containerSelector, lockupSelector, menuWrapperSelector }) => {
			const container = document.querySelector(containerSelector);
			const lockups = container ? [...container.querySelectorAll(lockupSelector)] : [];
			const stats = { nonVideo: 0, nonVideoWithButton: 0, saveable: 0, saveableMissingButton: 0 };
			for (const lockup of lockups) {
				const { rawProps } = lockup as YtLockupViewModelElement;
				if (typeof rawProps?.data !== "function") continue;
				const { contentId, contentType } = rawProps.data();
				const hasButton = lockup.querySelector(`.${buttonClass}`) !== null;
				const isSaveable = contentType ? contentType === "LOCKUP_CONTENT_TYPE_VIDEO" : typeof contentId === "string" && /^[\w-]{11}$/.test(contentId);
				if (!isSaveable) {
					stats.nonVideo++;
					if (hasButton) stats.nonVideoWithButton++;
					continue;
				}
				if (!lockup.querySelector(menuWrapperSelector)) continue;
				stats.saveable++;
				if (!hasButton) stats.saveableMissingButton++;
			}
			return stats;
		},
		{
			buttonClass: BUTTON_CLASS,
			containerSelector: HOME_CONTAINER_SELECTOR,
			lockupSelector: LOCKUP_SELECTOR,
			menuWrapperSelector: LOCKUP_MENU_WRAPPER_SELECTOR
		}
	);
}

/**
 * Resolves whether a video is already in Watch Later, in a throwaway tab so the page under test keeps its feed
 * and its marked card. Card buttons are always built in the unsaved state (buttons.ts `createSaveButton`
 * defaults `saved` to false), so the actions-row button on the video's own watch page is the only surface that
 * runs the `isVideoInPlaylist` check. Returns null when the state could not be resolved, so a video that
 * cannot be read is never mistaken for an unsaved one.
 */
async function readWatchLaterMembership(page: Page, videoId: string): Promise<boolean | null> {
	const probe = await page.context().newPage();
	try {
		await navigateToPage(probe, `https://www.youtube.com/watch?v=${videoId}`);
		await waitForExtensionReady(probe);
		await expect(probe.locator(ACTIONS_ROW_BUTTON_SELECTOR)).toBeAttached({ timeout: 20000 });
		return (await settleActionsRowIcon(probe)) === SAVED_ICON;
	} catch {
		return null;
	} finally {
		await probe.close();
	}
}

/** Scrolls the feed to its end until `predicate` holds. Returns false instead of failing when it never does. */
async function scrollFeedUntil(page: Page, predicate: () => Promise<boolean>, timeout = 45000): Promise<boolean> {
	try {
		await expect
			.poll(
				async () => {
					await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
					return predicate();
				},
				{ intervals: [1000], timeout }
			)
			.toBe(true);
		return true;
	} catch {
		return false;
	}
}

/**
 * The actions-row button is inserted in the last known state and only corrected once `isVideoInPlaylist`
 * resolves. That round trip has no DOM completion signal, so wait for the icon to hold still instead.
 */
async function settleActionsRowIcon(page: Page): Promise<string> {
	let lastIcon: null | string = null;
	let stableSamples = 0;
	await expect
		.poll(
			async () => {
				const icon = await readActionsRowIcon(page);
				stableSamples = icon !== null && icon === lastIcon ? stableSamples + 1 : 0;
				lastIcon = icon;
				return stableSamples;
			},
			{ intervals: [500], timeout: 30000 }
		)
		.toBeGreaterThanOrEqual(10);
	expect(lastIcon).not.toBeNull();
	return lastIcon!;
}

test.describe("saveToWatchLaterButton", () => {
	for (const pageType of testPages) {
		test(`save button should appear when enabled on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
		});

		test(`save button should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
			await disableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR)).not.toBeAttached();
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
		});
	}

	// getFixture is deterministic, so the old per-page-type test navigated to the URL it was already on. Only
	// watch has a genuine in-page navigation, and it is also the only page with the actions-row button.
	test(`save button should persist after in-page navigation on ${watch}`, async ({ page }) => {
		test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
		await navigateToPageType(page, watch);
		await enableFeature(page, "saveToWatchLaterButton.enabled");
		await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
		await spaNavigateToRelatedVideo(page);
		await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
		// onNavigate removes the stale actions-row button before rebuilding it, so the next video gets exactly one.
		await expect.poll(async () => page.locator(ACTIONS_ROW_BUTTON_SELECTOR).count(), { timeout: 10000 }).toBe(1);
	});

	// The load-time path branches only on `onWatchPage`; subscriptions only repeats the home page-type interpolation.
	for (const pageType of [home, watch] as const) {
		test(`save button should persist after full page reload on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
			await page.reload();
			await navigateToPageType(page, pageType);
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
		});
	}

	test(`save button should be removed when navigating in-page to a non-target page`, async ({ page }) => {
		test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
		await navigateToPageType(page, home);
		await enableFeature(page, "saveToWatchLaterButton.enabled");
		await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
		// A cold load of a non-target page cannot fail: the feature only observes containers that page never
		// renders. Clicking through to a channel page makes the page gate run the removal instead.
		const channelLink = page.locator('ytd-rich-grid-renderer a[href^="/@"]').first();
		await expect(channelLink).toBeAttached({ timeout: 15000 });
		await channelLink.evaluate((el) => el.scrollIntoView({ block: "center" }));
		await channelLink.click();
		await page.waitForURL((url) => url.pathname.startsWith("/@"), { timeout: 30000 });
		await expect(page.locator("html[yte-ready]")).toBeAttached();
		await expectToStay(async () => page.locator(BUTTON_SELECTOR).count(), 0, { page });
	});

	test.describe("watch page actions row", () => {
		test("renders a native toggle button in the actions row", async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, watch);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			const actionsRowButton = page.locator(ACTIONS_ROW_BUTTON_SELECTOR);
			await expect(actionsRowButton).toBeAttached({ timeout: 10000 });
			// The button is built from YouTube's own component, so the props we set have to survive its render.
			const iconName = await actionsRowButton.evaluate((el) => (el as YtButtonViewModelElement).rawProps?.data.iconName);
			expect(iconName).toBe("WATCH_LATER");
			await expect(actionsRowButton.locator("button")).toHaveAccessibleName("Save to Watch Later", { timeout: 10000 });
		});

		test("clicking the actions row button toggles between the save and saved states", async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			test.setTimeout(120_000);
			await navigateToPageType(page, watch);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			const actionsRowButton = page.locator(ACTIONS_ROW_BUTTON_SELECTOR);
			await expect(actionsRowButton).toBeAttached({ timeout: 15000 });
			// Both clicks are asserted against the settled starting state, and the second click restores it, so
			// the run leaves the account exactly as it found it whichever state the video starts in.
			const initialIcon = await settleActionsRowIcon(page);
			// An unknown settled state would make the direction below guesswork, and a wrong guess is exactly what
			// would leave the account changed.
			expect([SAVED_ICON, UNSAVED_ICON], "the actions row button settled in an unknown state").toContain(initialIcon);
			const flippedIcon = initialIcon === SAVED_ICON ? UNSAVED_ICON : SAVED_ICON;
			await clickActionsRowButton(page);
			await expect.poll(async () => readActionsRowIcon(page), { timeout: 15000 }).toBe(flippedIcon);
			await expect(actionsRowButton.locator("button").first()).toHaveAccessibleName(flippedIcon === SAVED_ICON ? REMOVE_LABEL : SAVE_LABEL, {
				timeout: 10000
			});
			if (flippedIcon === UNSAVED_ICON) await expectRemovedToast(page);
			await clickActionsRowButton(page);
			await expect.poll(async () => readActionsRowIcon(page), { timeout: 15000 }).toBe(initialIcon);
			await expect(actionsRowButton.locator("button").first()).toHaveAccessibleName(initialIcon === SAVED_ICON ? REMOVE_LABEL : SAVE_LABEL, {
				timeout: 10000
			});
			if (initialIcon === UNSAVED_ICON) await expectRemovedToast(page);
		});

		test("actions row button shows the saved state for a video already in Watch Later", async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			test.setTimeout(180_000);
			await navigateToPageType(page, watch);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(ACTIONS_ROW_BUTTON_SELECTOR)).toBeAttached({ timeout: 15000 });
			const initialIcon = await settleActionsRowIcon(page);
			if (initialIcon === UNSAVED_ICON) {
				await clickActionsRowButton(page);
				await expect.poll(async () => readActionsRowIcon(page), { timeout: 15000 }).toBe(SAVED_ICON);
			}
			// A fresh load always inserts the button unsaved, so only the membership check can turn it saved.
			await reloadPage(page, watch);
			await expect(page.locator(ACTIONS_ROW_BUTTON_SELECTOR)).toBeAttached({ timeout: 15000 });
			await expect.poll(async () => readActionsRowIcon(page), { timeout: 30000 }).toBe(SAVED_ICON);
			await expect(page.locator(`${ACTIONS_ROW_BUTTON_SELECTOR} button`).first()).toHaveAccessibleName(REMOVE_LABEL, { timeout: 10000 });
			if (initialIcon === UNSAVED_ICON) {
				// Leave the account as it was found.
				await clickActionsRowButton(page);
				await expect.poll(async () => readActionsRowIcon(page), { timeout: 15000 }).toBe(UNSAVED_ICON);
				await expectRemovedToast(page);
			}
		});
	});

	test.describe("home feed cards", () => {
		test("clicking a card save button saves the video and removes that card's button for good", async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			test.setTimeout(240_000);
			await navigateToPageType(page, home);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
			// This test ends by removing the video from Watch Later, so it may only ever act on a video that was
			// not in the list to begin with. Only a candidate whose membership resolves to a definite false is
			// used; an unresolved one is left alone rather than assumed unsaved.
			const candidateIds = await readCardVideoIds(page, 3);
			expect(candidateIds.length, "no feed card with a save button and a readable video id").toBeGreaterThan(0);
			let videoId: null | string = null;
			for (const candidateId of candidateIds) {
				if ((await readWatchLaterMembership(page, candidateId)) !== false) continue;
				videoId = candidateId;
				break;
			}
			test.skip(videoId === null, "no feed card resolved to a video that is not already in the user's Watch Later list");
			await page.bringToFront();
			await markCardForVideo(page, videoId!);
			const markedLockup = page.locator(`${LOCKUP_SELECTOR}[${MARKED_LOCKUP_ATTRIBUTE}]`);
			const cardButton = markedLockup.locator(BUTTON_SELECTOR);
			await expect(cardButton).toBeVisible();
			await cardButton.click();
			// markLockupSaved is the only thing stopping the next observer pass from re-adding the button, and
			// the card itself has to stay put, so a vanished card cannot pass this for the wrong reason.
			await expect(cardButton).not.toBeAttached({ timeout: 10000 });
			await expectToStay(async () => ({ buttons: await cardButton.count(), cards: await markedLockup.count() }), { buttons: 0, cards: 1 }, { page });
			// Only the saved card is skipped: its neighbours keep their buttons.
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached();
			// The save reached YouTube: the video's own page reports it as a member of Watch Later.
			await navigateToPage(page, `https://www.youtube.com/watch?v=${videoId!}`);
			await waitForExtensionReady(page);
			await expect(page.locator(ACTIONS_ROW_BUTTON_SELECTOR)).toBeAttached({ timeout: 15000 });
			await expect.poll(async () => readActionsRowIcon(page), { timeout: 30000 }).toBe(SAVED_ICON);
			// Leave the account as it was found: the pre-check proved this video was not in Watch Later.
			await clickActionsRowButton(page);
			await expect.poll(async () => readActionsRowIcon(page), { timeout: 15000 }).toBe(UNSAVED_ICON);
			await expectRemovedToast(page);
		});

		test("card save button is placed in the lockup menu wrapper and keeps that wrapper visible", async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, home);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			const cardButton = page.locator(`${LOCKUP_SELECTOR} ${LOCKUP_MENU_WRAPPER_SELECTOR} > ${BUTTON_SELECTOR}`).first();
			await expect(cardButton).toBeAttached({ timeout: 10000 });
			// YouTube only reveals the menu wrapper on hover; index.css is what keeps the save button reachable.
			await expect(page.locator(`${LOCKUP_SELECTOR}:has(${BUTTON_SELECTOR}) ${LOCKUP_MENU_WRAPPER_SELECTOR}`).first()).toHaveCSS("display", "flex");
			await expect(cardButton).toBeVisible();
			// buttons.ts inserts it before YouTube's own menu button rather than appending it anywhere.
			const sitsBeforeNativeMenuButton = await cardButton.evaluate((el) => {
				const nativeMenuButton = el.parentElement?.querySelector("button-view-model");
				return !!nativeMenuButton && (el.compareDocumentPosition(nativeMenuButton) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
			});
			expect(sitsBeforeNativeMenuButton).toBe(true);
		});

		test("no save button is added to mix, playlist or album lockups", async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			test.setTimeout(120_000);
			await navigateToPageType(page, home);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
			// Mixes, playlists and albums appear further down the feed than the first screen of videos.
			const foundNonVideoLockups = await scrollFeedUntil(page, async () => (await readLockupStats(page)).nonVideo > 0);
			test.skip(!foundNonVideoLockups, "the home feed rendered no mix, playlist or album lockups");
			await expectToStay(
				async () => {
					const { nonVideo, nonVideoWithButton } = await readLockupStats(page);
					return { hasNonVideoLockups: nonVideo > 0, nonVideoWithButton };
				},
				{ hasNonVideoLockups: true, nonVideoWithButton: 0 },
				{ page }
			);
		});

		test("lazily loaded feed cards receive a save button", async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			test.setTimeout(120_000);
			await navigateToPageType(page, home);
			await enableFeature(page, "saveToWatchLaterButton.enabled");
			await expect(page.locator(BUTTON_SELECTOR).first()).toBeAttached({ timeout: 10000 });
			const { saveable: saveableBeforeScrolling } = await readLockupStats(page);
			expect(saveableBeforeScrolling).toBeGreaterThan(0);
			// A new batch of cards can only be reached by the MutationObserver pass, not by the initial run.
			const feedGrew = await scrollFeedUntil(page, async () => (await readLockupStats(page)).saveable > saveableBeforeScrolling);
			test.skip(!feedGrew, "the home feed rendered no additional cards while scrolling");
			await expect
				.poll(
					async () => {
						const { saveable, saveableMissingButton } = await readLockupStats(page);
						return { grew: saveable > saveableBeforeScrolling, saveableMissingButton };
					},
					{ timeout: 15000 }
				)
				.toEqual({ grew: true, saveableMissingButton: 0 });
		});
	});
});
