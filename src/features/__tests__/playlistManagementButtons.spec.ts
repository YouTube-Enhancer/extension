import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/playlistManagementButtons/index.metadata";
import { hasAuthState } from "@/src/utils/_tests/auth";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
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
		test(`toggling feature should not crash the page on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "playlistManagementButtons.removeButton.enabled");
			await page.waitForTimeout(1000);
			await expect(page.locator("body")).toBeAttached();
			await disableFeature(page, "playlistManagementButtons.removeButton.enabled");
			await page.waitForTimeout(500);
			await expect(page.locator("body")).toBeAttached();
		});

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

		test(`remove and reset buttons should be removed when disabled on ${pageType}`, async ({ page }) => {
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

	test(`should not create buttons on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "playlistManagementButtons.removeButton.enabled");
		await enableFeature(page, "playlistManagementButtons.resetButton.enabled");
		await expect(page.locator(".yte-remove-button")).not.toBeAttached();
		await expect(page.locator(".yte-reset-button")).not.toBeAttached();
	});
});
