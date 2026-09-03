import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/playlistManagementButtons/index.metadata";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const RESUME_OVERLAY_SELECTOR = "ytd-playlist-video-renderer #overlays ytd-thumbnail-overlay-resume-playback-renderer";

async function expectButtonsRemoved(page: Page): Promise<void> {
	await expect(page.locator(".yte-remove-button")).not.toBeAttached();
	await expect(page.locator(".yte-reset-button")).not.toBeAttached();
}

async function expectRemoveButton(page: Page, timeout = 10000): Promise<void> {
	await expect(page.locator(".yte-remove-button").first()).toBeAttached({ timeout });
}

async function expectResetButton(page: Page, timeout = 10000): Promise<void> {
	await expect.poll(async () => (await page.locator(".yte-reset-button").count()) > 0, { timeout }).toBe(true);
}

async function hasResumeOverlays(page: Page): Promise<boolean> {
	return (await page.locator(RESUME_OVERLAY_SELECTOR).count()) > 0;
}

test.describe("playlistManagementButtons", () => {
	for (const pageType of testPages) {
		test(`remove button should appear on playlist items when enabled on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType, ["playlistManagementButtons"]);
			await enableFeature(page, "playlistManagementButtons.removeButton.enabled");
			await expectRemoveButton(page);
		});

		test(`reset button should appear on playlist items when enabled on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType, ["playlistManagementButtons"]);
			await enableFeature(page, "playlistManagementButtons.resetButton.enabled");
			await expectResetButton(page);
		});

		test(`buttons should persist after navigation when enabled on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType, ["playlistManagementButtons"]);
			await enableFeature(page, "playlistManagementButtons.removeButton.enabled");
			await enableFeature(page, "playlistManagementButtons.resetButton.enabled");
			await expectRemoveButton(page);
			if (await hasResumeOverlays(page)) {
				await expectResetButton(page);
			}
			await navigateToPageType(page, pageType, ["playlistManagementButtons"]);
			await expectRemoveButton(page);
			if (await hasResumeOverlays(page)) {
				await expectResetButton(page);
			}
		});

		test(`buttons should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType, ["playlistManagementButtons"]);
			await enableFeature(page, "playlistManagementButtons.removeButton.enabled");
			await enableFeature(page, "playlistManagementButtons.resetButton.enabled");
			await expectRemoveButton(page);
			if (await hasResumeOverlays(page)) {
				await expectResetButton(page);
			}
			await disableFeature(page, "playlistManagementButtons.removeButton.enabled");
			await disableFeature(page, "playlistManagementButtons.resetButton.enabled");
			await expectButtonsRemoved(page);
			await enableFeature(page, "playlistManagementButtons.removeButton.enabled");
			await enableFeature(page, "playlistManagementButtons.resetButton.enabled");
			await expectRemoveButton(page);
			if (await hasResumeOverlays(page)) {
				await expectResetButton(page, 15000);
			}
		});

		test(`buttons should persist after full page reload on ${pageType}`, async ({ page }) => {
			test.skip(!hasAuthState(), "requires YouTube login for Innertube API");
			await navigateToPageType(page, pageType, ["playlistManagementButtons"]);
			await enableFeature(page, "playlistManagementButtons.removeButton.enabled");
			await enableFeature(page, "playlistManagementButtons.resetButton.enabled");
			await expectRemoveButton(page);
			if (await hasResumeOverlays(page)) {
				await expectResetButton(page);
			}
			await page.reload();
			await navigateToPageType(page, pageType, ["playlistManagementButtons"]);
			await expectRemoveButton(page);
			if (await hasResumeOverlays(page)) {
				await expectResetButton(page);
			}
		});
	}
});
