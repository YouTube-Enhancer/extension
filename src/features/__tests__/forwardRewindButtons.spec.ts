import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { metadata } from "@/src/features/forwardRewindButtons/index.metadata";
import { placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { freezeAndGetTime, waitForStableTime } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const time = 10;
const { left } = placementRecord;
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
	}
});
