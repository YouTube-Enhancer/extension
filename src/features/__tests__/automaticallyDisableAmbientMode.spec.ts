import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { ensurePlayerControlsVisible } from "@/src/utils/_tests/pageSetup";

// Narrowed from the feature's ["watch", "shorts"] pages: onEnable passes no pageTypes, so executeWithRetries falls back to ["watch", "live"] and isOnAllowedPage returns false on /shorts, so the shorts expansion never exercises the feature.
const testPages: readonly PageType[] = [pageTypeRecord.watch];
const { live, watch } = pageTypeRecord;
const settingsPanelMenuSelector = "div.ytp-settings-menu:not(#yte-feature-menu)";
// Mirrors the watch entries of ambientModePathSelectors in src/features/automaticallyDisableAmbientMode/index.ts.
const ambientModeMenuItemSelector = [
	".ytp-menuitem:has(.ytp-menuitem-icon svg path[d='M21 7v10H3V7h18m1-1H2v12h20V6zM11.5 2v3h1V2h-1zm1 17h-1v3h1v-3zM3.79 3 6 5.21l.71-.71L4.5 2.29 3.79 3zm2.92 16.5L6 18.79 3.79 21l.71.71 2.21-2.21zM19.5 2.29 17.29 4.5l.71.71L20.21 3l-.71-.71zm0 19.42.71-.71L18 18.79l-.71.71 2.21 2.21z'])",
	".ytp-menuitem:has(.ytp-menuitem-icon svg path[d='M12 .5C11.73 .5 11.48 .60 11.29 .79C11.10 .98 11 1.23 11 1.5V3.5C11 3.76 11.10 4.01 11.29 4.20C11.48 4.39 11.73 4.5 12 4.5C12.26 4.5 12.51 4.39 12.70 4.20C12.89 4.01 13 3.76 13 3.5V1.5C13 1.23 12.89 .98 12.70 .79C12.51 .60 12.26 .5 12 .5ZM3.79 1.29C3.61 1.46 3.51 1.70 3.50 1.94C3.48 2.19 3.56 2.43 3.72 2.63L3.79 2.70L5.29 4.20L5.37 4.27C5.56 4.42 5.80 4.50 6.04 4.49C6.29 4.47 6.52 4.37 6.70 4.20C6.87 4.02 6.97 3.79 6.99 3.54C7.00 3.30 6.92 3.06 6.77 2.86L6.70 2.79L5.20 1.29L5.13 1.22C4.93 1.06 4.69 .98 4.44 1.00C4.20 1.01 3.96 1.11 3.79 1.29ZM18.86 1.22L18.79 1.29L17.29 2.79L17.22 2.86C17.07 3.06 16.99 3.30 17.00 3.54C17.01 3.79 17.12 4.02 17.29 4.20C17.47 4.37 17.70 4.48 17.95 4.49C18.19 4.50 18.43 4.42 18.63 4.27L18.70 4.20L20.20 2.70L20.27 2.63C20.42 2.43 20.50 2.19 20.49 1.95C20.48 1.70 20.37 1.47 20.20 1.29C20.02 1.12 19.79 1.01 19.54 1.00C19.30 .99 19.06 1.07 18.86 1.22ZM19.20 6.01L19 6H5L4.79 6.01C4.30 6.06 3.84 6.29 3.51 6.65C3.18 7.02 2.99 7.50 3 8V16L3.01 16.20C3.05 16.66 3.26 17.08 3.58 17.41C3.91 17.73 4.33 17.94 4.79 17.99L5 18H19L19.20 17.98C19.66 17.94 20.08 17.73 20.41 17.41C20.73 17.08 20.94 16.66 20.99 16.20L21 16V8C20.99 7.50 20.81 7.02 20.48 6.66C20.15 6.29 19.69 6.06 19.20 6.01ZM5 16V8H19V16H5ZM17.29 19.79C17.11 19.96 17.01 20.20 17.00 20.44C16.98 20.69 17.06 20.93 17.22 21.13L17.29 21.20L18.79 22.70L18.86 22.77C19.06 22.92 19.30 23.00 19.54 22.99C19.79 22.98 20.02 22.87 20.20 22.70C20.37 22.52 20.48 22.29 20.49 22.04C20.50 21.80 20.42 21.56 20.27 21.36L20.20 21.29L18.70 19.79L18.63 19.72C18.43 19.56 18.19 19.48 17.94 19.50C17.70 19.51 17.46 19.61 17.29 19.79ZM5.37 19.72L5.29 19.79L3.79 21.29L3.72 21.36C3.57 21.56 3.49 21.80 3.50 22.04C3.51 22.29 3.62 22.52 3.79 22.70C3.97 22.87 4.20 22.98 4.45 22.99C4.69 23.00 4.93 22.92 5.13 22.77L5.20 22.70L6.70 21.20L6.77 21.13C6.92 20.93 7.00 20.69 6.99 20.45C6.97 20.20 6.87 19.97 6.70 19.79C6.52 19.62 6.29 19.52 6.04 19.50C5.80 19.49 5.56 19.57 5.37 19.72ZM12 19.5C11.73 19.5 11.48 19.60 11.29 19.79C11.10 19.98 11 20.23 11 20.5V22.5C11 22.76 11.10 23.01 11.29 23.20C11.48 23.39 11.73 23.5 12 23.5C12.26 23.5 12.51 23.39 12.70 23.20C12.89 23.01 13 22.76 13 22.5V20.5C13 20.23 12.89 19.98 12.70 19.79C12.51 19.60 12.26 19.5 12 19.5Z'])"
].join(", ");

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
		await navigateToPageType(page, live);
		test.skip((await getAmbientState(page)) === null, "no watch shell to read ambient mode from");
		test.skip(!(await trySetAmbientState(page, true, 10000)), "this live stream exposes no ambient mode control");
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
