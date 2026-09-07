import type { Page } from "@playwright/test";

import { readFile } from "fs/promises";
import { expect, optionsTest as test } from "playwright.config";

import { youtubePlayerQualityLevels } from "@/src/features/playerQuality/types";
import { loadDefaultConfig } from "@/src/utils/_tests/features";
import { localeSelector, localeText } from "@/src/utils/_tests/locale";
import { featureSettingLabel, loadAllFeatureMetadata } from "@/src/utils/_tests/metadata";
import { setCheckbox } from "@/src/utils/_tests/options";

const SEEDED_HIDE_TIME = 1234;
// The reset notice is two sentences on two lines; the first one is enough to tell the toast apart.
const [resetNotificationFirstLine] = localeText("pages.options.notifications.info.reset").split("\n");
const SEEDED_STATE = { shortsPageVolume: 12, watchPageVolume: 34 };
/** A feature's name as the conflict dialog shows it: the label of its enable switch, from the same metadata. */
async function featureLabel(featureId: string): Promise<string> {
	return featureSettingLabel(await loadAllFeatureMetadata(), `${featureId}.enabled`, localeSelector());
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
 * The section title of every feature that declares one, asked from the feature metadata with the locale file as
 * the translator, so the expectation cannot silently shrink when a feature stops rendering.
 */
async function readFeatureSectionTitles(): Promise<string[]> {
	const t = localeSelector();
	const titles = new Set<string>();
	for (const metadata of await loadAllFeatureMetadata()) {
		if (metadata.sectionTitle) titles.add(metadata.sectionTitle(t));
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
/** Reads the keyword blocklist's newline-separated list out of storage as its lines. */
async function readStoredKeywords(page: Page): Promise<string[]> {
	return page.evaluate(async () => {
		const { keywordBlocklist } = await chrome.storage.local.get<{ keywordBlocklist?: { keywords?: string } }>("keywordBlocklist");
		return (keywordBlocklist?.keywords ?? "").split("\n").filter((line) => line.length > 0);
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
/** Picks an option in the custom Select, which renders a button plus a listbox instead of a native <select>. */
async function selectOption(page: Page, label: string, value: string): Promise<void> {
	await page.getByLabel(label, { exact: true }).click();
	await page.locator(`[role="option"][aria-valuetext="${value}"]`).click();
}
test.describe("Options", () => {
	test("should render YouTube Enhancer settings page", async ({ page }) => {
		expect(page.url()).toContain("/src/pages/options/index.html");
		expect(await page.title()).toBe("YouTube Enhancer | Options");
	});
	test("should render language select", async ({ page }) => {
		// The Select component renders `id={label}` and `<label htmlFor={label}>`, so the control is only
		// reachable through its label association.
		const languageSelect = page.getByLabel(localeText("pages.options.extras.language.select.label"), { exact: true });
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
		const settingsImported = page
			.locator("#notifications > div")
			.getByText(localeText("pages.options.extras.importExportSettings.importButton.success"));
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
		const settingsExported = page
			.locator("#notifications > div")
			.getByText(localeText("pages.options.extras.importExportSettings.exportButton.success"));
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
		const dataCleared = page.locator("#notifications > div").getByText(localeText("pages.options.extras.clearData.allDataDeleted"));
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
		const dataReset = page.locator("#notifications > div").getByText(localeText("pages.options.notifications.success.saved")).first();
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
		await page.locator("#notifications > div").filter({ hasText: resetNotificationFirstLine }).locator("button").click();
		await expect(page.locator("#reset_button")).toBeAttached();
		await expect(page.locator("#confirm_button")).not.toBeAttached();
		// Dismissing is a cancel, so the seeded value must survive it.
		expect(await readHideTime(page)).toBe(SEEDED_HIDE_TIME);
	});
	test("should render a section for every feature metadata section", async ({ page }) => {
		const expectedTitles = await readFeatureSectionTitles();
		expect(expectedTitles.length).toBeGreaterThan(10);
		// The page renders a <Loader /> until the settings and the i18n instance have both resolved.
		await expect(page.locator("legend").first()).toBeVisible();
		const renderedTitles = await page.locator("legend").allTextContents();
		for (const title of expectedTitles) {
			expect(renderedTitles).toContain(title);
		}
		// Features without a section of their own are collected under the miscellaneous section.
		expect(renderedTitles).toContain(localeText("settings.sections.miscellaneous.title"));
	});
	test("should persist a checkbox change to storage", async ({ page }) => {
		const scrollWheelLabel = localeText("settings.sections.scrollWheelVolumeControl.enable.label");
		await expect(page.getByLabel(scrollWheelLabel, { exact: true })).not.toBeChecked();
		await setCheckbox(page, scrollWheelLabel, true);
		await expect(page.locator("#notifications > div").getByText(localeText("pages.options.notifications.success.saved")).first()).toBeAttached();
		await expect.poll(async () => readFeatureEnabled(page, "scrollWheelVolumeControl")).toBe(true);
		await page.reload();
		// The control renders from storage, so the reloaded page proves the write survived the round trip.
		await expect(page.getByLabel(localeText("settings.sections.scrollWheelVolumeControl.enable.label"), { exact: true })).toBeChecked();
	});
	test("should persist a number setting typed into the options UI", async ({ page }) => {
		const opacity = page.getByLabel(localeText("settings.sections.onScreenDisplaySettings.settings.opacity.label"), { exact: true });
		// The on-screen display controls stay disabled until one of the features that draws it is enabled.
		await expect(opacity).toBeDisabled();
		await setCheckbox(page, localeText("settings.sections.scrollWheelVolumeControl.enable.label"), true);
		await expect(opacity).toBeEnabled();
		await opacity.fill("42");
		// The number input debounces, and the setter coerces the string back to a number before storing it.
		await expect.poll(async () => readOnScreenDisplay(page), { timeout: 10000 }).toMatchObject({ opacity: 42 });
	});
	test("should persist a select change made in the options UI", async ({ page }) => {
		const qualityLabel = localeText("settings.sections.playerQuality.settings.quality.select.label");
		await setCheckbox(page, localeText("settings.sections.playerQuality.enable.label"), true);
		await selectOption(page, qualityLabel, "hd1440");
		await expect.poll(async () => readPlayerQuality(page), { timeout: 10000 }).toMatchObject({ enabled: true, quality: "hd1440" });
		await page.reload();
		await expect(page.getByLabel(qualityLabel, { exact: true })).toHaveText("1440p");
	});
	test("should disable child settings while the parent feature is off", async ({ page }) => {
		const parentLabel = localeText("settings.sections.playerQuality.enable.label");
		const qualitySelect = page.getByLabel(localeText("settings.sections.playerQuality.settings.quality.select.label"), { exact: true });
		await expect(qualitySelect).toBeDisabled();
		// The wrapper carries the explanation naming the parent setting instead of the setting's own title.
		const disabledTooltip = localeText("pages.options.extras.optionDisabled.singular").replace("{{OPTION}}", parentLabel);
		await expect(page.locator(`div[title="${disabledTooltip}"]`).first()).toBeAttached();
		await setCheckbox(page, parentLabel, true);
		await expect(qualitySelect).toBeEnabled();
	});
	test("should persist keyword blocklist rows added, edited and removed in the options UI", async ({ page }) => {
		const enableLabel = localeText("settings.sections.keywordBlocklist.enable.label");
		const addButton = page.getByRole("button", { name: localeText("settings.sections.keywordBlocklist.settings.keywords.add") });
		const rows = page.getByLabel(localeText("settings.sections.keywordBlocklist.settings.keywords.item"), { exact: true });
		const removeButtons = page.getByRole("button", { name: localeText("settings.sections.keywordBlocklist.settings.keywords.remove") });
		// The list is a child of the feature toggle: off, it is disabled and says which setting to turn on.
		await expect(addButton).toBeDisabled();
		const disabledTooltip = localeText("pages.options.extras.optionDisabled.singular").replace("{{OPTION}}", enableLabel);
		await expect(page.locator(`div[title="${disabledTooltip}"]`).first()).toBeAttached();
		await setCheckbox(page, enableLabel, true);
		await expect(addButton).toBeEnabled();
		await expect(rows).toHaveCount(0);
		// Every keystroke commits: the list is stored as one keyword per line, blank rows left out.
		await addButton.click();
		await expect(rows).toHaveCount(1);
		await rows.nth(0).fill("alpha");
		await expect.poll(async () => readStoredKeywords(page)).toEqual(["alpha"]);
		await addButton.click();
		await rows.nth(1).fill("beta");
		await expect.poll(async () => readStoredKeywords(page)).toEqual(["alpha", "beta"]);
		await rows.nth(0).fill("gamma");
		await expect.poll(async () => readStoredKeywords(page)).toEqual(["gamma", "beta"]);
		await removeButtons.nth(0).click();
		await expect.poll(async () => readStoredKeywords(page)).toEqual(["beta"]);
		await page.reload();
		await expect(rows).toHaveCount(1);
		await expect(rows.nth(0)).toHaveValue("beta");
	});
	test("should cap the keyword blocklist at its maximum and hold the add button while a row is blank", async ({ page }) => {
		const addButton = page.getByRole("button", { name: localeText("settings.sections.keywordBlocklist.settings.keywords.add") });
		const rows = page.getByLabel(localeText("settings.sections.keywordBlocklist.settings.keywords.item"), { exact: true });
		const removeButtons = page.getByRole("button", { name: localeText("settings.sections.keywordBlocklist.settings.keywords.remove") });
		// Seeded past the metadata's max of 100 straight into storage, the list renders the first 100 and no add button.
		await page.evaluate(
			async (lines) => {
				await chrome.storage.local.set({ keywordBlocklist: { enabled: true, keywords: lines.join("\n") } });
			},
			Array.from({ length: 120 }, (_, index) => `keyword ${index + 1}`)
		);
		await page.reload();
		await expect(rows).toHaveCount(100);
		await expect(addButton).toBeDisabled();
		// The first edit writes the list back at the cap, dropping the surplus from storage.
		await rows.nth(0).fill("keyword one");
		await expect.poll(async () => (await readStoredKeywords(page)).length).toBe(100);
		expect((await readStoredKeywords(page))[0]).toBe("keyword one");
		await removeButtons.nth(0).click();
		await expect(rows).toHaveCount(99);
		await expect(addButton).toBeEnabled();
		// A blank row holds the add button until it is filled, and is not stored.
		await addButton.click();
		await expect(rows).toHaveCount(100);
		await expect(addButton).toBeDisabled();
		expect((await readStoredKeywords(page)).length).toBe(99);
		await rows.nth(99).fill("keyword last");
		await expect.poll(async () => (await readStoredKeywords(page)).length).toBe(100);
		await expect(addButton).toBeDisabled();
	});
	test("should reveal deep dark colour pickers only for the Custom preset", async ({ page }) => {
		const accentColorLabel = localeText("settings.sections.deepDarkCSS.settings.mainColor.label");
		const presetLabel = localeText("settings.sections.deepDarkCSS.settings.theme.select.label");
		// visibleWhen removes the node entirely, so the colour pickers are absent rather than merely disabled.
		await expect(page.getByText(accentColorLabel, { exact: true })).not.toBeAttached();
		await setCheckbox(page, localeText("settings.sections.deepDarkCSS.enable.label"), true);
		await selectOption(page, presetLabel, "Custom");
		await expect(page.getByText(accentColorLabel, { exact: true })).toBeAttached();
		await selectOption(page, presetLabel, "Dracula");
		await expect(page.getByText(accentColorLabel, { exact: true })).not.toBeAttached();
	});
	test("should filter settings with the header search box", async ({ page }) => {
		const screenshotSection = page.locator("legend").filter({ hasText: localeText("settings.sections.screenshotButton.title") });
		const playlistLengthSection = page.locator("legend").filter({ hasText: localeText("settings.sections.playlistLength.title") });
		await expect(screenshotSection).toBeVisible();
		await expect(playlistLengthSection).toBeVisible();
		await page.getByPlaceholder(localeText("pages.options.extras.settingSearch.placeholder")).fill("screenshot");
		// The matcher runs over feature ids as well as labels, so the screenshot section stays while unrelated
		// sections are removed from the DOM entirely.
		await expect(screenshotSection).toBeVisible();
		await expect(playlistLengthSection).not.toBeAttached();
		await page.getByPlaceholder(localeText("pages.options.extras.settingSearch.placeholder")).fill("");
		await expect(playlistLengthSection).toBeVisible();
	});
	test("should save custom CSS typed into the editor", async ({ page }) => {
		const customCSSLabel = localeText("settings.sections.customCSS.enable.label");
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
		await page.locator("#import_settings_input").setInputFiles("tests/test-settings-conflict.json");
		// globalVolume and rememberVolume cannot both be on, so the import is held back until it is resolved.
		await expect(page.getByText(localeText("pages.options.notifications.error.importConflict.title"))).toBeVisible();
		expect(await readFeatureEnabled(page, "rememberVolume")).toBe(false);
		// The dialog names the feature the way its own switch on this page does, so the radio role tells the two apart.
		await page.getByRole("radio", { exact: true, name: await featureLabel("rememberVolume") }).check();
		await page.getByRole("button", { name: localeText("pages.options.notifications.error.importConflict.apply") }).click();
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
			page.locator("#notifications > div").getByText(localeText("pages.options.extras.importExportSettings.importButton.success"))
		).not.toBeAttached();
		expect(await readStoredKey(page, "onScreenDisplay")).toEqual(before);
	});
	test("should flip the settings root to rtl for a right-to-left language", async ({ page }) => {
		const settingsRoot = page.locator("div.min-h-screen").first();
		await expect(settingsRoot).toHaveAttribute("dir", "ltr");
		await selectOption(page, localeText("pages.options.extras.language.select.label"), "he-IL");
		await expect.poll(async () => readLanguage(page), { timeout: 10000 }).toBe("he-IL");
		await expect(settingsRoot).toHaveAttribute("dir", "rtl");
	});
	test("should re-translate the settings UI when the language changes", async ({ page }) => {
		const englishTitle = localeText("settings.sections.playerQuality.title");
		await expect(page.locator("legend").filter({ hasText: englishTitle })).toBeVisible();
		await selectOption(page, localeText("pages.options.extras.language.select.label"), "de-DE");
		await expect.poll(async () => readLanguage(page), { timeout: 10000 }).toBe("de-DE");
		// Every label is produced by the i18n instance the page holds, so the generated sections have to
		// re-render in the newly selected locale without a reload.
		await expect(page.locator("legend").filter({ hasText: localeText("settings.sections.playerQuality.title", "de-DE") })).toBeVisible();
		await expect(page.locator("legend").filter({ hasText: englishTitle })).not.toBeAttached();
	});
	test("should import a legacy configuration by migrating its keys", async ({ page }) => {
		// The pre-registry configuration: enable_* flags, snake_case keys with values stored as strings, a
		// button_placements map and the old rememberedVolumes object. isLegacyConfiguration routes the file
		// through migrateConfiguration, and the numeric strings are parsed back on the way.
		await page.locator("#import_settings_input").setInputFiles("tests/test-settings-legacy.json");
		await expect(
			page.locator("#notifications > div").getByText(localeText("pages.options.extras.importExportSettings.importButton.success"))
		).toBeAttached();
		const stored = await page.evaluate(async () => chrome.storage.local.get<Record<string, unknown>>(null));
		expect(stored).toMatchObject({
			customCSS: { code: "body { --yte-legacy: 1; }" },
			deepDarkCSS: { colors: { mainColor: "#555555", secondBackground: "#777777" }, preset: "Dracula" },
			featureMenu: { openType: "hover" },
			forwardRewindButtons: { button: { enabled: true }, time: 15 },
			globalVolume: { volume: 50 },
			hideShorts: {
				channel: { enabled: true },
				home: { enabled: true },
				search: { enabled: true },
				sidebar: { enabled: true },
				subscriptions: { enabled: true },
				videos: { enabled: true }
			},
			loopButton: { button: { enabled: true, placement: "player_controls_right" } },
			miniPlayer: { defaultPosition: "top_left", defaultSize: "320x180" },
			onScreenDisplay: { color: "red", hideTime: 1500, opacity: 80, padding: 10, position: "top_left", type: "line" },
			playerQuality: { fallbackStrategy: "higher", quality: "hd720" },
			playerSpeed: { speed: 2 },
			playlistLength: { lengthGetMethod: "html", watchTimeGetMethod: "duration" },
			playlistManagementButtons: { removeAllButton: { enabled: true }, removeButton: { enabled: true }, resetButton: { enabled: false } },
			screenshotButton: { button: { enabled: true, placement: "below_player" }, format: "jpeg", saveAs: "both" },
			scrollWheelSpeedControl: { modifierKey: "shiftKey", steps: 0.5 },
			scrollWheelVolumeControl: { enabled: true, holdModifierKey: true, holdRightClick: false, modifierKey: "altKey", steps: 10 },
			"state:rememberVolume": { shortsPageVolume: 11, watchPageVolume: 22 },
			videoHistory: { resumeType: "automatic" },
			volumeBoost: { amount: 3, enabled: true, mode: "per_video" },
			youtubeDataApiV3Key: "legacy-api-key"
		});
	});
	test("should report a settings file that is not JSON and leave storage untouched", async ({ page }) => {
		const before = await readStoredKey(page, "playerSpeed");
		const alerts: string[] = [];
		page.on("dialog", (dialog) => {
			alerts.push(dialog.message());
			void dialog.dismiss();
		});
		await page.locator("#import_settings_input").setInputFiles("tests/test-settings-broken.json");
		// A parse failure is the catch-all path; it must not look like a validation failure to the user.
		await expect.poll(() => alerts, { timeout: 10000 }).toContain(localeText("pages.options.extras.importExportSettings.importButton.error.unknown"));
		expect(await readStoredKey(page, "playerSpeed")).toEqual(before);
	});
	test("should reject a settings file whose values fail the schema", async ({ page }) => {
		const before = await readStoredKey(page, "playerQuality");
		const alerts: string[] = [];
		page.on("dialog", (dialog) => {
			alerts.push(dialog.message());
			void dialog.dismiss();
		});
		// A quality level that does not exist fails the enum before the numeric checks run.
		await page.locator("#import_settings_input").setInputFiles("tests/test-settings-wrong-type.json");
		await expect.poll(() => alerts.length, { timeout: 10000 }).toBeGreaterThan(0);
		expect(alerts[0]).toContain("Error importing settings");
		expect(alerts[0]).toContain("quality");
		expect(alerts[0]).not.toContain("An unknown error occurred");
		expect(await readStoredKey(page, "playerQuality")).toEqual(before);
	});
	test("should open the file picker from the import button and import the chosen file", async ({ page }) => {
		// The visible button forwards the click to the hidden input, which opens the browser's file picker.
		const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.locator("#import_settings_button").click()]);
		await chooser.setFiles("tests/test-settings.json");
		await expect(
			page.locator("#notifications > div").getByText(localeText("pages.options.extras.importExportSettings.importButton.success"))
		).toBeAttached();
		await expect.poll(async () => (await readStoredKey(page, "playerSpeed")) as { speed: number }, { timeout: 10000 }).toMatchObject({ speed: 4 });
	});
	test("should resolve caption, modifier key and quality conflicts of one import together", async ({ page }) => {
		await page.locator("#import_settings_input").setInputFiles("tests/test-settings-conflicts-all.json");
		await expect(page.getByText(localeText("pages.options.notifications.error.importConflict.title"))).toBeVisible();
		const apply = page.getByRole("button", { name: localeText("pages.options.notifications.error.importConflict.apply") });
		// Two features on the same modifier key stay in conflict until the key changes, and that holds the whole import.
		await expect(apply).toBeDisabled();
		await expect(page.getByText(localeText("pages.options.notifications.error.importConflict.resolveConflict"))).toBeVisible();
		await page.getByRole("radio", { exact: true, name: await featureLabel("automaticallyEnableClosedCaptions") }).check();
		await page.locator("select:has(option[value='altKey'])").selectOption("altKey");
		await expect(apply).toBeEnabled();
		await page.locator("select:has(option[value='hd720'])").selectOption("hd720");
		await apply.click();
		await expect(page.getByText(localeText("pages.options.notifications.error.importConflict.title"))).not.toBeAttached();
		await expect
			.poll(
				async () =>
					page.evaluate(async () => {
						const stored = await chrome.storage.local.get<{
							automaticallyDisableClosedCaptions: { enabled: boolean };
							automaticallyEnableClosedCaptions: { enabled: boolean };
							playerQuality: { quality: string };
							scrollWheelSpeedControl: { modifierKey: string };
							scrollWheelVolumeControl: { modifierKey: string };
						}>([
							"automaticallyDisableClosedCaptions",
							"automaticallyEnableClosedCaptions",
							"playerQuality",
							"scrollWheelSpeedControl",
							"scrollWheelVolumeControl"
						]);
						return {
							disableCaptions: stored.automaticallyDisableClosedCaptions.enabled,
							enableCaptions: stored.automaticallyEnableClosedCaptions.enabled,
							quality: stored.playerQuality.quality,
							speedKey: stored.scrollWheelSpeedControl.modifierKey,
							volumeKey: stored.scrollWheelVolumeControl.modifierKey
						};
					}),
				{ timeout: 10000 }
			)
			.toEqual({ disableCaptions: false, enableCaptions: true, quality: "hd720", speedKey: "ctrlKey", volumeKey: "altKey" });
	});
	test("should store the quality the conflict dialog shows when its picker is applied untouched", async ({ page }) => {
		await page.locator("#import_settings_input").setInputFiles("tests/test-settings-conflict-quality.json");
		await expect(page.getByText(localeText("pages.options.notifications.error.importConflict.title"))).toBeVisible();
		const qualitySelect = page.locator("select:has(option[value='hd720'])");
		// The picker opens on a real level; the dialog used to seed the selection with the feature id instead,
		// so applying without a change stored the string "playerQuality" as the quality.
		const shown = await qualitySelect.inputValue();
		expect(youtubePlayerQualityLevels).toContain(shown);
		await page.getByRole("button", { name: localeText("pages.options.notifications.error.importConflict.apply") }).click();
		await expect.poll(async () => readPlayerQuality(page), { timeout: 10000 }).toMatchObject({ quality: shown });
	});
	test("should discard the import when the conflict dialog is cancelled", async ({ page }) => {
		await page.locator("#import_settings_input").setInputFiles("tests/test-settings-conflict.json");
		await expect(page.getByText(localeText("pages.options.notifications.error.importConflict.title"))).toBeVisible();
		await page.getByRole("button", { name: localeText("pages.options.notifications.error.importConflict.cancel") }).click();
		await expect(page.getByText(localeText("pages.options.notifications.error.importConflict.title"))).not.toBeAttached();
		// Nothing of the held-back file may reach storage, and no success is reported.
		expect(await readFeatureEnabled(page, "globalVolume")).toBe(false);
		expect(await readFeatureEnabled(page, "rememberVolume")).toBe(false);
		await expect(
			page.locator("#notifications > div").getByText(localeText("pages.options.extras.importExportSettings.importButton.success"))
		).not.toBeAttached();
	});
	test("should persist the API key typed into the password field and reveal it on request", async ({ page }) => {
		const input = page.getByLabel(localeText("pages.options.extras.youtubeDataApiV3Key.input.label"), { exact: true });
		await expect(input).toHaveAttribute("type", "password");
		// The field debounces and stores the string as typed.
		await input.fill("yte-test-key");
		await expect.poll(async () => readStoredKey(page, "youtubeDataApiV3Key"), { timeout: 10000 }).toBe("yte-test-key");
		// The eye button shares the bordered box with the input and flips it to plain text and back.
		const box = input.locator("xpath=..");
		const reveal = box.locator("button");
		await reveal.click();
		await expect(input).toHaveAttribute("type", "text");
		await reveal.click();
		await expect(input).toHaveAttribute("type", "password");
		// The box is keyboard reachable and hands focus on to the input.
		await box.focus();
		await page.keyboard.press("Enter");
		await expect(input).toBeFocused();
		await page.reload();
		await expect(input).toHaveValue("yte-test-key");
	});
	test("should persist per-channel speeds edited in the options UI", async ({ page }) => {
		test.setTimeout(90_000);
		const readChannelSpeeds = async () => ((await readStoredKey(page, "playerSpeed")) as { channelSpeeds: string }).channelSpeeds;
		const scope = page.locator(`div[title="${localeText("settings.sections.playerSpeed.settings.channelSpeeds.title")}"]`);
		const rows = scope.getByLabel(localeText("settings.sections.playerSpeed.settings.channelSpeeds.channelId"), { exact: true });
		const speeds = scope.getByLabel(localeText("settings.sections.playerSpeed.settings.channelSpeeds.speed"), { exact: true });
		const addButton = scope.getByRole("button", { name: localeText("settings.sections.playerSpeed.settings.channelSpeeds.add") });
		const removeButtons = scope.getByRole("button", { name: localeText("settings.sections.playerSpeed.settings.channelSpeeds.remove") });
		const linkInput = scope.getByLabel(localeText("settings.sections.playerSpeed.settings.channelSpeeds.pasteLinkPlaceholder"), { exact: true });
		// The list is a child of the feature toggle. Its wrapper only carries its own title once it is enabled.
		await setCheckbox(page, localeText("settings.sections.playerSpeed.enable.label"), true);
		await expect(addButton).toBeEnabled();
		await expect(rows).toHaveCount(0);
		await addButton.click();
		await expect(rows).toHaveCount(1);
		await rows.nth(0).fill("UC-lHJZR3Gqxm24_Vd_AJ5Yw");
		await speeds.nth(0).fill("1.5");
		// Stored as one "id:speed" line per row.
		await expect.poll(readChannelSpeeds, { timeout: 10000 }).toBe("UC-lHJZR3Gqxm24_Vd_AJ5Yw:1.5");
		// A speed outside the player's range is clamped on commit.
		await speeds.nth(0).fill("99");
		await expect.poll(readChannelSpeeds, { timeout: 10000 }).toBe("UC-lHJZR3Gqxm24_Vd_AJ5Yw:16");
		// A pasted channel link resolves to its id. A /channel/ link needs no request; Enter submits it.
		await linkInput.fill("https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw/videos");
		await linkInput.press("Enter");
		await expect(rows).toHaveCount(2);
		await expect(rows.nth(1)).toHaveValue("UCuAXFkgsw1L7xaCfnd5JJOw");
		await expect(linkInput).toHaveValue("");
		// A handle is resolved by fetching the channel page and reading its canonical link.
		await linkInput.fill("youtube.com/@MrBeast");
		await scope.getByRole("button", { name: localeText("settings.sections.playerSpeed.settings.channelSpeeds.getChannelIdFromLink") }).click();
		await expect(rows).toHaveCount(3, { timeout: 30000 });
		await expect(rows.nth(2)).toHaveValue("UCX6OQ3DkcsbYNE6H8uQQuVA");
		await expect(linkInput).toHaveValue("");
		// A channel that is already listed is not added twice; the link is still consumed.
		await linkInput.fill("https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw");
		await linkInput.press("Enter");
		await expect(linkInput).toHaveValue("");
		await expect(rows).toHaveCount(3);
		await expect
			.poll(readChannelSpeeds, { timeout: 10000 })
			.toBe(["UC-lHJZR3Gqxm24_Vd_AJ5Yw:16", "UCuAXFkgsw1L7xaCfnd5JJOw:1", "UCX6OQ3DkcsbYNE6H8uQQuVA:1"].join("\n"));
		await removeButtons.nth(0).click();
		await expect(rows).toHaveCount(2);
		await expect.poll(readChannelSpeeds, { timeout: 10000 }).toBe(["UCuAXFkgsw1L7xaCfnd5JJOw:1", "UCX6OQ3DkcsbYNE6H8uQQuVA:1"].join("\n"));
		await page.reload();
		await expect(rows).toHaveCount(2);
		await expect(rows.nth(0)).toHaveValue("UCuAXFkgsw1L7xaCfnd5JJOw");
	});
	test("should flag unknown placeholders in the screenshot file name template and persist it as typed", async ({ page }) => {
		const readFilename = async () => ((await readStoredKey(page, "screenshotButton")) as { filename: string }).filename;
		const input = page.getByLabel(localeText("settings.sections.screenshotButton.settings.filename.label"), { exact: true });
		await expect(input).toBeDisabled();
		await setCheckbox(page, localeText("settings.sections.screenshotButton.enable.label"), true);
		await expect(input).toBeEnabled();
		await expect(input).toHaveValue("Screenshot-{video id}-{date}");
		await expect(input).toHaveAttribute("aria-invalid", "false");
		// Validation surfaces once typing pauses; the template is stored as typed so an edit in progress survives.
		await input.fill("{video id}-{bogus}");
		const error = page.getByText(`${localeText("settings.sections.screenshotButton.settings.filename.error")} {bogus}`);
		await expect(error).toBeVisible();
		await expect(input).toHaveAttribute("aria-invalid", "true");
		await expect.poll(readFilename, { timeout: 10000 }).toBe("{video id}-{bogus}");
		await input.fill("{channel name}-{video id}");
		await expect(error).not.toBeAttached();
		await expect(input).toHaveAttribute("aria-invalid", "false");
		await expect.poll(readFilename, { timeout: 10000 }).toBe("{channel name}-{video id}");
		await page.reload();
		await expect(input).toHaveValue("{channel name}-{video id}");
	});
	test("should render stored per-channel speeds read-only while the feature is off", async ({ page }) => {
		const channelIdLabel = localeText("settings.sections.playerSpeed.settings.channelSpeeds.channelId");
		// Off, the list's wrapper carries the same disabled reason as the speed number next to it, so the list is told
		// apart by its channel id inputs.
		const disabledReason = localeText("pages.options.extras.optionDisabled.singular").replace(
			"{{OPTION}}",
			localeText("settings.sections.playerSpeed.enable.label")
		);
		const scope = page.locator(`div[title="${disabledReason}"]`).filter({ has: page.getByLabel(channelIdLabel, { exact: true }) });
		// Rows stored earlier are still shown when the feature is off, but every control of the list is held.
		await page.evaluate(async () => {
			await chrome.storage.local.set({
				playerSpeed: { channelSpeeds: "UC-lHJZR3Gqxm24_Vd_AJ5Yw:1.5\nUCuAXFkgsw1L7xaCfnd5JJOw:2", enabled: false, speed: 1 }
			});
		});
		await page.reload();
		const rows = scope.getByLabel(channelIdLabel, { exact: true });
		await expect(rows).toHaveCount(2);
		await expect(rows.nth(0)).toBeDisabled();
		await expect(rows.nth(1)).toHaveValue("UCuAXFkgsw1L7xaCfnd5JJOw");
		await expect(scope.getByLabel(localeText("settings.sections.playerSpeed.settings.channelSpeeds.speed"), { exact: true }).nth(1)).toBeDisabled();
		await expect(
			scope.getByRole("button", { exact: true, name: localeText("settings.sections.playerSpeed.settings.channelSpeeds.remove") }).nth(0)
		).toBeDisabled();
		await expect(
			scope.getByRole("button", { exact: true, name: `+ ${localeText("settings.sections.playerSpeed.settings.channelSpeeds.add")}` })
		).toBeDisabled();
		await expect(
			scope.getByLabel(localeText("settings.sections.playerSpeed.settings.channelSpeeds.pasteLinkPlaceholder"), { exact: true })
		).toBeDisabled();
		await expect(
			scope.getByRole("button", { exact: true, name: localeText("settings.sections.playerSpeed.settings.channelSpeeds.getChannelIdFromLink") })
		).toBeDisabled();
	});
	test("should store a colour typed into a deep dark colour picker", async ({ page }) => {
		const readMainColor = async () => ((await readStoredKey(page, "deepDarkCSS")) as { colors: { mainColor: string } }).colors.mainColor;
		await setCheckbox(page, localeText("settings.sections.deepDarkCSS.enable.label"), true);
		await selectOption(page, localeText("settings.sections.deepDarkCSS.settings.theme.select.label"), "Custom");
		const accentLabel = localeText("settings.sections.deepDarkCSS.settings.mainColor.label");
		const picker = page
			.locator("div")
			.filter({ has: page.locator("label", { hasText: accentLabel }) })
			.last();
		// The swatch button opens the picker; the hex field inside it is the typed way in and is debounced.
		await picker.getByRole("button").click();
		const hexInput = page.locator("#color-picker-input");
		await expect(hexInput).toBeVisible();
		await hexInput.fill("#12ab34");
		await expect.poll(readMainColor, { timeout: 10000 }).toBe("#12ab34");
		// A click outside closes the picker again.
		await page.locator("legend").first().click();
		await expect(hexInput).not.toBeAttached();
		await page.reload();
		await expect(page.locator(`div[aria-valuetext="#12ab34"]`)).toBeAttached();
	});
	test("should credit the deep dark theme's authors in its section", async ({ page }) => {
		const t = localeSelector();
		const deepDark = (await loadAllFeatureMetadata()).find((entry) => entry.id === "deepDarkCSS");
		expect(deepDark).toBeDefined();
		// The credit is declared on the group that holds the theme's settings.
		const authors = deepDark!.settings.flatMap((node) => ("attribution" in node ? (node.attribution ?? []) : []));
		expect(authors.length).toBeGreaterThan(0);
		for (const author of authors) {
			await expect(page.locator("legend").getByText(author.label(t), { exact: true })).toBeVisible();
			const link = page.getByRole("link", { exact: true, name: author.url.split("/").pop()! });
			await expect(link).toBeVisible();
			await expect(link).toHaveAttribute("href", author.url);
		}
	});
	test("should switch every checkbox on and off again", async ({ page }) => {
		test.setTimeout(240_000);
		const errors: string[] = [];
		page.on("pageerror", (error) => errors.push(error.message));
		// Every checkbox the page renders, in page order, so each parent setting is switched before its children
		// become enabled and every disabled reason, conflict note and child wrapper is rendered at least once.
		const checkboxes = page.getByRole("checkbox");
		const count = await checkboxes.count();
		expect(count).toBeGreaterThan(50);
		for (let index = 0; index < count; index++) {
			const checkbox = page.getByRole("checkbox").nth(index);
			if (!(await checkbox.isEnabled())) continue;
			if (!(await checkbox.isChecked())) await checkbox.click();
			await expect(checkbox).toBeChecked({ timeout: 15000 });
		}
		await expect.poll(async () => page.getByRole("checkbox", { checked: true }).count(), { timeout: 15000 }).toBeGreaterThan(count * 0.8);
		await page.reload();
		// A setting that conflicts with a sibling further down the page is held disabled until that sibling is off,
		// so the off sweep runs again for whatever the first pass had to skip.
		for (let pass = 0; pass < 3; pass++) {
			for (let index = 0; index < count; index++) {
				const checkbox = page.getByRole("checkbox").nth(index);
				if (!(await checkbox.isEnabled())) continue;
				if (await checkbox.isChecked()) await checkbox.click();
				await expect(checkbox).not.toBeChecked({ timeout: 15000 });
			}
		}
		// What stays checked is checked and held: a setting disabled by something other than a checkbox on this page.
		await expect.poll(async () => page.locator('input[type="checkbox"]:checked:enabled').count(), { timeout: 15000 }).toBe(0);
		const heldChecked = await page
			.locator('input[type="checkbox"]:checked:disabled')
			.evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? input.id));
		if (heldChecked.length > 0) test.info().annotations.push({ description: `checked and held: ${heldChecked.join(", ")}`, type: "note" });
		expect(errors, "the options page raised errors").toEqual([]);
	});
	test("should list CSS problems under the editor and put the cursor on one when it is chosen", async ({ page }) => {
		const customCSSLabel = localeText("settings.sections.customCSS.enable.label");
		const noProblems = page.getByText(localeText("settings.sections.customCSS.extras.noProblems"), { exact: true });
		await setCheckbox(page, customCSSLabel, true);
		const editor = page.locator(".monaco-editor").first();
		await expect(editor).toBeVisible({ timeout: 30000 });
		await expect(noProblems).toBeVisible();
		await editor.click();
		// A declaration without a value is an error, an unknown property a warning; the list shows each with its own icon.
		await page.keyboard.insertText("body { colr: red; color: ; }");
		const problems = page.getByRole("button").filter({ has: page.locator(".marker-message") });
		await expect(problems.first()).toBeVisible({ timeout: 30000 });
		await expect(noProblems).not.toBeAttached();
		await expect(problems.first().locator(".marker-line")).toHaveText(/\[Ln 1, Col \d+\]/);
		await expect(page.locator(".marker-icon.error").first()).toBeAttached({ timeout: 15000 });
		await expect(page.locator(".marker-icon.warning").first()).toBeAttached({ timeout: 15000 });
		// Monaco takes keyboard input through an EditContext element where the browser offers one, a textarea otherwise.
		const editorInput = page.locator(".monaco-editor .native-edit-context, .monaco-editor textarea.inputarea").first();
		// Choosing a problem, by click or by keyboard, has to focus the editor again at that position.
		await page.getByLabel(customCSSLabel, { exact: true }).focus();
		await expect(editorInput).not.toBeFocused();
		await problems.first().click();
		await expect(editorInput).toBeFocused();
		await problems.first().focus();
		await expect(editorInput).not.toBeFocused();
		await page.keyboard.press("Enter");
		await expect(editorInput).toBeFocused();
	});
	test("should expand the CSS editor over the page and collapse it again", async ({ page }) => {
		await setCheckbox(page, localeText("settings.sections.customCSS.enable.label"), true);
		const editor = page.locator(".monaco-editor").first();
		await expect(editor).toBeVisible({ timeout: 30000 });
		const expand = page.getByRole("button", { name: localeText("settings.sections.customCSS.extras.expand") });
		const collapse = page.getByRole("button", { name: localeText("settings.sections.customCSS.extras.collapse") });
		const widthBefore = await editor.evaluate((el) => el.getBoundingClientRect().width);
		await expand.click();
		await expect(collapse).toBeVisible();
		// Expanded, the editor takes the viewport and the page behind it stops scrolling.
		await expect.poll(async () => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
		await expect.poll(async () => editor.evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(widthBefore);
		await collapse.click();
		await expect(expand).toBeVisible();
		await expect.poll(async () => page.evaluate(() => document.body.style.overflow)).toBe("");
		await expect.poll(async () => editor.evaluate((el) => el.getBoundingClientRect().width)).toBe(widthBefore);
	});
	test("should step a number setting with its arrow buttons", async ({ page }) => {
		const defaults = await loadDefaultConfig();
		await setCheckbox(page, localeText("settings.sections.scrollWheelVolumeControl.enable.label"), true);
		// Enabled, the wrapper carries the setting's own title, which scopes the two arrows to this one input.
		const scope = page.locator(`div[title="${localeText("settings.sections.onScreenDisplaySettings.settings.opacity.title")}"]`);
		await expect(scope.getByLabel(localeText("settings.sections.onScreenDisplaySettings.settings.opacity.label"), { exact: true })).toBeEnabled();
		await scope.getByRole("button", { name: localeText("pages.options.extras.numberInput.stepUp") }).click();
		await expect.poll(async () => readOnScreenDisplay(page), { timeout: 10000 }).toMatchObject({ opacity: defaults.onScreenDisplay.opacity + 1 });
		await scope.getByRole("button", { name: localeText("pages.options.extras.numberInput.stepDown") }).click();
		await expect.poll(async () => readOnScreenDisplay(page), { timeout: 10000 }).toMatchObject({ opacity: defaults.onScreenDisplay.opacity });
	});
	test("should pick a select option with the keyboard", async ({ page }) => {
		await setCheckbox(page, localeText("settings.sections.playerQuality.enable.label"), true);
		await page.getByLabel(localeText("settings.sections.playerQuality.settings.quality.select.label"), { exact: true }).click();
		const option = page.locator('[role="option"][aria-valuetext="hd720"]');
		await option.focus();
		await page.keyboard.press("Enter");
		await expect.poll(async () => readPlayerQuality(page), { timeout: 10000 }).toMatchObject({ quality: "hd720" });
		// Choosing closes the list.
		await expect(option).not.toBeAttached();
	});
});
