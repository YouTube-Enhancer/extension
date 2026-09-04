import type { Page } from "@playwright/test";

import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { expect, optionsTest as test } from "playwright.config";

import { loadDefaultConfig } from "@/src/utils/_tests/features";
import { setCheckbox } from "@/src/utils/_tests/options";

const SEEDED_HIDE_TIME = 1234;
const SEEDED_STATE = { shortsPageVolume: 12, watchPageVolume: 34 };
const FEATURES_DIR = "src/features";
const localeCache = new Map<string, Record<string, unknown>>();

/** Loads a shipped locale file so label expectations come from the same source the UI renders from. */
async function loadLocale(locale: string): Promise<Record<string, unknown>> {
	const cached = localeCache.get(locale);
	if (cached) return cached;
	const parsed = JSON.parse(await readFile(`public/locales/${locale}.json`, "utf8")) as Record<string, unknown>;
	localeCache.set(locale, parsed);
	return parsed;
}
async function readCustomCSSCode(page: Page): Promise<string> {
	return page.evaluate(async () => {
		const { customCSS } = await chrome.storage.local.get<{ customCSS: { code: string } }>("customCSS");
		return customCSS.code;
	});
}
/** Reads the `enabled` flag of a feature slice straight out of extension storage. */
async function readFeatureEnabled(page: Page, feature: string): Promise<boolean | undefined> {
	return page.evaluate(async (key) => {
		const stored = await chrome.storage.local.get<Record<string, { enabled?: boolean }>>(key);
		return stored[key]?.enabled;
	}, feature);
}
/**
 * Collects the section title of every feature that declares one, straight from the metadata sources, so the
 * expectation cannot silently shrink when a feature stops rendering.
 */
