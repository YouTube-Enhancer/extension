import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { ambientModeMenuItemSelector, settingsPanelMenuSelector } from "@/src/utils/_tests/ambient";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { ensurePlayerControlsVisible } from "@/src/utils/_tests/pageSetup";

// Narrowed from the feature's ["watch", "shorts"] pages: onEnable passes no pageTypes, so executeWithRetries falls back to ["watch", "live"] and isOnAllowedPage returns false on /shorts, so the shorts expansion never exercises the feature.
const testPages: readonly PageType[] = [pageTypeRecord.watch];
const { live, watch } = pageTypeRecord;

/**
 * One attempt at driving ambient mode through the player settings menu, the same control the feature toggles.
 * Resolves to whether ambient mode now matches `desired`.
 */
async function applyAmbientState(page: Page, desired: boolean): Promise<boolean> {
	return page.evaluate(
		([menuSelector, itemSelector, desiredState]) => {
			const isAmbientActive = () => {
				const container = document.querySelector("ytd-watch-flexy") ?? document.querySelector("ytd-watch-grid");
				return container?.hasAttribute("cinematics-active") ?? false;
			};
			if (isAmbientActive() === desiredState) return true;
			const settingsButton = document.querySelector<HTMLButtonElement>("button.ytp-settings-button");
			const settingsMenu = document.querySelector<HTMLDivElement>(menuSelector);
			if (!settingsButton || !settingsMenu) return false;
			const settingsPanelMenu = settingsMenu.querySelector<HTMLDivElement>("div.ytp-panel-menu");
			if (!settingsPanelMenu?.hasChildNodes()) {
				// The panel is filled in lazily; opening and closing it once populates the menu items.
				settingsMenu.classList.add("hidden");
				settingsButton.click();
				settingsButton.click();
				return false;
			}
			const ambientModeMenuItem = document.querySelector<HTMLElement>(itemSelector);
			if (!ambientModeMenuItem) {
				settingsMenu.classList.remove("hidden");
				return false;
			}
			ambientModeMenuItem.click();
			settingsMenu.classList.remove("hidden");
			return isAmbientActive() === desiredState;
		},
		[settingsPanelMenuSelector, ambientModeMenuItemSelector, desired] as const
	);
}
/** Describes what the player settings menu offers, so a failed toggle says why instead of only that it failed. */
async function describeAmbientMenu(page: Page): Promise<string> {
	return page.evaluate((menuSelector) => {
		const shell = document.querySelector("ytd-watch-flexy") ?? document.querySelector("ytd-watch-grid");
		const menu = document.querySelector<HTMLDivElement>(menuSelector);
		const panel = menu?.querySelector<HTMLDivElement>("div.ytp-panel-menu");
		const items = Array.from(panel?.querySelectorAll<HTMLElement>(".ytp-menuitem") ?? []).map((item) => {
			const label = item.querySelector(".ytp-menuitem-label")?.textContent?.trim() ?? "";
			const path = item.querySelector("svg path")?.getAttribute("d")?.slice(0, 40) ?? "";
			return `${label} [${path}]`;
		});
		return JSON.stringify({
			cinematicsActive: shell?.hasAttribute("cinematics-active") ?? null,
			darkTheme: document.documentElement.hasAttribute("dark"),
			hasSettingsButton: !!document.querySelector("button.ytp-settings-button"),
			items,
			menuClass: menu?.className ?? null,
			shell: shell?.tagName ?? null
		});
	}, settingsPanelMenuSelector);
}
async function getAmbientState(page: Page): Promise<boolean | null> {
	return await page.evaluate(() => {
		const flexy = document.querySelector("ytd-watch-flexy");
		if (flexy) {
			return flexy.hasAttribute("cinematics-active");
		}
		const grid = document.querySelector("ytd-watch-grid");
		if (grid) {
			return grid.hasAttribute("cinematics-active");
		}
		return null;
	});
}
/**
 * Drives ambient mode through the player settings menu. Tests use it to establish that ambient mode really was on,
 * so that a later `toBe(false)` can only pass because the feature acted.
 */
