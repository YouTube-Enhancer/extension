import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";
import type { ButtonPlacement, YouTubePlayerDiv } from "@/src/types";

import { metadata } from "@/src/features/forwardRewindButtons/index.metadata";
import {
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeIn,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeTruthy,
	expectToStay
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, clickFeatureMenuItem, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { toggleFullscreen } from "@/src/utils/_tests/fullscreen";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { freezeAndGetTime, getValueFromYouTubePlayer } from "@/src/utils/_tests/player";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home, live, watch } = pageTypeRecord;
const time = 10;
const { left, menu, right } = placementRecord;
export async function expectSeekDelta(
	page: Page,
	pageType: PageType,
	direction: "backward" | "forward",
	expectedDelta: number,
	placement: ButtonPlacement = left
) {
	const tolerance = 2;
	const baseline = 60;
	const featureId = direction === "forward" ? "yte-feature-forwardButton-button" : "yte-feature-rewindButton-button";
	// Seek to a known position first: navigation leaves the player near 0, where a rewind clamps and the delta is meaningless.
	await page.evaluate(async (seconds) => {
		const player = document.querySelector<YouTubePlayerDiv>("div#movie_player");
		await player?.seekTo(seconds, true);
	}, baseline);
	await expect
		.poll(async () => getValueFromYouTubePlayer(page, "getCurrentTime", pageType), { intervals: [200], timeout: 10000 })
		.toBeGreaterThanOrEqual(baseline - tolerance);
	const start = await freezeAndGetTime(page, pageType);
	expect(start).not.toBeNull();
	expect(Number.isFinite(start)).toBe(true);
	if (start === null) return;
	if (placement === "feature_menu") {
		await clickFeatureMenuItem(page, pageType, direction === "forward" ? "yte-feature-forwardButton-menuitem" : "yte-feature-rewindButton-menuitem");
	} else {
		await clickFeatureButton(page, pageType, featureId, placement);
	}
	// The video is paused, so waiting for a "stable" time would return the pre-seek value: poll for the seeked value instead.
	await expect
		.poll(
			async () => {
				const current = await getValueFromYouTubePlayer(page, "getCurrentTime", pageType);
				if (current === null) return null;
				return direction === "forward" ? current - start : start - current;
			},
			{ intervals: [200], timeout: 10000 }
		)
		.toBeGreaterThanOrEqual(expectedDelta - tolerance);
	const end = await getValueFromYouTubePlayer(page, "getCurrentTime", pageType);
	expect(end).not.toBeNull();
	if (end === null) return;
	const delta = direction === "forward" ? end - start : start - end;
	expect(Number.isFinite(delta)).toBe(true);
	expect(delta).toBeLessThanOrEqual(expectedDelta + tolerance);
}
test.describe("forwardRewindButtons", () => {
	for (const pageType of testPages) {
		test(`rewind button seeks backward on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "forwardRewindButtons.time", time);
			await setOption(page, "forwardRewindButtons.button.placement", left);
			await enableFeature(page, "forwardRewindButtons.button.enabled");
			await expectSeekDelta(page, pageType, "backward", time);
		});
		test(`forward button seeks forward on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "forwardRewindButtons.time", time);
			await setOption(page, "forwardRewindButtons.button.placement", left);
			await enableFeature(page, "forwardRewindButtons.button.enabled");
			await expectSeekDelta(page, pageType, "forward", time);
		});
		test(`forward button should persist after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "forwardRewindButtons.button.placement", left);
			await enableFeature(page, "forwardRewindButtons.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-forwardButton-button");
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-forwardButton-button");
		});
		test(`forward and rewind buttons should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "forwardRewindButtons.button.placement", left);
			await enableFeature(page, "forwardRewindButtons.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-forwardButton-button");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-rewindButton-button");
			await disableFeature(page, "forwardRewindButtons.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-forwardButton-button");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-rewindButton-button");
			await enableFeature(page, "forwardRewindButtons.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-forwardButton-button");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-rewindButton-button");
		});
	}

	test(`forward button should persist after full page reload`, async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await setOption(page, "forwardRewindButtons.button.placement", left);
		await enableFeature(page, "forwardRewindButtons.button.enabled");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-forwardButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-forwardButton-button");
	});

	test(`should not create forward rewind buttons on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "forwardRewindButtons.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-forwardButton-button");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-rewindButton-button");
	});

	test("rewind button should still seek after the button placement is changed while enabled on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "forwardRewindButtons.time", time);
		await setOption(page, "forwardRewindButtons.button.placement", left);
		await enableFeature(page, "forwardRewindButtons.button.enabled");
		await expectSeekDelta(page, watch, "backward", time);
		await setOption(page, "forwardRewindButtons.button.placement", right);
		await expectFeatureButtonToBeIn(page, "yte-feature-rewindButton-button", right);
		await expectSeekDelta(page, watch, "backward", time, right);
	});

	test("changing forwardRewindButtons.time while enabled should update both button titles and the seek amount on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "forwardRewindButtons.time", 5);
		await setOption(page, "forwardRewindButtons.button.placement", left);
		await enableFeature(page, "forwardRewindButtons.button.enabled");
		const forwardButton = page.locator("#yte-feature-forwardButton-button");
		const rewindButton = page.locator("#yte-feature-rewindButton-button");
		await expect(forwardButton).toHaveAttribute("data-title", /\b5\b/);
		await expect(rewindButton).toHaveAttribute("data-title", /\b5\b/);
		// A time-only change never re-adds the buttons: onConfigChange has to relabel them in place.
		await setOption(page, "forwardRewindButtons.time", 20);
		await expect(forwardButton).toHaveAttribute("data-title", /\b20\b/);
		await expect(rewindButton).toHaveAttribute("data-title", /\b20\b/);
		await expectSeekDelta(page, watch, "forward", 20);
	});

	test("both buttons should render in the feature menu and seek from it on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "forwardRewindButtons.time", time);
		await setOption(page, "forwardRewindButtons.button.placement", menu);
		await enableFeature(page, "forwardRewindButtons.button.enabled");
		await expectFeatureMenuItemToBeTruthy(page, "yte-feature-forwardButton-menuitem");
		await expectFeatureMenuItemToBeTruthy(page, "yte-feature-rewindButton-menuitem");
		await expectSeekDelta(page, watch, "backward", time, menu);
	});

	test("forward and rewind buttons should not be added on a live stream", async ({ page }) => {
		await navigateToPageType(page, live);
		await setOption(page, "forwardRewindButtons.button.placement", left);
		await enableFeature(page, "forwardRewindButtons.button.enabled");
		// Seeking is meaningless on a live stream, so neither button may ever appear.
		await expectToStay(async () => await page.locator("#yte-feature-forwardButton-button, #yte-feature-rewindButton-button").count(), 0, { page });
	});

	test.describe("button placement", () => {
		// player_controls_left is already asserted by clickFeatureButton in the seek tests, so only the right placement needs its own test.
		for (const placement of [right] as const) {
			test(`forward button should render in ${placement}`, async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "forwardRewindButtons.button.placement", placement);
				await enableFeature(page, "forwardRewindButtons.button.enabled");
				await expectFeatureButtonToBeTruthy(page, "yte-feature-forwardButton-button");
				await expectFeatureButtonToBeIn(page, "yte-feature-forwardButton-button", placement);
			});
			test(`rewind button should render in ${placement}`, async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "forwardRewindButtons.button.placement", placement);
				await enableFeature(page, "forwardRewindButtons.button.enabled");
				await expectFeatureButtonToBeTruthy(page, "yte-feature-rewindButton-button");
				await expectFeatureButtonToBeIn(page, "yte-feature-rewindButton-button", placement);
			});
		}
	});

	test.describe("fullscreen transition", () => {
		test("forward and rewind buttons should move from left to right on fullscreen enter/exit", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "forwardRewindButtons.button.placement", left);
			await setOption(page, "forwardRewindButtons.button.fullscreenPlacement", right);
			await enableFeature(page, "forwardRewindButtons.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-forwardButton-button", left);
			await expectFeatureButtonToBeIn(page, "yte-feature-rewindButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-forwardButton-button", right);
			await expectFeatureButtonToBeIn(page, "yte-feature-rewindButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-forwardButton-button", left);
			await expectFeatureButtonToBeIn(page, "yte-feature-rewindButton-button", left);
		});
	});
});
