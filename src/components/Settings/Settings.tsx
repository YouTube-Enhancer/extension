import type { ModifierKey, configuration, configurationKeys } from "@/src/types";
import type EnUS from "public/locales/en-US.json";
import type { ChangeEvent, ChangeEventHandler } from "react";

import "@/assets/styles/tailwind.css";
import "@/components/Settings/Settings.css";
import { useNotifications } from "@/hooks";
import { availableLocales, type i18nInstanceType, i18nService, localeDirection, translationPercentages } from "@/src/i18n";
import { youtubePlayerSpeedRate } from "@/src/types";
import { configurationImportSchema, defaultConfiguration as defaultSettings } from "@/src/utils/constants";
import { cn, parseStoredValue, settingsAreDefault } from "@/src/utils/utilities";
import { Suspense, createContext, useContext, useEffect, useRef, useState } from "react";
import { generateErrorMessage } from "zod-error";

import type { SelectOption } from "../Inputs";

import { formatDateForFileName } from "../../utils/utilities";
import Loader from "../Loader";
import Setting from "./components/Setting";
import SettingsNotifications from "./components/SettingNotifications";
import SettingSection from "./components/SettingSection";
import SettingTitle from "./components/SettingTitle";
async function getLanguageOptions() {
	const languageOptions: SelectOption[] = [];
	for (const locale of availableLocales) {
		const response = await fetch(`${chrome.runtime.getURL("")}locales/${locale}.json`).catch((err) => console.error(err));
		const localeData = (await response?.json()) as EnUS;
		languageOptions.push({
			label: `${localeData.langName} (${translationPercentages[locale]}%)`,
			value: locale
		});
	}
	return languageOptions;
}
function LanguageOptions({
	selectedLanguage,
	setValueOption,
	t
}: {
	selectedLanguage: string | undefined;
	setValueOption: (key: configurationKeys) => ({ currentTarget }: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
	t: i18nInstanceType["t"];
}) {
	const [languageOptions, setLanguageOptions] = useState<SelectOption[]>([]);
	useEffect(() => {
		getLanguageOptions().then(setLanguageOptions).catch(console.error);
	}, []);
	return (
		<SettingSection>
			<SettingTitle title={t("settings.sections.language.title")} />
			<Setting
				disabled={false}
				id="language"
				label={t("settings.sections.language.select.label")}
				onChange={setValueOption("language")}
				options={languageOptions}
				selectedOption={selectedLanguage}
				title={t("settings.sections.language.select.title")}
				type="select"
			/>
		</SettingSection>
	);
}
export default function Settings() {
	const [settings, setSettings] = useState<configuration | undefined>(undefined);
	const [i18nInstance, setI18nInstance] = useState<i18nInstanceType | null>(null);
	const [firstLoad, setFirstLoad] = useState(true);
	const settingsImportRef = useRef<HTMLInputElement>(null);
	const { addNotification, notifications, removeNotification } = useNotifications();
	useEffect(() => {
		const fetchSettings = () => {
			chrome.storage.local.get((settings) => {
				const storedSettings: Partial<configuration> = (
					Object.keys(settings)
						.filter((key) => typeof key === "string")
						.filter((key) => Object.keys(defaultSettings).includes(key as unknown as string)) as configurationKeys[]
				).reduce((acc, key) => Object.assign(acc, { [key]: parseStoredValue(settings[key] as string) }), {});
				const castedSettings = storedSettings as configuration;
				setSettings({ ...castedSettings });
			});
		};

		fetchSettings();
	}, []);
	useEffect(() => {
		if (!firstLoad && settings && !settingsAreDefault(defaultSettings, settings)) {
			saveOptions();
		}
	}, [settings]);
	useEffect(() => {
		const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
			if (areaName !== "local") return;
			const castedChanges = changes as {
				[K in keyof configuration]: {
					newValue: configuration[K] | undefined;
					oldValue: configuration[K] | undefined;
				};
			};
			Object.keys(castedChanges).forEach((key) => {
				const {
					[key]: { newValue, oldValue }
				} = changes;
				const parsedNewValue = parseStoredValue(newValue as string);
				const parsedOldValue = parseStoredValue(oldValue as string);
				if (parsedNewValue === parsedOldValue) return;
				if (
					parsedOldValue !== null &&
					parsedNewValue !== null &&
					typeof parsedOldValue === "object" &&
					typeof parsedNewValue === "object" &&
					JSON.stringify(parsedNewValue) === JSON.stringify(parsedOldValue)
				)
					return;
				setSettings((prevSettings) => {
					if (prevSettings) {
						return { ...prevSettings, [key]: parsedNewValue as configuration[typeof key] };
					}
					return undefined;
				});
			});
		};

		chrome.storage.onChanged.addListener(handleStorageChange);
		chrome.runtime.onSuspend.addListener(() => {
			chrome.storage.onChanged.removeListener(handleStorageChange);
		});
		return () => {
			chrome.storage.onChanged.removeListener(handleStorageChange);
		};
	}, []);
	useEffect(() => {
		if (settings && settings["language"]) {
			void (async () => {
				const instance = await i18nService(settings["language"] ?? "en-US");
				setI18nInstance(instance);
			})();
		}
	}, [settings]);
	if (!settings || !i18nInstance || (i18nInstance && i18nInstance.isInitialized === false)) {
		return <Loader />;
	}
	const { t } = i18nInstance;
	const setCheckboxOption =
		(key: configurationKeys) =>
		({ currentTarget: { checked } }: ChangeEvent<HTMLInputElement>) => {
			setFirstLoad(false);
			setSettings((options) => (options ? { ...options, [key]: checked } : undefined));
		};
	const setValueOption =
		(key: configurationKeys) =>
		({ currentTarget: { value } }: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			setFirstLoad(false);
			setSettings((state) => (state ? { ...state, [key]: value } : undefined));
		};
	const getSelectedOption = <K extends configurationKeys>(key: K) => settings[key];
	function saveOptions() {
		if (settings) {
			for (const key of Object.keys(settings)) {
				if (typeof settings[key] !== "string") {
					localStorage.setItem(key, JSON.stringify(settings[key]));
					void chrome.storage.local.set({ [key]: JSON.stringify(settings[key]) });
				} else {
					localStorage.setItem(key, settings[key] as string);
					void chrome.storage.local.set({ [key]: settings[key] as string });
				}
			}

			addNotification("success", "pages.options.notifications.success.saved");
		}
	}
	function resetOptions() {
		addNotification("info", "pages.options.notifications.info.reset", "reset_settings");
	}
	function clearData() {
		const userHasConfirmed = window.confirm(t("settings.clearData.confirmAlert"));
		if (userHasConfirmed) {
			for (const key of Object.keys(defaultSettings)) {
				if (typeof defaultSettings[key] !== "string") {
					localStorage.setItem(key, JSON.stringify(defaultSettings[key]));
					void chrome.storage.local.set({ [key]: JSON.stringify(defaultSettings[key]) });
				} else {
					localStorage.setItem(key, defaultSettings[key] as string);
					void chrome.storage.local.set({ [key]: defaultSettings[key] as string });
				}
			}
			addNotification("success", "settings.clearData.allDataDeleted");
		}
	}
	const {
		colors: { blue, green, orange, pink, purple, red, white, yellow },
		position: { bottom_left, bottom_right, center, top_left, top_right },
		type: { line, no_display, round, text }
	} = t("settings.sections.scrollWheelVolumeControl.onScreenDisplay", {
		defaultValue: {},
		returnObjects: true
	});
	const {
		saveAs: { clipboard, file }
	} = t("settings.sections.screenshotButton", {
		defaultValue: {},
		returnObjects: true
	});
	const scrollWheelVolumeControlModifierKeyOptions = [
		{
			label: t("settings.sections.scrollWheelVolumeControl.holdModifierKey.optionLabel", {
				KEY: "Alt"
			}),
			value: "altKey"
		},
		{
			label: t("settings.sections.scrollWheelVolumeControl.holdModifierKey.optionLabel", {
				KEY: "Ctrl"
			}),
			value: "ctrlKey"
		},
		{
			label: t("settings.sections.scrollWheelVolumeControl.holdModifierKey.optionLabel", {
				KEY: "Shift"
			}),
			value: "shiftKey"
		}
	] as { label: string; value: ModifierKey }[] as SelectOption[];
	const colorOptions: SelectOption[] = [
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-[1px] border-solid border-black", "bg-[red]")}></div>,
			label: red,
			value: "red"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-[1px] border-solid border-black", "bg-[green]")}></div>,
			label: green,
			value: "green"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-[1px] border-solid border-black", "bg-[blue]")}></div>,
			label: blue,
			value: "blue"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-[1px] border-solid border-black", "bg-[yellow]")}></div>,
			label: yellow,
			value: "yellow"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-[1px] border-solid border-black", "bg-[orange]")}></div>,
			label: orange,
			value: "orange"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-[1px] border-solid border-black", "bg-[purple]")}></div>,
			label: purple,
			value: "purple"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-[1px] border-solid border-black", "bg-[pink]")}></div>,
			label: pink,
			value: "pink"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-[1px] border-solid border-black", "bg-[white]")}></div>,
			label: white,
			value: "white"
		}
	];
	const OSD_DisplayTypeOptions: SelectOption[] = [
		{
			label: no_display,
			value: "no_display"
		},
		{
			label: text,
			value: "text"
		},
		{
			label: line,
			value: "line"
		},
		{
			label: round,
			value: "round"
		}
	];
	const OSD_PositionOptions: SelectOption[] = [
		{
			label: top_left,
			value: "top_left"
		},
		{
			label: top_right,
			value: "top_right"
		},
		{
			label: bottom_left,
			value: "bottom_left"
		},
		{
			label: bottom_right,
			value: "bottom_right"
		},
		{
			label: center,
			value: "center"
		}
	];
	const YouTubePlayerQualityOptions: SelectOption[] = [
		{ label: "144p", value: "tiny" },
		{ label: "240p", value: "small" },
		{ label: "360p", value: "medium" },
		{ label: "480p", value: "large" },
		{ label: "720p", value: "hd720" },
		{ label: "1080p", value: "hd1080" },
		{ label: "1440p", value: "hd1440" },
		{ label: "2160p", value: "hd2160" },
		{ label: "2880p", value: "hd2880" },
		{ label: "4320p", value: "highres" },
		{ label: "auto", value: "auto" }
	].reverse();
	const YouTubePlayerSpeedOptions: SelectOption[] = youtubePlayerSpeedRate.map((rate) => ({ label: rate?.toString(), value: rate?.toString() }));
	const ScreenshotFormatOptions: SelectOption[] = [
		{ label: "PNG", value: "png" },
		{ label: "JPEG", value: "jpeg" },
		{ label: "WebP", value: "webp" }
	];
	const ScreenshotSaveAsOptions: SelectOption[] = [
		{ label: file, value: "file" },
		{ label: clipboard, value: "clipboard" }
	];
	const settingsImportChange: ChangeEventHandler<HTMLInputElement> = (event): void => {
		void (async () => {
			const { target } = event;
			if (!target) return;
			const { files } = target as HTMLInputElement;
			const file = files?.[0];
			if (file) {
				try {
					const fileContents = await file.text();
					const importedSettings = JSON.parse(fileContents);
					// Validate the imported settings.
					const result = configurationImportSchema.safeParse(importedSettings);
					if (!result.success) {
						const { error } = result;
						const errorMessage = generateErrorMessage(error.errors);
						window.alert(
							t("settings.sections.importExportSettings.importButton.error.validation", {
								ERROR_MESSAGE: errorMessage
							})
						);
					} else {
						const castSettings = importedSettings as configuration;
						// Set the imported settings in your state.
						setSettings({ ...castSettings });
						for (const key of Object.keys(castSettings)) {
							if (typeof castSettings[key] !== "string") {
								localStorage.setItem(key, JSON.stringify(castSettings[key]));
								void chrome.storage.local.set({ [key]: JSON.stringify(castSettings[key]) });
							} else {
								localStorage.setItem(key, castSettings[key] as string);
								void chrome.storage.local.set({ [key]: castSettings[key] as string });
							}
						}
						// Show a success notification.
						addNotification("success", "settings.sections.importExportSettings.importButton.success");
					}
				} catch (error) {
					// Handle any import errors.
					window.alert(t("settings.sections.importExportSettings.importButton.error.unknown"));
				}
			}
			if (settingsImportRef.current) settingsImportRef.current.value = "";
		})();
	};
	// Import settings from a JSON file.
	function importSettings() {
		if (settingsImportRef.current === null) return;
		// Trigger the file input dialog.
		settingsImportRef.current.click();
	}
	// Export settings to a JSON file.
	const exportSettings = () => {
		if (settings) {
			// Get the current settings
			const exportableSettings: configuration = Object.keys(defaultSettings).reduce(
				(acc, key) =>
					Object.assign(acc, {
						[key]: parseStoredValue(settings[key] as string)
					}),
				{} as configuration
			);
			// Get the current date and time, and format it for use in the filename.
			const timestamp = formatDateForFileName(new Date());
			// Create the filename.
			const filename = `youtube_enhancer_settings_${timestamp}.json`;
			// Convert the settings to JSON.
			const settingsJSON = JSON.stringify(exportableSettings);

			// Create a blob to hold the JSON.
			const blob = new Blob([settingsJSON], { type: "application/json" });
			// Get a URL for the blob.
			const url = URL.createObjectURL(blob);

			// Create a link to the blob.
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			// Click the link to download the file.
			a.click();

			// Show a success notification.
			addNotification("success", "settings.sections.importExportSettings.exportButton.success");
		}
	};
	// TODO: add "default player mode" setting (theater, fullscreen, etc.) feature
	return (
		<SettingsContext.Provider value={{ direction: localeDirection[settings.language], i18nInstance, settings }}>
			<div className="h-fit w-fit bg-[#f5f5f5] text-black dark:bg-[#181a1b] dark:text-white" dir={localeDirection[settings.language]}>
				<h1 className="flex content-center items-center gap-3 text-xl font-bold sm:text-2xl md:text-3xl" dir={"ltr"}>
					<img className="h-16 w-16 sm:h-16 sm:w-16" src="/icons/icon_128.png" />
					YouTube Enhancer
					<small className="light text-xs sm:text-sm md:text-base">v{chrome.runtime.getManifest().version}</small>
				</h1>
				<Suspense fallback={<Loader />}>
					<LanguageOptions selectedLanguage={settings["language"]} setValueOption={setValueOption} t={i18nInstance.t} />
				</Suspense>
				<SettingSection>
					<SettingTitle title={t("settings.sections.miscellaneous.title")} />
					<Setting
						checked={settings.enable_remember_last_volume?.toString() === "true"}
						id="enable_remember_last_volume"
						label={t("settings.sections.miscellaneous.features.rememberLastVolume.label")}
						onChange={setCheckboxOption("enable_remember_last_volume")}
						title={t("settings.sections.miscellaneous.features.rememberLastVolume.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_maximize_player_button?.toString() === "true"}
						id="enable_maximize_player_button"
						label={t("settings.sections.miscellaneous.features.maximizePlayerButton.label")}
						onChange={setCheckboxOption("enable_maximize_player_button")}
						title={t("settings.sections.miscellaneous.features.maximizePlayerButton.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_video_history?.toString() === "true"}
						id="enable_video_history"
						label={t("settings.sections.miscellaneous.features.videoHistory.label")}
						onChange={setCheckboxOption("enable_video_history")}
						title={t("settings.sections.miscellaneous.features.videoHistory.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_remaining_time?.toString() === "true"}
						id="enable_remaining_time"
						label={t("settings.sections.miscellaneous.features.remainingTime.label")}
						onChange={setCheckboxOption("enable_remaining_time")}
						title={t("settings.sections.miscellaneous.features.remainingTime.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_loop_button?.toString() === "true"}
						id="enable_loop_button"
						label={t("settings.sections.miscellaneous.features.loopButton.label")}
						onChange={setCheckboxOption("enable_loop_button")}
						title={t("settings.sections.miscellaneous.features.loopButton.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_scrollbar?.toString() === "true"}
						id="enable_hide_scrollbar"
						label={t("settings.sections.miscellaneous.features.hideScrollbar.label")}
						onChange={setCheckboxOption("enable_hide_scrollbar")}
						title={t("settings.sections.miscellaneous.features.hideScrollbar.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_automatic_theater_mode?.toString() === "true"}
						id="enable_automatic_theater_mode"
						label={t("settings.sections.miscellaneous.features.automaticTheaterMode.label")}
						onChange={setCheckboxOption("enable_automatic_theater_mode")}
						title={t("settings.sections.miscellaneous.features.automaticTheaterMode.title")}
						type="checkbox"
					/>
				</SettingSection>
				<SettingSection>
					<SettingTitle title={t("settings.sections.scrollWheelVolumeControl.title")} />
					<Setting
						checked={settings.enable_scroll_wheel_volume_control?.toString() === "true"}
						id="enable_scroll_wheel_volume_control"
						label={t("settings.sections.scrollWheelVolumeControl.enable.label")}
						onChange={setCheckboxOption("enable_scroll_wheel_volume_control")}
						title={t("settings.sections.scrollWheelVolumeControl.enable.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_scroll_wheel_volume_control_hold_modifier_key?.toString() === "true"}
						id="enable_scroll_wheel_volume_control_hold_modifier_key"
						label={t("settings.sections.scrollWheelVolumeControl.holdModifierKey.enable.label")}
						onChange={setCheckboxOption("enable_scroll_wheel_volume_control_hold_modifier_key")}
						title={t("settings.sections.scrollWheelVolumeControl.holdModifierKey.enable.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_scroll_wheel_volume_control_hold_right_click?.toString() === "true"}
						id="enable_scroll_wheel_volume_control_hold_right_click"
						label={t("settings.sections.scrollWheelVolumeControl.holdRightClick.enable.label")}
						onChange={setCheckboxOption("enable_scroll_wheel_volume_control_hold_right_click")}
						title={t("settings.sections.scrollWheelVolumeControl.holdRightClick.enable.title")}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_volume_control_hold_modifier_key?.toString() !== "true"}
						id="scroll_wheel_volume_control_modifier_key"
						label={t("settings.sections.scrollWheelVolumeControl.holdModifierKey.select.label")}
						onChange={setValueOption("scroll_wheel_volume_control_modifier_key")}
						options={scrollWheelVolumeControlModifierKeyOptions}
						selectedOption={getSelectedOption("scroll_wheel_volume_control_modifier_key")}
						title={t("settings.sections.scrollWheelVolumeControl.holdModifierKey.select.title")}
						type="select"
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_volume_control?.toString() !== "true"}
						id="osd_display_color"
						label={t("settings.sections.scrollWheelVolumeControl.osdColor.label")}
						onChange={setValueOption("osd_display_color")}
						options={colorOptions}
						selectedOption={getSelectedOption("osd_display_color")}
						title={t("settings.sections.scrollWheelVolumeControl.osdColor.title")}
						type="select"
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_volume_control?.toString() !== "true"}
						id="osd_display_type"
						label={t("settings.sections.scrollWheelVolumeControl.osdType.label")}
						onChange={setValueOption("osd_display_type")}
						options={OSD_DisplayTypeOptions}
						selectedOption={getSelectedOption("osd_display_type")}
						title={t("settings.sections.scrollWheelVolumeControl.osdType.title")}
						type="select"
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_volume_control?.toString() !== "true"}
						id="osd_display_position"
						label={t("settings.sections.scrollWheelVolumeControl.osdPosition.label")}
						onChange={setValueOption("osd_display_position")}
						options={OSD_PositionOptions}
						selectedOption={getSelectedOption("osd_display_position")}
						title={t("settings.sections.scrollWheelVolumeControl.osdPosition.title")}
						type="select"
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_volume_control?.toString() !== "true"}
						id="osd_display_opacity"
						label={t("settings.sections.scrollWheelVolumeControl.osdOpacity.label")}
						max={100}
						min={1}
						onChange={setValueOption("osd_display_opacity")}
						title={t("settings.sections.scrollWheelVolumeControl.osdOpacity.title")}
						type="number"
						value={settings.osd_display_opacity}
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_volume_control?.toString() !== "true"}
						id="volume_adjustment_steps"
						label={t("settings.sections.scrollWheelVolumeControl.osdVolumeAdjustmentSteps.label")}
						min={1}
						onChange={setValueOption("volume_adjustment_steps")}
						title={t("settings.sections.scrollWheelVolumeControl.osdVolumeAdjustmentSteps.title")}
						type="number"
						value={settings.volume_adjustment_steps}
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_volume_control?.toString() !== "true"}
						id="osd_display_hide_time"
						label={t("settings.sections.scrollWheelVolumeControl.osdHide.label")}
						min={1}
						onChange={setValueOption("osd_display_hide_time")}
						title={t("settings.sections.scrollWheelVolumeControl.osdHide.title")}
						type="number"
						value={settings.osd_display_hide_time}
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_volume_control?.toString() !== "true"}
						id="osd_display_padding"
						label={t("settings.sections.scrollWheelVolumeControl.osdPadding.label")}
						min={0}
						onChange={setValueOption("osd_display_padding")}
						title={t("settings.sections.scrollWheelVolumeControl.osdPadding.title")}
						type="number"
						value={settings.osd_display_padding}
					/>
				</SettingSection>
				<SettingSection>
					<SettingTitle title={t("settings.sections.automaticQuality.title")} />
					<Setting
						checked={settings.enable_automatically_set_quality?.toString() === "true"}
						id="enable_automatically_set_quality"
						label={t("settings.sections.automaticQuality.enable.label")}
						onChange={setCheckboxOption("enable_automatically_set_quality")}
						title={t("settings.sections.automaticQuality.enable.title")}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_automatically_set_quality?.toString() !== "true"}
						id="player_quality"
						label={t("settings.sections.automaticQuality.select.label")}
						onChange={setValueOption("player_quality")}
						options={YouTubePlayerQualityOptions}
						selectedOption={getSelectedOption("player_quality")}
						title={t("settings.sections.automaticQuality.select.title")}
						type="select"
					/>
				</SettingSection>
				<SettingSection>
					<SettingTitle title={t("settings.sections.playbackSpeed.title")} />
					<Setting
						checked={settings.enable_forced_playback_speed?.toString() === "true"}
						id="enable_forced_playback_speed"
						label={t("settings.sections.playbackSpeed.enable.label")}
						onChange={setCheckboxOption("enable_forced_playback_speed")}
						title={t("settings.sections.playbackSpeed.enable.title")}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_forced_playback_speed?.toString() !== "true"}
						id="player_speed"
						label={t("settings.sections.playbackSpeed.select.label")}
						onChange={setValueOption("player_speed")}
						options={YouTubePlayerSpeedOptions}
						selectedOption={getSelectedOption("player_speed")?.toString()}
						title={t("settings.sections.playbackSpeed.select.title")}
						type="select"
					/>
				</SettingSection>
				<SettingSection>
					<SettingTitle title={t("settings.sections.volumeBoost.title")} />
					<Setting
						checked={settings.enable_volume_boost?.toString() === "true"}
						id="enable_volume_boost"
						label={t("settings.sections.volumeBoost.enable.label")}
						onChange={setCheckboxOption("enable_volume_boost")}
						title={t("settings.sections.volumeBoost.enable.title")}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_volume_boost?.toString() !== "true"}
						id="volume_boost_amount"
						label={t("settings.sections.volumeBoost.number.label")}
						max={100}
						min={1}
						onChange={setValueOption("volume_boost_amount")}
						title={t("settings.sections.volumeBoost.number.title")}
						type="number"
						value={settings.volume_boost_amount}
					/>
				</SettingSection>
				<SettingSection>
					<SettingTitle title={t("settings.sections.screenshotButton.title")} />
					<Setting
						checked={settings.enable_screenshot_button?.toString() === "true"}
						id="enable_screenshot_button"
						label={t("settings.sections.screenshotButton.enable.label")}
						onChange={setCheckboxOption("enable_screenshot_button")}
						title={t("settings.sections.screenshotButton.enable.title")}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_screenshot_button?.toString() !== "true"}
						id="screenshot_save_as"
						label={t("settings.sections.screenshotButton.selectSaveAs.label")}
						onChange={setValueOption("screenshot_save_as")}
						options={ScreenshotSaveAsOptions}
						selectedOption={getSelectedOption("screenshot_save_as")}
						title={t("settings.sections.screenshotButton.selectSaveAs.title")}
						type="select"
					/>
					<Setting
						disabled={settings.enable_screenshot_button?.toString() !== "true"}
						id="screenshot_format"
						label={t("settings.sections.screenshotButton.selectFormat.label")}
						onChange={setValueOption("screenshot_format")}
						options={ScreenshotFormatOptions}
						selectedOption={getSelectedOption("screenshot_format")}
						title={t("settings.sections.screenshotButton.selectFormat.title")}
						type="select"
					/>
				</SettingSection>
				<div className="sticky bottom-0 left-0 flex justify-between gap-1 bg-[#f5f5f5] p-2 dark:bg-[#181a1b]">
					<input
						className="danger p-2 text-sm dark:hover:bg-[rgba(24,26,27,0.5)] sm:text-base md:text-lg"
						id="clear_data_button"
						onClick={clearData}
						title={t("settings.sections.bottomButtons.clear.title")}
						type="button"
						value={t("settings.sections.bottomButtons.clear.value")}
					/>
					<input
						className="accent p-2 text-sm dark:hover:bg-[rgba(24,26,27,0.5)] sm:text-base md:text-lg"
						id="import_settings_button"
						onClick={importSettings}
						title={t("settings.sections.importExportSettings.importButton.title")}
						type="button"
						value={t("settings.sections.importExportSettings.importButton.value")}
					/>
					<input
						className="accent p-2 text-sm dark:hover:bg-[rgba(24,26,27,0.5)] sm:text-base md:text-lg"
						id="export_settings_button"
						onClick={exportSettings}
						title={t("settings.sections.importExportSettings.exportButton.title")}
						type="button"
						value={t("settings.sections.importExportSettings.exportButton.value")}
					/>
					{notifications.filter((n) => n.action === "reset_settings").length > 0 ? (
						<input
							className="danger p-2 text-sm dark:hover:bg-[rgba(24,26,27,0.5)] sm:text-base md:text-lg"
							id="confirm_button"
							onClick={() => {
								const notificationToRemove = notifications.find((n) => n.action === "reset_settings");
								if (notificationToRemove) {
									removeNotification(notificationToRemove);
								}
								localStorage.setItem("remembered_volumes", JSON.stringify(settings.remembered_volumes));
								void chrome.storage.local.set({ remembered_volumes: JSON.stringify(settings.remembered_volumes) });
								for (const key of Object.keys(defaultSettings)) {
									if (typeof defaultSettings[key] !== "string") {
										localStorage.setItem(key, JSON.stringify(defaultSettings[key]));
										void chrome.storage.local.set({ [key]: JSON.stringify(defaultSettings[key]) });
									}
								}

								addNotification("success", "pages.options.notifications.success.saved");
							}}
							title={t("settings.sections.bottomButtons.confirm.title")}
							type="button"
							value={t("settings.sections.bottomButtons.confirm.value")}
						/>
					) : (
						<input
							className="warning p-2 text-sm dark:hover:bg-[rgba(24,26,27,0.5)] sm:text-base md:text-lg"
							id="reset_button"
							onClick={resetOptions}
							title={t("settings.sections.bottomButtons.reset.title")}
							type="button"
							value={t("settings.sections.bottomButtons.reset.value")}
						/>
					)}
				</div>
				<SettingsNotifications />
				<input accept=".json" hidden={true} id="import_settings_input" onChange={settingsImportChange} ref={settingsImportRef} type="file" />
			</div>
		</SettingsContext.Provider>
	);
}
type SettingsContextProps = {
	direction: "ltr" | "rtl";
	i18nInstance: i18nInstanceType;
	settings: configuration;
};
export const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);
export const useSettings = () => {
	const context = useContext(SettingsContext);
	if (context === undefined) {
		throw new Error("useSettings must be used within a SettingsProvider");
	}
	return context;
};
