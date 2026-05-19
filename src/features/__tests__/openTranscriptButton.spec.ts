import {
	clickFeatureMenuItem,
	disableFeature,
	enableFeature,
	expect,
	expectFeatureMenuItemToBeFalsy,
	expectFeatureMenuItemToBeTruthy,
	navigateToPageType,
	test
} from "playwright.config";

test.describe("openTranscriptButton", () => {
	test("open transcript button should be enabled", async ({ page }) => {
		await navigateToPageType(page, "watch");
		await enableFeature(page, "openTranscriptButton.button.enabled");
		await expectFeatureMenuItemToBeTruthy(page, "yte-feature-openTranscriptButton-menuitem");
	});
	test("open transcript button should be disabled", async ({ page }) => {
		await navigateToPageType(page, "watch");
		await disableFeature(page, "openTranscriptButton.button.enabled");
		await expectFeatureMenuItemToBeFalsy(page, "yte-feature-openTranscriptButton-menuitem");
	});
	test("transcript should be shown when clicking the transcript button", async ({ page }) => {
		await navigateToPageType(page, "watch");
		await enableFeature(page, "openTranscriptButton.button.enabled");
		await expectFeatureMenuItemToBeTruthy(page, "yte-feature-openTranscriptButton-menuitem");
		await clickFeatureMenuItem(page, "yte-feature-openTranscriptButton-menuitem");
		await expect(page.locator("ytd-engagement-panel-section-list-renderer[target-id=PAmodern_transcript_view]")).toHaveAttribute(
			"visibility",
			"ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"
		);
	});
	test("transcript should not be shown when disabled", async ({ page }) => {
		await navigateToPageType(page, "watch");
		await disableFeature(page, "openTranscriptButton.button.enabled");
		await expect(page.locator("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript]")).toHaveAttribute(
			"visibility",
			"ENGAGEMENT_PANEL_VISIBILITY_HIDDEN"
		);
	});
});
