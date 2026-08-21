import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/openTranscriptButton/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeTruthy } from "@/src/utils/_tests/assertions";
import { placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const { left } = placementRecord;
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
test.describe("openTranscriptButton", () => {
	for (const pageType of testPages) {
		test("open transcript button should be enabled", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "openTranscriptButton.button.enabled");
			await setOption(page, "openTranscriptButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
		});
		test("open transcript button should be disabled", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "openTranscriptButton.button.enabled");
			await setOption(page, "openTranscriptButton.button.placement", left);
			await expectFeatureButtonToBeFalsy(page, "yte-feature-openTranscriptButton-button");
		});
		test("transcript should be shown when clicking the transcript button", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "openTranscriptButton.button.enabled");
			await setOption(page, "openTranscriptButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-openTranscriptButton-button");
			await clickFeatureButton(page, pageType, "yte-feature-openTranscriptButton-button", left);
			await expect(page.locator("ytd-engagement-panel-section-list-renderer[target-id=PAmodern_transcript_view]")).toHaveAttribute(
				"visibility",
				"ENGAGEMENT_PANEL_VISIBILITY_EXPANDED",
				{ timeout: 10000 }
			);
		});
		test("transcript should not be shown when disabled", async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "openTranscriptButton.button.enabled");
			await expect(page.locator("ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript]")).toHaveAttribute(
				"visibility",
				"ENGAGEMENT_PANEL_VISIBILITY_HIDDEN"
			);
		});
	}
});
