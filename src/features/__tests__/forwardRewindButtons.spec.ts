import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { metadata } from "@/src/features/forwardRewindButtons/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeIn, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { toggleFullscreen } from "@/src/utils/_tests/fullscreen";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { freezeAndGetTime, waitForStableTime } from "@/src/utils/_tests/player";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { home, watch } = pageTypeRecord;
const time = 10;
const { left, right } = placementRecord;
export async function expectSeekDelta(page: Page, pageType: PageType, direction: "backward" | "forward", expectedDelta: number) {
	const tolerance = 2;
	const featureId = direction === "forward" ? "yte-feature-forwardButton-button" : "yte-feature-rewindButton-button";
	const start = await freezeAndGetTime(page, pageType);
	expect(start).toBeDefined();
	expect(Number.isFinite(start)).toBe(true);
	if (!start) return;
	await clickFeatureButton(page, pageType, featureId, left);
	const end = await waitForStableTime(page, pageType);
	expect(end).toBeDefined();
	expect(Number.isFinite(end)).toBe(true);
	if (!end) return;
	const delta = direction === "forward" ? end - start : start - end;
	expect(Number.isFinite(delta)).toBe(true);
	expect(delta).toBeGreaterThanOrEqual(expectedDelta - tolerance);
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
		test(`forward button should not be present when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "forwardRewindButtons.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-forwardButton-button");
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
		test(`forward button should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "forwardRewindButtons.button.placement", left);
			await enableFeature(page, "forwardRewindButtons.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-forwardButton-button");
			await disableFeature(page, "forwardRewindButtons.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-forwardButton-button");
			await enableFeature(page, "forwardRewindButtons.button.enabled");
			await setOption(page, "forwardRewindButtons.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-forwardButton-button");
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
	});

	test.describe("button placement", () => {
		for (const placement of [left, right] as const) {
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
		test("forward button should move from left to right on fullscreen enter/exit", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "forwardRewindButtons.button.placement", left);
			await setOption(page, "forwardRewindButtons.button.fullscreenPlacement", right);
			await enableFeature(page, "forwardRewindButtons.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-forwardButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-forwardButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-forwardButton-button", left);
		});

		test("rewind button should move from left to right on fullscreen enter/exit", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "forwardRewindButtons.button.placement", left);
			await setOption(page, "forwardRewindButtons.button.fullscreenPlacement", right);
			await enableFeature(page, "forwardRewindButtons.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-rewindButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-rewindButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-rewindButton-button", left);
		});

		test("forward button should not move when fullscreenPlacement is same", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "forwardRewindButtons.button.placement", right);
			await setOption(page, "forwardRewindButtons.button.fullscreenPlacement", "same");
			await enableFeature(page, "forwardRewindButtons.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-forwardButton-button", right);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-forwardButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-forwardButton-button", right);
		});

		test("rewind button should not move when fullscreenPlacement is same", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "forwardRewindButtons.button.placement", right);
			await setOption(page, "forwardRewindButtons.button.fullscreenPlacement", "same");
			await enableFeature(page, "forwardRewindButtons.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-rewindButton-button", right);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-rewindButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-rewindButton-button", right);
		});
	});
});
