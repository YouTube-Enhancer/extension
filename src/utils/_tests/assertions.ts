import { expect, type Page } from "@playwright/test";

import type { PageType } from "@/src/features/_registry/types";
import type { YoutubePlayerQualityLevel } from "@/src/features/playerQuality/types";
import type { ButtonPlacement, FeatureButtonId, FeatureMenuItemId } from "@/src/types";

import { placementSelectors } from "@/src/utils/_tests/constants";
import { getValueFromYouTubePlayer } from "@/src/utils/_tests/player";

export async function expectCurrentQualityLevelToBeFalsy(page: Page, pageType: PageType = "watch", expectedQuality: YoutubePlayerQualityLevel) {
	const currentQualityLevel = await getValueFromYouTubePlayer(page, "getPlaybackQuality", pageType);
	expect(currentQualityLevel).toBeTruthy();
	expect(currentQualityLevel).not.toBe(expectedQuality);
}
export async function expectCurrentQualityLevelToBeTruthy(page: Page, pageType: PageType = "watch", expectedQuality: YoutubePlayerQualityLevel) {
	const currentQualityLevel = await getValueFromYouTubePlayer(page, "getPlaybackQuality", pageType);
	expect(currentQualityLevel).toBeTruthy();
	expect(currentQualityLevel).toBe(expectedQuality);
}
export async function expectFeatureButtonToBeFalsy(page: Page, featureId: FeatureButtonId) {
	const featureButton = page.locator(`#${featureId}`);
	await expect(featureButton).not.toBeAttached();
}
export async function expectFeatureButtonToBeIn(page: Page, featureId: FeatureButtonId, placement: Exclude<ButtonPlacement, "feature_menu">) {
	const { [placement]: selector } = placementSelectors;
	const container = page.locator(selector);
	await expect(container).toBeAttached();
	const button = container.locator(`#${featureId}`);
	await expect(button).toBeAttached();
}
export async function expectFeatureButtonToBeTruthy(page: Page, featureId: FeatureButtonId) {
	const featureButton = page.locator(`#${featureId}`);
	await expect(featureButton).toBeAttached();
}
export async function expectFeatureMenuItemToBeFalsy(page: Page, featureId: FeatureMenuItemId) {
	const menuItem = page.locator(`#${featureId}`);
	await expect(menuItem).not.toBeAttached();
}
export async function expectFeatureMenuItemToBeTruthy(page: Page, featureId: FeatureMenuItemId) {
	const menuItem = page.locator(`#${featureId}`);
	await expect(menuItem).toBeAttached();
}
