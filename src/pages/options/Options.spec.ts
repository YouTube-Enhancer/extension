import type { Page } from "@playwright/test";

import { readFile } from "fs/promises";
import { expect, optionsTest as test } from "playwright.config";

import { loadDefaultConfig } from "@/src/utils/_tests/features";

const SEEDED_HIDE_TIME = 1234;
const SEEDED_STATE = { shortsPageVolume: 12, watchPageVolume: 34 };

async function readHideTime(page: Page): Promise<number> {
	return page.evaluate(async () => {
		const { onScreenDisplay } = await chrome.storage.local.get<{ onScreenDisplay: { hideTime: number } }>("onScreenDisplay");
		return onScreenDisplay.hideTime;
	});
}
async function readRememberVolumeState(page: Page): Promise<unknown> {
	return page.evaluate(async () => {
		const stored = await chrome.storage.local.get<{ "state:rememberVolume": unknown }>("state:rememberVolume");
		return stored["state:rememberVolume"];
	});
}
/** Writes a value that differs from the default so a reset/clear that silently does nothing is observable. */
async function seedNonDefaultSettings(page: Page): Promise<void> {
	await page.evaluate(
		async ([hideTime, state]) => {
			const { onScreenDisplay } = await chrome.storage.local.get<{ onScreenDisplay: Record<string, unknown> }>("onScreenDisplay");
			await chrome.storage.local.set({
				onScreenDisplay: { ...onScreenDisplay, hideTime },
				"state:rememberVolume": state
			});
		},
		[SEEDED_HIDE_TIME, SEEDED_STATE] as const
	);
	await expect.poll(async () => readHideTime(page)).toBe(SEEDED_HIDE_TIME);
}

test.describe("Options", () => {
	test("should render YouTube Enhancer settings page", async ({ page }) => {
		expect(page.url()).toContain("/src/pages/options/index.html");
		expect(await page.title()).toBe("YouTube Enhancer | Options");
	});
	test("should render language select", async ({ page }) => {
		// The Select component renders `id={label}` and `<label htmlFor={label}>`, so the control is only
		// reachable through its label association.
		const languageSelect = page.getByLabel("Language", { exact: true });
		await expect(languageSelect).toBeAttached();
	});
	test("should import settings", async ({ page }) => {
		const importSettings = page.locator("#import_settings_button");
		await expect(importSettings).toBeAttached();
		// The button only forwards the click to the hidden input; driving the input directly avoids the
		// file chooser dialog that Playwright would otherwise have to intercept.
		const importInput = page.locator("#import_settings_input");
		await expect(importInput).toBeAttached();
		await importInput.setInputFiles("tests/test-settings.json");
		const settingsImported = page.locator("#notifications > div").getByText("Settings imported successfully");
		await expect(settingsImported).toBeAttached();
		await expect
			.poll(async () =>
				page.evaluate(async () => {
					const { onScreenDisplay, playerQuality, playerSpeed } = await chrome.storage.local.get<{
						onScreenDisplay: { color: string; hideTime: number };
						playerQuality: { enabled: boolean; quality: string };
						playerSpeed: { speed: number };
					}>(["onScreenDisplay", "playerQuality", "playerSpeed"]);
					return {
						color: onScreenDisplay.color,
						hideTime: onScreenDisplay.hideTime,
						quality: playerQuality.quality,
						qualityEnabled: playerQuality.enabled,
						speed: playerSpeed.speed
					};
				})
			)
			.toEqual({ color: "red", hideTime: 1505, quality: "hd2160", qualityEnabled: true, speed: 4 });
	});
	test("should export settings", async ({ page }) => {
		await seedNonDefaultSettings(page);
		const exportSettings = page.locator("#export_settings_button");
		await expect(exportSettings).toBeAttached();
		const [download] = await Promise.all([page.waitForEvent("download"), exportSettings.click()]);
		expect(download.suggestedFilename()).toMatch(/^youtube_enhancer_settings_.+\.json$/);
		const exported = JSON.parse(await readFile(await download.path(), "utf8")) as Record<string, unknown>;
		const defaultConfiguration = await loadDefaultConfig();
		for (const key of Object.keys(defaultConfiguration)) {
			expect(exported).toHaveProperty(key);
		}
		expect(exported["state:rememberVolume"]).toEqual(SEEDED_STATE);
		const settingsExported = page.locator("#notifications > div").getByText("Settings successfully exported");
		await expect(settingsExported).toBeAttached();
	});
	test("should clear data", async ({ page }) => {
		const defaultConfiguration = await loadDefaultConfig();
		await seedNonDefaultSettings(page);
		const clearData = page.locator("#clear_data_button");
		await expect(clearData).toBeAttached();
		page.on("dialog", (dialog) => {
			void (async () => {
				await dialog.accept();
			})();
		});
		await clearData.click();
		const dataCleared = page.locator("#notifications > div").getByText("All data has been deleted.");
		await expect(dataCleared).toBeAttached();
		await expect.poll(async () => readHideTime(page)).toBe(defaultConfiguration.onScreenDisplay.hideTime);
		// Clearing resets the configuration only; feature state must survive it.
		expect(await readRememberVolumeState(page)).toEqual(SEEDED_STATE);
	});
	test("should reset data", async ({ page }) => {
		const defaultConfiguration = await loadDefaultConfig();
		await seedNonDefaultSettings(page);
		const resetData = page.locator("#reset_button");
		await expect(resetData).toBeAttached();
		await resetData.click();
		const confirmButton = page.locator("#confirm_button");
		await expect(confirmButton).toBeAttached();
		await confirmButton.click();
		const dataReset = page.locator("#notifications > div").getByText("Options saved.").first();
		await expect(dataReset).toBeAttached();
		await expect.poll(async () => readHideTime(page)).toBe(defaultConfiguration.onScreenDisplay.hideTime);
	});
});