async function setAmbientState(page: Page, desired: boolean): Promise<void> {
	if (await trySetAmbientState(page, desired)) return;
	expect(false, `expected ambient mode to be turned ${desired ? "on" : "off"}; ${await describeAmbientMenu(page)}`).toBe(true);
}
/**
 * Like {@link setAmbientState} but resolves to `false` instead of failing when the page exposes no working ambient
 * mode control, so a test can skip rather than fail on a stream that has no such menu entry.
 */
async function trySetAmbientState(page: Page, desired: boolean, timeout = 20000): Promise<boolean> {
	try {
		await expect.poll(async () => applyAmbientState(page, desired), { intervals: [500], timeout }).toBe(true);
		return true;
	} catch {
		return false;
	}
}
/**
 * Asks YouTube for its dark theme through the PREF cookie's f6 flags (bit 0x400). Ambient mode is a dark theme
 * feature: in the light theme YouTube builds the player without an ambient mode entry in its settings menu, so
 * every assertion in this spec would be vacuous. Setting the cookie before the first navigation means the player
 * is built with the entry already present, so no reload is needed.
 */
async function useDarkTheme(page: Page): Promise<void> {
	const context = page.context();
	const preference = (await context.cookies("https://www.youtube.com")).find(({ name }) => name === "PREF");
	const preferences = new URLSearchParams(preference?.value ?? "");
	const flags = Number.parseInt(preferences.get("f6") ?? "0", 16) || 0;
	preferences.set("f6", (flags | 0x400).toString(16));
	await context.addCookies([
		{
			domain: ".youtube.com",
			expires: Math.floor(Date.now() / 1000) + 3600,
			name: "PREF",
			path: "/",
			value: preferences.toString()
		}
	]);
}
test.describe("automaticallyDisableAmbientMode", () => {
	for (const pageType of testPages) {
		test(`should persist disabled ambient mode after navigation on ${pageType}`, async ({ page }) => {
			await useDarkTheme(page);
			await navigateToPageType(page, pageType, ["ambientMode"]);
			await enableFeature(page, "automaticallyDisableAmbientMode.enabled");
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 10000 }
				)
				.toBe(false);
			// Nothing observes ambient mode once the retry loop resolves, so it stays on until a navigation re-runs
			// the task; that makes the final assertion depend on onNavigate alone.
			await setAmbientState(page, true);
			await spaNavigateToRelatedVideo(page);
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 15000 }
				)
				.toBe(false);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await useDarkTheme(page);
			await navigateToPageType(page, pageType, ["ambientMode"]);
			const initialState = await getAmbientState(page);
			test.skip(initialState === null, "no watch shell to read ambient mode from");
			// Without ambient mode on there is nothing for the feature to turn off and every assertion below passes vacuously.
			await setAmbientState(page, true);
			expect(await getAmbientState(page)).toBe(true);
			await enableFeature(page, "automaticallyDisableAmbientMode.enabled");
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 10000 }
				)
				.toBe(false);
			await disableFeature(page, "automaticallyDisableAmbientMode.enabled");
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 10000 }
				)
				.toBe(true);
			await enableFeature(page, "automaticallyDisableAmbientMode.enabled");
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 10000 }
				)
				.toBe(false);
		});
		test(`persists after full page reload on ${pageType}`, async ({ page }) => {
			await useDarkTheme(page);
			await navigateToPageType(page, pageType, ["ambientMode"]);
			await enableFeature(page, "automaticallyDisableAmbientMode.enabled");
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 10000 }
				)
				.toBe(false);
			// Turn ambient mode back on so YouTube restores it on the next load; the assertion after the reload can
			// then only pass because the extension disabled it again.
			await setAmbientState(page, true);
			await reloadPage(page, pageType);
			await expect
				.poll(
					async () => {
						return getAmbientState(page);
					},
					{ timeout: 15000 }
				)
				.toBe(false);
		});
	}

	// The cases below run on watch only unless stated otherwise: they drive the watch branch of makeAmbientToggleTask.
	test(`does not turn ambient mode on when it was already off before the feature was enabled on ${watch}`, async ({ page }) => {
		await useDarkTheme(page);
		await navigateToPageType(page, watch, ["ambientMode"]);
		test.skip((await getAmbientState(page)) === null, "no watch shell to read ambient mode from");
		// Turning it on first proves this video really offers the control, so the state the test sets up below is one
		// the feature could observe rather than a page that simply has no ambient mode at all.
		test.skip(!(await trySetAmbientState(page, true, 10000)), "this video exposes no ambient mode control");
		// ambientModeWasEnabled is captured once, on the first run of the disable task, so ambient has to be off before
		// the feature is switched on for the guarded onDisable branch to be the one under test.
		await setAmbientState(page, false);
		await enableFeature(page, "automaticallyDisableAmbientMode.enabled");
		await expect
			.poll(
				async () => {
					return getAmbientState(page);
				},
				{ timeout: 10000 }
			)
			.toBe(false);
		// Let the retry loop finish before touching ambient mode again, otherwise a later tick would undo the setup.
		await expectToStay(
			async () => {
				return getAmbientState(page);
			},
			false,
			{ durationMs: 2000, intervalMs: 500, page }
		);
		// Prove the feature is really running before relying on it staying quiet: onNavigate has to disable ambient
		// mode again, which a feature that never enabled could not do.
		await setAmbientState(page, true);
		await spaNavigateToRelatedVideo(page);
		await expect
			.poll(
				async () => {
					return getAmbientState(page);
				},
				{ timeout: 15000 }
			)
			.toBe(false);
		await disableFeature(page, "automaticallyDisableAmbientMode.enabled");
		// onDisable restores only what the user had: ambient mode was off, so nothing may switch it back on.
		await expectToStay(
			async () => {
				return getAmbientState(page);
			},
			false,
			{ durationMs: 5000, intervalMs: 500, page }
		);
	});
	test(`leaves the YouTube settings menu usable after disabling ambient mode on ${watch}`, async ({ page }) => {
		await useDarkTheme(page);
		await navigateToPageType(page, watch, ["ambientMode"]);
		test.skip((await getAmbientState(page)) === null, "no watch shell to read ambient mode from");
		test.skip(!(await trySetAmbientState(page, true, 10000)), "this video exposes no ambient mode control");
		await enableFeature(page, "automaticallyDisableAmbientMode.enabled");
		await expect
			.poll(
				async () => {
					return getAmbientState(page);
				},
				{ timeout: 10000 }
			)
			.toBe(false);
		const settingsMenu = page.locator(settingsPanelMenuSelector);
		// The feature hides YouTube's own settings menu while it primes the lazily filled panel; leaving the class
		// behind would make the menu unusable for the rest of the session.
		await expect(settingsMenu).not.toHaveClass(/(^|\s)hidden(\s|$)/);
		await ensurePlayerControlsVisible(page, watch);
		await page.locator("button.ytp-settings-button").evaluate((el) => (el as HTMLButtonElement).click());
		await expect(settingsMenu).toBeVisible();
		await expect(settingsMenu.locator("div.ytp-panel-menu .ytp-menuitem").first()).toBeVisible();
	});
	// live is the one page type where the URL is a /watch URL but the feature is gated off, so it needs its own case.
	test(`does not touch ambient mode on ${live}`, async ({ page }) => {
		await useDarkTheme(page);
		// Only some live streams carry the ambient mode entry, so the hunt keeps looking for one within its own budget
		// and the test stops with a reason only when the channel has none on air.
		test.setTimeout(test.info().timeout + 240_000);
		const reached = await navigateToPageType(page, live, ["ambientMode"], { deadline: Date.now() + 200_000 })
			.then(() => true)
			.catch(() => false);
		test.skip(!reached, "no live stream with an ambient mode control is on air right now");
		test.skip((await getAmbientState(page)) === null, "no watch shell to read ambient mode from");
		test.skip(!(await trySetAmbientState(page, true, 10000)), "this live stream's ambient mode control did not respond");
		await enableFeature(page, "automaticallyDisableAmbientMode.enabled");
		// live is outside includePages, so areDependenciesMet blocks the feature even though isWatchPage() is true for
		// the live URL and the toggle task would otherwise happily run.
		await expectToStay(
			async () => {
				return getAmbientState(page);
			},
			true,
			{ durationMs: 5000, intervalMs: 500, page }
		);
	});
});
