import type { Download, Page } from "@playwright/test";

import { readFile } from "node:fs/promises";
import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/screenshotButton/index.metadata";
import {
	expectFeatureButtonToBeFalsy,
	expectFeatureButtonToBeTruthy,
	expectFeatureMenuItemToBeTruthy,
	expectToStay
} from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, clickFeatureMenuItem, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { left } = placementRecord;
const { home, watch } = pageTypeRecord;
const copiedToClipboardText = "Screenshot copied to clipboard";
/**
 * Asserts the saved screenshot matches the default filename template ("Screenshot-{video id}-{date}" with the
 * iso date format) and that its contents really are a PNG, which is the configured default format.
 */
async function expectScreenshotDownload(download: Download, pageUrl: string): Promise<void> {
	const videoId = new URL(pageUrl).searchParams.get("v") ?? "";
	expect(videoId).not.toBe("");
	expect(download.suggestedFilename()).toMatch(new RegExp(`^Screenshot-${videoId}-.+\\.png$`));
	const contents = await readFile(await download.path());
	expect([...contents.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
}
/** Mirrors the "dayMonthYear" date format without reusing the formatter the feature itself runs. */
function formatDayMonthYear(date: Date): string {
	const pad = (value: number) => value.toString().padStart(2, "0");
	return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}
/** Mirrors the "mmss" timestamp format with the "hyphen" separator. */
function formatMinutesSeconds(seconds: number): string {
	const pad = (value: number) => value.toString().padStart(2, "0");
	const total = Math.max(0, Math.floor(seconds));
	return `${pad(Math.floor(total / 60))}-${pad(total % 60)}`;
}
/** Pauses playback and reports the dimensions and time the filename placeholders are built from. */
async function freezeAndReadVideoInfo(page: Page) {
	return page.evaluate(() => {
		const video = document.querySelector<HTMLVideoElement>("video");
		if (!video) throw new Error("No video element found");
		video.pause();
		return {
			currentTime: video.currentTime,
			height: video.videoHeight || video.offsetHeight || 360,
			width: video.videoWidth || video.offsetWidth || 640
		};
	});
}
test.describe("screenshotButton", () => {
	for (const pageType of testPages) {
		test(`should take a screenshot and save as file on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await enableFeature(page, "screenshotButton.button.enabled");
			await setOption(page, "screenshotButton.saveAs", "file");
			await setOption(page, "screenshotButton.button.placement", left);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
			const downloadPromise = page.waitForEvent("download");
			await clickFeatureButton(page, pageType, "yte-feature-screenshotButton-button", left);
			const download = await downloadPromise;
			await expectScreenshotDownload(download, page.url());
		});
	}

	// The remaining screenshot and lifecycle paths are page-agnostic and the live fixture costs up to 120 s,
	// so they run on watch only; live stays covered by the save-as-file smoke case above.
	test(`should take a screenshot and copy it to the clipboard on ${watch}`, async ({ page }) => {
		page.on("dialog", (dialog) => {
			void (async () => {
				await dialog.accept();
			})();
		});
		await navigateToPageType(page, watch);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.saveAs", "clipboard");
		await setOption(page, "screenshotButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
		await clickFeatureButton(page, watch, "yte-feature-screenshotButton-button", left);
		await expect(page.getByText("Screenshot copied to clipboard")).toBeVisible();
		// copyToClipboard hardcodes image/png; screenshotButton.format only applies to the saved file.
		// The tooltip shows before the write finishes, so the clipboard is polled until the image lands.
		await expect
			.poll(
				async () =>
					page.evaluate(async () => {
						const items = await navigator.clipboard.read();
						return items.some((item) => item.types.includes("image/png"));
					}),
				{ timeout: 10000 }
			)
			.toBe(true);
	});

	test(`should take a screenshot and save as file and copy to clipboard on ${watch}`, async ({ page }) => {
		page.on("dialog", (dialog) => {
			void (async () => {
				await dialog.accept();
			})();
		});
		await navigateToPageType(page, watch);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.saveAs", "both");
		await setOption(page, "screenshotButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
		const downloadPromise = page.waitForEvent("download");
		await clickFeatureButton(page, watch, "yte-feature-screenshotButton-button", left);
		// index.ts writes the clipboard first and schedules the tooltip removal 1200 ms later, so it can be gone
		// by the time the download resolves.
		await expect(page.getByText("Screenshot copied to clipboard")).toBeVisible();
		// The tooltip shows before the write finishes, so the clipboard is polled until the image lands.
		await expect
			.poll(
				async () =>
					page.evaluate(async () => {
						const items = await navigator.clipboard.read();
						return items.some((item) => item.types.some((type) => type.startsWith("image/")));
					}),
				{ timeout: 10000 }
			)
			.toBe(true);
		const download = await downloadPromise;
		await expectScreenshotDownload(download, page.url());
	});

	test(`should name the downloaded file from the filename template and date format on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.saveAs", "file");
		await setOption(page, "screenshotButton.filename", "{video id}_{date}");
		await setOption(page, "screenshotButton.dateFormat", "dayMonthYear");
		await setOption(page, "screenshotButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
		const videoId = new URL(page.url()).searchParams.get("v") ?? "";
		expect(videoId).not.toBe("");
		const dateBeforeClick = formatDayMonthYear(new Date());
		const downloadPromise = page.waitForEvent("download");
		await clickFeatureButton(page, watch, "yte-feature-screenshotButton-button", left);
		const download = await downloadPromise;
		// "dayMonthYear" renders the local date as DD-MM-YYYY; both samples are accepted so a midnight rollover
		// between the click and the assertion cannot flake.
		const dateAfterClick = formatDayMonthYear(new Date());
		expect([`${videoId}_${dateBeforeClick}.png`, `${videoId}_${dateAfterClick}.png`]).toContain(download.suggestedFilename());
	});

	test(`should save the screenshot in the selected format on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.saveAs", "file");
		await setOption(page, "screenshotButton.format", "jpeg");
		await setOption(page, "screenshotButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
		const videoId = new URL(page.url()).searchParams.get("v") ?? "";
		const downloadPromise = page.waitForEvent("download");
		await clickFeatureButton(page, watch, "yte-feature-screenshotButton-button", left);
		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(new RegExp(`^Screenshot-${videoId}-.+\\.jpeg$`));
		// The extension comes from the config string while the encoding comes from canvas.toBlob, so the magic
		// number is what proves a PNG was not just renamed.
		const contents = await readFile(await download.path());
		expect([...contents.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
	});

	test(`should fall back to the default filename template when the template resolves to empty on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.saveAs", "file");
		// Only unknown tokens: every placeholder is stripped, the resolved name is empty and the default template
		// has to take over instead of producing a nameless download.
		await setOption(page, "screenshotButton.filename", "{unknown placeholder}");
		await setOption(page, "screenshotButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
		const downloadPromise = page.waitForEvent("download");
		await clickFeatureButton(page, watch, "yte-feature-screenshotButton-button", left);
		const download = await downloadPromise;
		await expectScreenshotDownload(download, page.url());
	});

	test(`should resolve the resolution and video timestamp placeholders in the filename on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.saveAs", "file");
		await setOption(page, "screenshotButton.filename", "{resolution}_{video timestamp}");
		await setOption(page, "screenshotButton.timestampFormat", "mmss");
		await setOption(page, "screenshotButton.timestampSeparator", "hyphen");
		await setOption(page, "screenshotButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
		// Playback is paused first so the timestamp the feature reads cannot run away from the sampled one.
		const { currentTime, height, width } = await freezeAndReadVideoInfo(page);
		const downloadPromise = page.waitForEvent("download");
		await clickFeatureButton(page, watch, "yte-feature-screenshotButton-button", left);
		const download = await downloadPromise;
		const { currentTime: currentTimeAfterClick } = await freezeAndReadVideoInfo(page);
		expect([
			`${width}x${height}_${formatMinutesSeconds(currentTime)}.png`,
			`${width}x${height}_${formatMinutesSeconds(currentTimeAfterClick)}.png`
		]).toContain(download.suggestedFilename());
	});

	test(`should take a screenshot from the feature menu item on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.saveAs", "file");
		await setOption(page, "screenshotButton.button.placement", "feature_menu");
		await expectFeatureMenuItemToBeTruthy(page, "yte-feature-screenshotButton-menuitem");
		const downloadPromise = page.waitForEvent("download");
		await clickFeatureMenuItem(page, watch, "yte-feature-screenshotButton-menuitem");
		const download = await downloadPromise;
		await expectScreenshotDownload(download, page.url());
	});

	test(`should run only the save action the saveAs mode selects on ${watch}`, async ({ page }) => {
		page.on("dialog", (dialog) => {
			void (async () => {
				await dialog.accept();
			})();
		});
		const downloads: Download[] = [];
		page.on("download", (download) => downloads.push(download));
		await navigateToPageType(page, watch);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.saveAs", "file");
		await setOption(page, "screenshotButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
		await clickFeatureButton(page, watch, "yte-feature-screenshotButton-button", left);
		await expect.poll(() => downloads.length, { timeout: 15_000 }).toBe(1);
		// The "copied" tooltip only exists in copyToClipboard, so it must never show while saving to a file. The
		// hover tooltip shares the element id, which is why the text is what is asserted.
		await expectToStay(async () => page.getByText(copiedToClipboardText).count(), 0, { page });
		await setOption(page, "screenshotButton.saveAs", "clipboard");
		await clickFeatureButton(page, watch, "yte-feature-screenshotButton-button", left);
		await expect(page.getByText(copiedToClipboardText)).toBeVisible();
		await expectToStay(() => Promise.resolve(downloads.length), 1, { page });
	});

	test(`screenshot button should persist after navigation on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
	});

	test(`screenshot button should re-appear after disable then re-enable on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
		await disableFeature(page, "screenshotButton.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-screenshotButton-button");
		await enableFeature(page, "screenshotButton.button.enabled");
		await setOption(page, "screenshotButton.button.placement", left);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-screenshotButton-button");
	});

	test(`should not create screenshot button on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "screenshotButton.button.enabled");
		await expect(page.locator("#yte-feature-screenshotButton-button")).not.toBeAttached();
	});
});