async function readFeatureSectionTitles(): Promise<string[]> {
	const locale = await loadLocale("en-US");
	const entries = await readdir(FEATURES_DIR, { withFileTypes: true });
	const titles = new Set<string>();
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const source = await readFile(join(FEATURES_DIR, entry.name, "index.metadata.ts"), "utf8").catch(() => null);
		if (!source) continue;
		const sectionTitlePath = /sectionTitle:\s*\(t\)\s*=>\s*t\(\(tr\)\s*=>\s*tr\.([\w.]+)\)/.exec(source)?.[1];
		if (!sectionTitlePath) continue;
		titles.add(translate(locale, sectionTitlePath));
	}
	return [...titles];
}
async function readHideTime(page: Page): Promise<number> {
	return page.evaluate(async () => {
		const { onScreenDisplay } = await chrome.storage.local.get<{ onScreenDisplay: { hideTime: number } }>("onScreenDisplay");
		return onScreenDisplay.hideTime;
	});
}
async function readLanguage(page: Page): Promise<string> {
	return page.evaluate(async () => {
		const { language } = await chrome.storage.local.get<{ language: string }>("language");
		return language;
	});
}
async function readOnScreenDisplay(page: Page): Promise<{ opacity: number }> {
	return page.evaluate(async () => {
		const { onScreenDisplay } = await chrome.storage.local.get<{ onScreenDisplay: { opacity: number } }>("onScreenDisplay");
		return onScreenDisplay;
	});
}
async function readPlayerQuality(page: Page): Promise<{ enabled: boolean; quality: string }> {
	return page.evaluate(async () => {
		const { playerQuality } = await chrome.storage.local.get<{ playerQuality: { enabled: boolean; quality: string } }>("playerQuality");
		return playerQuality;
	});
}
async function readRememberVolumeState(page: Page): Promise<unknown> {
	return page.evaluate(async () => {
		const stored = await chrome.storage.local.get<{ "state:rememberVolume": unknown }>("state:rememberVolume");
		return stored["state:rememberVolume"];
	});
}
/** Reads a whole storage slice, so an import that must not touch storage can be compared before and after. */
async function readStoredKey(page: Page, key: string): Promise<unknown> {
	return page.evaluate(async (storageKey) => {
		const stored = await chrome.storage.local.get<Record<string, unknown>>(storageKey);
		return stored[storageKey] ?? null;
	}, key);
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
/** Picks an option in the custom Select, which renders a button plus a listbox instead of a native <select>. */
async function selectOption(page: Page, label: string, value: string): Promise<void> {
	await page.getByLabel(label, { exact: true }).click();
	await page.locator(`[role="option"][aria-valuetext="${value}"]`).click();
}
function translate(locale: Record<string, unknown>, path: string): string {
	const value = path.split(".").reduce<unknown>((accumulator, key) => (accumulator as Record<string, unknown> | undefined)?.[key], locale);
	if (typeof value !== "string") throw new Error(`Missing locale string for "${path}"`);
	return value;
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
		// The toast lives 2.5 s; check it before reading the download back so a slow disk cannot outlast it.
		const settingsExported = page.locator("#notifications > div").getByText("Settings successfully exported");
		await expect(settingsExported).toBeAttached();
		expect(download.suggestedFilename()).toMatch(/^youtube_enhancer_settings_.+\.json$/);
		const exported = JSON.parse(await readFile(await download.path(), "utf8")) as Record<string, unknown>;
		const defaultConfiguration = await loadDefaultConfig();
		for (const key of Object.keys(defaultConfiguration)) {
			expect(exported).toHaveProperty(key);
		}
		expect(exported["state:rememberVolume"]).toEqual(SEEDED_STATE);
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
	test("should restore the reset button when the reset notification is dismissed", async ({ page }) => {
		await seedNonDefaultSettings(page);
		await page.locator("#reset_button").click();
		await expect(page.locator("#confirm_button")).toBeAttached();
		await expect(page.locator("#reset_button")).not.toBeAttached();
		// The footer swaps the buttons purely off the presence of the reset notification, so closing it has to
		// put the reset button back instead of leaving a permanent confirm button.
		await page.locator("#notifications > div").filter({ hasText: "All options have been reset" }).locator("button").click();
		await expect(page.locator("#reset_button")).toBeAttached();
		await expect(page.locator("#confirm_button")).not.toBeAttached();
		// Dismissing is a cancel, so the seeded value must survive it.
		expect(await readHideTime(page)).toBe(SEEDED_HIDE_TIME);
	});
	test("should render a section for every feature metadata section", async ({ page }) => {
		const locale = await loadLocale("en-US");
		const expectedTitles = await readFeatureSectionTitles();
		expect(expectedTitles.length).toBeGreaterThan(10);
		// The page renders a <Loader /> until the settings and the i18n instance have both resolved.
		await expect(page.locator("legend").first()).toBeVisible();
		const renderedTitles = await page.locator("legend").allTextContents();
		for (const title of expectedTitles) {
			expect(renderedTitles).toContain(title);
		}
		// Features without a section of their own are collected under the miscellaneous section.
		expect(renderedTitles).toContain(translate(locale, "settings.sections.miscellaneous.title"));
	});
	test("should persist a checkbox change to storage", async ({ page }) => {
		const locale = await loadLocale("en-US");
		const scrollWheelLabel = translate(locale, "settings.sections.scrollWheelVolumeControl.enable.label");
		await expect(page.getByLabel(scrollWheelLabel, { exact: true })).not.toBeChecked();
		await setCheckbox(page, scrollWheelLabel, true);
		await expect(
			page.locator("#notifications > div").getByText(translate(locale, "pages.options.notifications.success.saved")).first()
		).toBeAttached();
		await expect.poll(async () => readFeatureEnabled(page, "scrollWheelVolumeControl")).toBe(true);
		await page.reload();
		// The control renders from storage, so the reloaded page proves the write survived the round trip.
		await expect(page.getByLabel(translate(locale, "settings.sections.scrollWheelVolumeControl.enable.label"), { exact: true })).toBeChecked();
	});
	test("should persist a number setting typed into the options UI", async ({ page }) => {
		const locale = await loadLocale("en-US");
		const opacity = page.getByLabel(translate(locale, "settings.sections.onScreenDisplaySettings.settings.opacity.label"), { exact: true });
		// The on-screen display controls stay disabled until one of the features that draws it is enabled.
		await expect(opacity).toBeDisabled();
		await setCheckbox(page, translate(locale, "settings.sections.scrollWheelVolumeControl.enable.label"), true);
		await expect(opacity).toBeEnabled();
		await opacity.fill("42");
		// The number input debounces, and the setter coerces the string back to a number before storing it.
		await expect.poll(async () => readOnScreenDisplay(page), { timeout: 10000 }).toMatchObject({ opacity: 42 });
	});
	test("should persist a select change made in the options UI", async ({ page }) => {
		const locale = await loadLocale("en-US");
		const qualityLabel = translate(locale, "settings.sections.playerQuality.settings.quality.select.label");
		await setCheckbox(page, translate(locale, "settings.sections.playerQuality.enable.label"), true);
		await selectOption(page, qualityLabel, "hd1440");
		await expect.poll(async () => readPlayerQuality(page), { timeout: 10000 }).toMatchObject({ enabled: true, quality: "hd1440" });
		await page.reload();
		await expect(page.getByLabel(qualityLabel, { exact: true })).toHaveText("1440p");
	});
	test("should disable child settings while the parent feature is off", async ({ page }) => {
		const locale = await loadLocale("en-US");
		const parentLabel = translate(locale, "settings.sections.playerQuality.enable.label");
		const qualitySelect = page.getByLabel(translate(locale, "settings.sections.playerQuality.settings.quality.select.label"), { exact: true });
		await expect(qualitySelect).toBeDisabled();
		// The wrapper carries the explanation naming the parent setting instead of the setting's own title.
		const disabledTooltip = translate(locale, "pages.options.extras.optionDisabled.singular").replace("{{OPTION}}", parentLabel);
		await expect(page.locator(`div[title="${disabledTooltip}"]`).first()).toBeAttached();
		await setCheckbox(page, parentLabel, true);
		await expect(qualitySelect).toBeEnabled();
	});
	test("should reveal deep dark colour pickers only for the Custom preset", async ({ page }) => {
		const locale = await loadLocale("en-US");
		const accentColorLabel = translate(locale, "settings.sections.deepDarkCSS.settings.mainColor.label");
		const presetLabel = translate(locale, "settings.sections.deepDarkCSS.settings.theme.select.label");
		// visibleWhen removes the node entirely, so the colour pickers are absent rather than merely disabled.
		await expect(page.getByText(accentColorLabel, { exact: true })).not.toBeAttached();
		await setCheckbox(page, translate(locale, "settings.sections.deepDarkCSS.enable.label"), true);
		await selectOption(page, presetLabel, "Custom");
		await expect(page.getByText(accentColorLabel, { exact: true })).toBeAttached();
		await selectOption(page, presetLabel, "Dracula");
		await expect(page.getByText(accentColorLabel, { exact: true })).not.toBeAttached();
	});
	test("should filter settings with the header search box", async ({ page }) => {
		const locale = await loadLocale("en-US");
		const screenshotSection = page.locator("legend").filter({ hasText: translate(locale, "settings.sections.screenshotButton.title") });
		const playlistLengthSection = page.locator("legend").filter({ hasText: translate(locale, "settings.sections.playlistLength.title") });
		await expect(screenshotSection).toBeVisible();
		await expect(playlistLengthSection).toBeVisible();
		await page.getByPlaceholder(translate(locale, "pages.options.extras.settingSearch.placeholder")).fill("screenshot");
		// The matcher runs over feature ids as well as labels, so the screenshot section stays while unrelated
		// sections are removed from the DOM entirely.
		await expect(screenshotSection).toBeVisible();
		await expect(playlistLengthSection).not.toBeAttached();
		await page.getByPlaceholder(translate(locale, "pages.options.extras.settingSearch.placeholder")).fill("");
		await expect(playlistLengthSection).toBeVisible();
	});
	test("should save custom CSS typed into the editor", async ({ page }) => {
		const locale = await loadLocale("en-US");
		const customCSSLabel = translate(locale, "settings.sections.customCSS.enable.label");
		await setCheckbox(page, customCSSLabel, true);
		const editor = page.locator(".monaco-editor").first();
		await expect(editor).toBeVisible({ timeout: 30000 });
		await editor.click();
		// Monaco auto-closes the brace and, when keystrokes arrive faster than it settles, the closing brace can land in the
		// middle of the text. One input event carries the whole string through the same editor path without that race.
		await page.keyboard.insertText("body{--yte-editor-test:1;}");
		// The editor debounces for 500 ms and flushes on blur, so moving focus away is what commits the value.
		await page.getByLabel(customCSSLabel, { exact: true }).focus();
		await expect.poll(async () => readCustomCSSCode(page), { timeout: 15000 }).toContain("--yte-editor-test");
	});
	test("should ask which feature to keep when imported settings conflict", async ({ page }) => {
		const locale = await loadLocale("en-US");
		await page.locator("#import_settings_input").setInputFiles("tests/test-settings-conflict.json");
		// globalVolume and rememberVolume cannot both be on, so the import is held back until it is resolved.
		await expect(page.getByText(translate(locale, "pages.options.notifications.error.importConflict.title"))).toBeVisible();
		expect(await readFeatureEnabled(page, "rememberVolume")).toBe(false);
		await page.getByLabel("Remember Volume").check();
		await page.getByRole("button", { name: translate(locale, "pages.options.notifications.error.importConflict.apply") }).click();
		await expect
			.poll(
				async () => ({
					globalVolume: await readFeatureEnabled(page, "globalVolume"),
					rememberVolume: await readFeatureEnabled(page, "rememberVolume")
				}),
				{ timeout: 10000 }
			)
			.toEqual({ globalVolume: false, rememberVolume: true });
	});
	test("should reject an invalid settings file and leave storage untouched", async ({ page }) => {
		const locale = await loadLocale("en-US");
		const before = await readStoredKey(page, "onScreenDisplay");
		const alerts: string[] = [];
		// Without a handler Playwright auto-dismisses the alert, which would hide a swallowed validation error.
		page.on("dialog", (dialog) => {
			alerts.push(dialog.message());
			void dialog.dismiss();
		});
		// The file passes the schema (opacity is just a number) and is only rejected by the numeric constraints.
		await page.locator("#import_settings_input").setInputFiles("tests/test-settings-invalid.json");
		await expect.poll(() => alerts, { timeout: 10000 }).toContain("onScreenDisplay.opacity must be <= 100");
		await expect(
			page.locator("#notifications > div").getByText(translate(locale, "pages.options.extras.importExportSettings.importButton.success"))
		).not.toBeAttached();
		expect(await readStoredKey(page, "onScreenDisplay")).toEqual(before);
	});
	test("should flip the settings root to rtl for a right-to-left language", async ({ page }) => {
		const locale = await loadLocale("en-US");
		const settingsRoot = page.locator("div.min-h-screen").first();
		await expect(settingsRoot).toHaveAttribute("dir", "ltr");
		await selectOption(page, translate(locale, "pages.options.extras.language.select.label"), "he-IL");
		await expect.poll(async () => readLanguage(page), { timeout: 10000 }).toBe("he-IL");
		await expect(settingsRoot).toHaveAttribute("dir", "rtl");
	});
	test("should re-translate the settings UI when the language changes", async ({ page }) => {
		const english = await loadLocale("en-US");
		const german = await loadLocale("de-DE");
		const englishTitle = translate(english, "settings.sections.playerQuality.title");
		await expect(page.locator("legend").filter({ hasText: englishTitle })).toBeVisible();
		await selectOption(page, translate(english, "pages.options.extras.language.select.label"), "de-DE");
		await expect.poll(async () => readLanguage(page), { timeout: 10000 }).toBe("de-DE");
		// Every label is produced by the i18n instance the page holds, so the generated sections have to
		// re-render in the newly selected locale without a reload.
		await expect(page.locator("legend").filter({ hasText: translate(german, "settings.sections.playerQuality.title") })).toBeVisible();
		await expect(page.locator("legend").filter({ hasText: englishTitle })).not.toBeAttached();
	});
});
