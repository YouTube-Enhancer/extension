import {
	clickFeatureMenuItem,
	disableFeature,
	enableFeature,
	expect,
	expectFeatureMenuItemToBeFalsy,
	expectFeatureMenuItemToBeTruthy,
	navigateToOptionsPage,
	navigateToYoutubePage,
	test
} from "playwright.config";
test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});

test("should enable open transcript button", async ({ page }) => {
	await enableFeature(page, "enable_open_transcript_button");
});
test("should disable open transcript button", async ({ page }) => {
	await disableFeature(page, "enable_open_transcript_button");
});
test("open transcript button should be enabled", async ({ page }) => {
	await enableFeature(page, "enable_open_transcript_button");
	await navigateToYoutubePage(page);
	await expectFeatureMenuItemToBeTruthy(page, "yte-feature-openTranscriptButton-menuitem");
});
test("open transcript button should be disabled", async ({ page }) => {
	await disableFeature(page, "enable_open_transcript_button");
	await navigateToYoutubePage(page);
	await expectFeatureMenuItemToBeFalsy(page, "yte-feature-openTranscriptButton-menuitem");
});
test("transcript should be shown", async ({ page }) => {
	await enableFeature(page, "enable_open_transcript_button");
	await navigateToYoutubePage(page);
	await expectFeatureMenuItemToBeTruthy(page, "yte-feature-openTranscriptButton-menuitem");
	await clickFeatureMenuItem(page, "yte-feature-openTranscriptButton-menuitem");
	const isTranscriptShown = await page.evaluate((selector) => {
		const transcript = document.querySelector(selector) as unknown as HTMLDivElement | null;
		if (!transcript) return null;
		return transcript.getAttribute("visibility") !== "ENGAGEMENT_PANEL_VISIBILITY_HIDDEN";
	}, "ytd-engagement-panel-section-list-renderer[target-id=engagement-panel-searchable-transcript");
	expect(isTranscriptShown).toBeTruthy();
	expect(isTranscriptShown).toBe(true);
});
