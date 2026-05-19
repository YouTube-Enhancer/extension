import { expect, test } from "playwright.config";

import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
const placement = "player_controls_left" as const;
test.describe("openTranscriptButton", () => {
	test("open transcript button should be enabled", async ({ page }) => {
		await navigateToPageType(page, "watch");
		await enableFeature(page, "openTranscriptButton.button.enabled");
		await setOption(page, "openTranscriptButton.button.placement", placement);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
	});
	test("open transcript button should be disabled", async ({ page }) => {
		await navigateToPageType(page, "watch");
		await disableFeature(page, "openTranscriptButton.button.enabled");
		await setOption(page, "openTranscriptButton.button.placement", placement);
		await expectFeatureButtonToBeFalsy(page, "yte-feature-openTranscriptButton-button");
	});
	test("transcript should be shown when clicking the transcript button", async ({ page }) => {
		await navigateToPageType(page, "watch");
		await enableFeature(page, "openTranscriptButton.button.enabled");
		await setOption(page, "openTranscriptButton.button.placement", placement);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
		await clickFeatureButton(page, "yte-feature-openTranscriptButton-button", placement);
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
