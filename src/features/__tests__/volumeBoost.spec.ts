import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/volumeBoost/index.metadata";
import {
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeTruthy,
	expectToggleButtonState,
	expectToStay
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, clickFeatureMenuItem, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { WHEEL_DELTA_PER_NOTCH } from "@/src/utils/_tests/player";
import { readStoredOptions } from "@/src/utils/_tests/storage";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";
import { clampDb, dbToLinear } from "@/src/utils/misc";
const { right } = placementRecord;
const { shorts, watch } = pageTypeRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);

/** Reads back the amount the wheel handler persisted through `sendContentOnlyMessage("setVolumeBoostAmount")`. */
async function expectStoredVolumeBoostAmount(page: Page, expected: number) {
	await expect.poll(async () => (await readStoredOptions(page)).volumeBoost.amount, { timeout: 10_000 }).toBe(expected);
}
async function expectVolumeBoostAmount(page: Page, expected: number) {
	await expect
		.poll(
			async () =>
				page.evaluate(() => {
					const gain = window.engine?.volumeGain?.gain;
					if (!gain) return null;
					return gain.value;
				}),
			{ timeout: 10_000 }
		)
		.toBeCloseTo(dbToLinear(clampDb(expected)), 5);
}
/**
 * Polls the gain node the feature writes to. A missing engine yields null, so a torn-down or never-created
 * engine fails instead of masquerading as "not boosted"; "not boosted" means a gain of exactly 1.
 */
async function expectVolumeBoostEnabled(page: Page, enabled: boolean) {
	await expect
		.poll(
			async () =>
				page.evaluate(() => {
					const gain = window.engine?.volumeGain?.gain;
					if (!gain) return null;
					return gain.value !== 1;
				}),
			{ timeout: 10_000 }
		)
		.toBe(enabled);
}
/** Fails when the gain node ever leaves 1 (unboosted) during the settle window. */
async function expectVolumeBoostToStayOff(page: Page) {
	await expectToStay(async () => page.evaluate(() => window.engine?.volumeGain?.gain.value ?? null), 1, { page });
}
/**
 * Dispatches one wheel notch on the volume boost button itself. `dispatchWheelNotches` targets the player
 * container, which is a different listener; the boost stepper listens on the button.
 */
async function wheelOverVolumeBoostButton(page: Page, direction: "down" | "up", init: Record<string, unknown> = {}) {
	const wheelInit: Record<string, unknown> = {
		bubbles: true,
		cancelable: true,
		deltaMode: 0,
		deltaY: direction === "up" ? -WHEEL_DELTA_PER_NOTCH : WHEEL_DELTA_PER_NOTCH,
		...init
	};
	await page.evaluate((eventInit) => {
		const button = document.getElementById("yte-feature-volumeBoostButton-button");
		if (!button) throw new Error("Volume boost button not found");
		button.dispatchEvent(new WheelEvent("wheel", eventInit));
	}, wheelInit);
}
test.describe("volumeBoost", () => {
	test.describe("volumeBoost (global)", () => {
		for (const pageType of testPages) {
			test(`should set global volume boost to 10 on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "global");
				await setOption(page, "volumeBoost.amount", 10);
				await expectVolumeBoostEnabled(page, true);
				await expectVolumeBoostAmount(page, 10);
			});
		}

		// onEnable/onDisable and the enabled-on-load path have no page-specific branch, and the live fixture
		// costs up to 120 s, so the lifecycle cases below run on watch only.
		test(`should re-apply global volume boost after disable then re-enable on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "global");
			await setOption(page, "volumeBoost.amount", 10);
			await expectVolumeBoostEnabled(page, true);
			await expectVolumeBoostAmount(page, 10);
			await disableFeature(page, "volumeBoost.enabled");
			await expectVolumeBoostEnabled(page, false);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "global");
			await setOption(page, "volumeBoost.amount", 10);
			await expectVolumeBoostEnabled(page, true);
			await expectVolumeBoostAmount(page, 10);
		});

		test(`should persist global volume boost after full page reload on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "global");
			await setOption(page, "volumeBoost.amount", 10);
			await expectVolumeBoostEnabled(page, true);
			await expectVolumeBoostAmount(page, 10);
			await page.reload();
			await navigateToPageType(page, watch);
			await expectVolumeBoostEnabled(page, true);
			await expectVolumeBoostAmount(page, 10);
		});

		// Left on the shipped defaults on purpose: shouldRender only asks for the button in per_video mode, and
		// asserting the global boost still lands keeps a missing button from passing for an inert feature.
		test(`should not render the button while mode is global on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.button.placement", right);
			const {
				volumeBoost: { amount, mode }
			} = await readStoredOptions(page);
			expect(mode).toBe("global");
			expect(amount).toBe(5);
			await expectVolumeBoostAmount(page, amount);
			await expectToStay(async () => page.locator("#yte-feature-volumeBoostButton-button").count(), 0, { page });
			await expectToStay(async () => page.locator("#yte-feature-volumeBoostButton-menuitem").count(), 0, { page });
		});
	});
	const buttonTestPages = testPages.filter((p) => p !== "shorts");
	test.describe("volumeBoost (button)", () => {
		for (const pageType of buttonTestPages) {
			test(`button should be enabled on ${pageType}`, async ({ page }) => {
				await navigateToPageType(page, pageType);
				await enableFeature(page, "volumeBoost.enabled");
				await setOption(page, "volumeBoost.mode", "per_video");
				await setOption(page, "volumeBoost.button.placement", right);
				await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
			});
		}

		// Button removal, the toggle listener and the reload path have no live-specific branch, and the live
		// fixture costs up to 120 s; live button rendering stays covered by the test above.
		test(`button should be disabled when feature is off on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "per_video");
			await setOption(page, "volumeBoost.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
			await disableFeature(page, "volumeBoost.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-volumeBoostButton-button");
		});

		test(`button should toggle off when clicked again on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "per_video");
			await setOption(page, "volumeBoost.amount", 10);
			await setOption(page, "volumeBoost.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
			await clickFeatureButton(page, watch, "yte-feature-volumeBoostButton-button", right);
			await expectVolumeBoostEnabled(page, true);
			await expectVolumeBoostAmount(page, 10);
			await clickFeatureButton(page, watch, "yte-feature-volumeBoostButton-button", right);
			await expectVolumeBoostEnabled(page, false);
		});

		// isVolumeBoostEnabled is a module-level flag that resets on every document load and the button is
		// re-created unchecked, so the boost is expected to be gone after the reload.
		test(`button reappears after reload on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "per_video");
			await setOption(page, "volumeBoost.amount", 10);
			await setOption(page, "volumeBoost.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
			await clickFeatureButton(page, watch, "yte-feature-volumeBoostButton-button", right);
			await expectVolumeBoostEnabled(page, true);
			await expectVolumeBoostAmount(page, 10);
			await reloadPage(page, watch);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
			await expectVolumeBoostEnabled(page, false);
		});

		test(`should apply amount changes only while the per-video toggle is checked on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			// The mode has to be switched before the feature is turned on: onEnable applies the amount straight away
			// while the shipped default mode is still global, and nothing releases that gain when the mode changes.
			await setOption(page, "volumeBoost.mode", "per_video");
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.amount", 10);
			await setOption(page, "volumeBoost.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
			// Unchecked: onConfigChange's per_video branch has to leave the gain alone.
			await setOption(page, "volumeBoost.amount", 15);
			await expectVolumeBoostToStayOff(page);
			await clickFeatureButton(page, watch, "yte-feature-volumeBoostButton-button", right);
			await expectVolumeBoostAmount(page, 15);
			// Checked: the same kind of config change now has to reach the gain node.
			await setOption(page, "volumeBoost.amount", 20);
			await expectVolumeBoostAmount(page, 20);
		});

		test(`should change the boost by one dB per wheel notch over the button on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "per_video");
			await setOption(page, "volumeBoost.amount", 10);
			await setOption(page, "volumeBoost.button.placement", right);
			await clickFeatureButton(page, watch, "yte-feature-volumeBoostButton-button", right);
			await expectVolumeBoostAmount(page, 10);
			await expectToggleButtonState(page, "yte-feature-volumeBoostButton-button", true, { title: "Volume boost (10 dB)" });
			await wheelOverVolumeBoostButton(page, "up");
			await expectStoredVolumeBoostAmount(page, 11);
			await expectVolumeBoostAmount(page, 11);
			await expectToggleButtonState(page, "yte-feature-volumeBoostButton-button", true, { title: "Volume boost (11 dB)" });
			await expect(page.locator("canvas#yte-osd")).toBeAttached({ timeout: 5000 });
			await wheelOverVolumeBoostButton(page, "down");
			await expectStoredVolumeBoostAmount(page, 10);
			await expectVolumeBoostAmount(page, 10);
		});

		test(`should store a wheel adjustment without boosting while the button is unchecked on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			// Switch to per_video first, otherwise onEnable applies the default global boost and the gain never
			// starts from 1 for this assertion.
			await setOption(page, "volumeBoost.mode", "per_video");
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.amount", 10);
			await setOption(page, "volumeBoost.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
			await wheelOverVolumeBoostButton(page, "up");
			await expectStoredVolumeBoostAmount(page, 11);
			await expectToggleButtonState(page, "yte-feature-volumeBoostButton-button", false, { title: "Volume boost off" });
			await expectVolumeBoostToStayOff(page);
		});

		test(`should apply the shift and ctrl wheel modifiers over the button on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "per_video");
			await setOption(page, "volumeBoost.amount", 10);
			await setOption(page, "volumeBoost.button.placement", right);
			await clickFeatureButton(page, watch, "yte-feature-volumeBoostButton-button", right);
			await expectVolumeBoostAmount(page, 10);
			// Shift multiplies the 1 dB step by 2.5.
			await wheelOverVolumeBoostButton(page, "up", { shiftKey: true });
			await expectStoredVolumeBoostAmount(page, 12.5);
			await expectVolumeBoostAmount(page, 12.5);
			// Ctrl multiplies it by 5, and a downward notch has to subtract.
			await wheelOverVolumeBoostButton(page, "down", { ctrlKey: true });
			await expectStoredVolumeBoostAmount(page, 7.5);
			await expectVolumeBoostAmount(page, 7.5);
		});

		test(`should clamp the boost at 0 dB when scrolling down past the minimum on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "per_video");
			await setOption(page, "volumeBoost.amount", 1);
			await setOption(page, "volumeBoost.button.placement", right);
			await clickFeatureButton(page, watch, "yte-feature-volumeBoostButton-button", right);
			await expectVolumeBoostAmount(page, 1);
			await wheelOverVolumeBoostButton(page, "down");
			await expectStoredVolumeBoostAmount(page, 0);
			// A further notch may not push the stored amount below MIN_DB.
			await wheelOverVolumeBoostButton(page, "down");
			await expectToStay(async () => (await readStoredOptions(page)).volumeBoost.amount, 0, { page });
			await expectVolumeBoostAmount(page, 0);
		});

		test(`should toggle volume boost from the feature menu item on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "per_video");
			await setOption(page, "volumeBoost.amount", 10);
			await setOption(page, "volumeBoost.button.placement", "feature_menu");
			await expectFeatureMenuItemToBeTruthy(page, "yte-feature-volumeBoostButton-menuitem");
			const menuItem = page.locator("#yte-feature-volumeBoostButton-menuitem");
			// The menu label is the only place the configured amount is surfaced for this placement.
			await expect(menuItem).toContainText("Volume Boost (10 dB)");
			await expect(menuItem).toHaveAttribute("aria-checked", "false");
			await clickFeatureMenuItem(page, watch, "yte-feature-volumeBoostButton-menuitem");
			await expect(menuItem).toHaveAttribute("aria-checked", "true");
			await expectVolumeBoostAmount(page, 10);
			// The menu stays open after an item click and the menu button closes it instead of re-opening it, so the
			// second toggle is dispatched on the item itself.
			await page.evaluate(() => document.getElementById("yte-feature-volumeBoostButton-menuitem")?.click());
			await expect(menuItem).toHaveAttribute("aria-checked", "false");
			await expectVolumeBoostEnabled(page, false);
		});

		test(`should re-apply the boost after an in-page navigation to another video on ${watch}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "per_video");
			await setOption(page, "volumeBoost.amount", 10);
			await setOption(page, "volumeBoost.button.placement", right);
			await clickFeatureButton(page, watch, "yte-feature-volumeBoostButton-button", right);
			await expectVolumeBoostAmount(page, 10);
			// A single-page navigation swaps the video element, so onNavigate has to rebuild the engine and re-boost it.
			await spaNavigateToRelatedVideo(page);
			await expectVolumeBoostAmount(page, 10);
		});

		// The feature menu is watch-only and the below_player container is built for the watch layout, so
		// player_controls_right is the only placement shorts can use. `.ytp-right-controls` can match more than one
		// element on a shorts page, so the placement is asserted by counting instead of with a strict locator.
		test(`should render and toggle the volume boost button on ${shorts}`, async ({ page }) => {
			await navigateToPageType(page, shorts);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "per_video");
			await setOption(page, "volumeBoost.amount", 10);
			await setOption(page, "volumeBoost.button.placement", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-volumeBoostButton-button");
			await expect
				.poll(async () => page.locator(".ytp-right-controls #yte-feature-volumeBoostButton-button").count(), { timeout: 10_000 })
				.toBeGreaterThan(0);
			await page.evaluate(() => document.getElementById("yte-feature-volumeBoostButton-button")?.click());
			await expectVolumeBoostAmount(page, 10);
			await expectToggleButtonState(page, "yte-feature-volumeBoostButton-button", true, { title: "Volume boost (10 dB)" });
			await page.evaluate(() => document.getElementById("yte-feature-volumeBoostButton-button")?.click());
			await expectVolumeBoostEnabled(page, false);
			await expectToggleButtonState(page, "yte-feature-volumeBoostButton-button", false, { title: "Volume boost off" });
		});
	});

	test(`should not create volume boost button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "volumeBoost.enabled");
		// per_video mode plus a placement is what makes shouldRender ask for the button at all, so only the page
		// gate can keep it away here.
		await setOption(page, "volumeBoost.mode", "per_video");
		await setOption(page, "volumeBoost.button.placement", right);
		await expectFeatureButtonToBeFalsy(page, "yte-feature-volumeBoostButton-button");
	});

	test.describe("audio engine", () => {
		test("resumes a suspended audio context when the page becomes visible on watch", async ({ page }) => {
			await navigateToPageType(page, watch);
			await enableFeature(page, "volumeBoost.enabled");
			await setOption(page, "volumeBoost.mode", "global");
			await setOption(page, "volumeBoost.amount", 10);
			await expectVolumeBoostEnabled(page, true);
			await page.evaluate(async () => {
				const { engine } = window;
				if (!engine) throw new Error("audio engine missing");
				await engine.context.suspend();
			});
			await expect.poll(async () => page.evaluate(() => window.engine?.context.state)).toBe("suspended");
			// Firefox suspends the context while the tab is hidden; the engine resumes it on the next visibility change.
			await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
			await expect.poll(async () => page.evaluate(() => window.engine?.context.state), { timeout: 10000 }).toBe("running");
		});
	});
});
