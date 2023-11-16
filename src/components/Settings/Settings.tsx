import type { configuration, configurationKeys } from "@/src/@types";
import type EnUS from "public/locales/en-US.json";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";

import "@/assets/styles/tailwind.css";
import "@/components/Settings/Settings.css";
import { useNotifications } from "@/hooks";
import { youtubePlayerSpeedRate } from "@/src/@types";
import { availableLocales, type i18nInstanceType } from "@/src/i18n";
import { configurationImportSchema } from "@/src/utils/constants";
import { cn, settingsAreDefault } from "@/src/utils/utilities";
import React, { Suspense, useEffect, useState } from "react";
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
			label: (localeData as typeof EnUS).langName,
			value: locale
		});
	}
	return languageOptions;
}
function LanguageOptions({
	selectedLanguage,
	setSelectedLanguage,
	setValueOption,
	t
}: {
	selectedLanguage: string | undefined;
	setSelectedLanguage: Dispatch<SetStateAction<string | undefined>>;
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
				id="language_select"
				label={t("settings.sections.language.select.label")}
				onChange={setValueOption("language")}
				options={languageOptions}
				selectedOption={selectedLanguage}
				setSelectedOption={setSelectedLanguage}
				title={t("settings.sections.language.select.title")}
				type="select"
			/>
		</SettingSection>
	);
}
export default function Settings({
	defaultSettings,
	i18nInstance,
	selectedColor,
	selectedDisplayPosition,
	selectedDisplayType,
	selectedLanguage,
	selectedPlayerQuality,
	selectedPlayerSpeed,
	selectedScreenshotFormat,
	selectedScreenshotSaveAs,
	setSelectedColor,
	setSelectedDisplayPosition,
	setSelectedDisplayType,
	setSelectedLanguage,
	setSelectedPlayerQuality,
	setSelectedPlayerSpeed,
	setSelectedScreenshotFormat,
	setSelectedScreenshotSaveAs,
	setSettings,
	settings
}: {
	defaultSettings: configuration;
	i18nInstance: i18nInstanceType;
	selectedColor: string | undefined;
	selectedDisplayPosition: string | undefined;
	selectedDisplayType: string | undefined;
	selectedLanguage: string | undefined;
	selectedPlayerQuality: string | undefined;
	selectedPlayerSpeed: string | undefined;
	selectedScreenshotFormat: string | undefined;
	selectedScreenshotSaveAs: string | undefined;
	setSelectedColor: Dispatch<SetStateAction<string | undefined>>;
	setSelectedDisplayPosition: Dispatch<SetStateAction<string | undefined>>;
	setSelectedDisplayType: Dispatch<SetStateAction<string | undefined>>;
	setSelectedLanguage: Dispatch<SetStateAction<string | undefined>>;
	setSelectedPlayerQuality: Dispatch<SetStateAction<string | undefined>>;
	setSelectedPlayerSpeed: Dispatch<SetStateAction<string | undefined>>;
	setSelectedScreenshotFormat: Dispatch<SetStateAction<string | undefined>>;
	setSelectedScreenshotSaveAs: Dispatch<SetStateAction<string | undefined>>;
	setSettings: Dispatch<SetStateAction<configuration | undefined>>;
	settings: configuration | undefined;
}) {
	const [firstLoad, setFirstLoad] = useState(true);
	const { addNotification, notifications, removeNotification } = useNotifications();
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

	useEffect(() => {
		if (!firstLoad && settings && !settingsAreDefault(defaultSettings, settings)) {
			saveOptions();
		}
	}, [settings]);
	function saveOptions() {
		if (settings) {
			if (settings.enable_automatically_set_quality && !settings.player_quality) {
				addNotification("error", t("pages.options.notifications.error.playerQuality"));
				return;
			}
			Object.assign(localStorage, settings);
			chrome.storage.local.set(settings);

			addNotification("success", t("pages.options.notifications.success.saved"));
		}
	}

	function resetOptions() {
		addNotification("info", t("pages.options.notifications.info.reset"), "reset_settings");
	}

	function clearData() {
		const userHasConfirmed = window.confirm(t("settings.clearData.confirmAlert"));
		if (userHasConfirmed) {
			Object.assign(localStorage, defaultSettings);
			chrome.storage.local.set(defaultSettings);
			addNotification("success", t("settings.clearData.allDataDeleted"));
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
		format: { jpeg, png, webp },
		saveAs: { clipboard, file }
	} = t("settings.sections.screenshotButton", {
		defaultValue: {},
		returnObjects: true
	});
	const colorOptions: SelectOption[] = [
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-black border-[1px] border-solid", "bg-[red]")}></div>,
			label: red,
			value: "red"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-black border-[1px] border-solid", "bg-[green]")}></div>,
			label: green,
			value: "green"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-black border-[1px] border-solid", "bg-[blue]")}></div>,
			label: blue,
			value: "blue"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-black border-[1px] border-solid", "bg-[yellow]")}></div>,
			label: yellow,
			value: "yellow"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-black border-[1px] border-solid", "bg-[orange]")}></div>,
			label: orange,
			value: "orange"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-black border-[1px] border-solid", "bg-[purple]")}></div>,
			label: purple,
			value: "purple"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-black border-[1px] border-solid", "bg-[pink]")}></div>,
			label: pink,
			value: "pink"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-black border-[1px] border-solid", "bg-[white]")}></div>,
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
	const YouTubePlayerSpeedOptions: SelectOption[] = youtubePlayerSpeedRate.map((rate) => ({ label: rate.toString(), value: rate.toString() }));
	const ScreenshotFormatOptions: SelectOption[] = [
		{ label: png, value: "png" },
		{ label: jpeg, value: "jpeg" },
		{ label: webp, value: "webp" }
	];
	const ScreenshotSaveAsOptions: SelectOption[] = [
		{ label: file, value: "file" },
		{ label: clipboard, value: "clipboard" }
	];

	// Import settings from a JSON file.
	const importSettings = () => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json";

		input.addEventListener("change", async (event) => {
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
						Object.assign(localStorage, castSettings);
						chrome.storage.local.set(castSettings);
						// Show a success notification.
						addNotification("success", t("settings.sections.importExportSettings.importButton.success"));
					}
				} catch (error) {
					// Handle any import errors.
					window.alert(t("settings.sections.importExportSettings.importButton.error.unknown"));
				}
			}
		});

		// Trigger the file input dialog.
		input.click();
	};

	// Export settings to a JSON file.
	const exportSettings = () => {
		if (settings) {
			const timestamp = formatDateForFileName(new Date());
			const filename = `youtube_enhancer_settings_${timestamp}.json`;
			const settingsJSON = JSON.stringify(settings);

			const blob = new Blob([settingsJSON], { type: "application/json" });
			const url = URL.createObjectURL(blob);

			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			a.click();

			// Show a success notification.
			addNotification("success", t("settings.sections.importExportSettings.exportButton.success"));
		}
	};
	// TODO: add "default player mode" setting (theater, fullscreen, etc.) feature
	return (
		settings && (
			<div className="h-fit w-fit bg-[#f5f5f5] text-black dark:bg-[#181a1b] dark:text-white">
				<h1 className="flex content-center items-center gap-3 text-xl font-bold sm:text-2xl md:text-3xl">
					<img className="h-16 w-16 sm:h-16 sm:w-16" src="/icons/icon_128.png" />
					YouTube Enhancer
					<small className="light text-xs sm:text-sm md:text-base">v{chrome.runtime.getManifest().version}</small>
				</h1>
				<Suspense fallback={<Loader />}>
					<LanguageOptions
						selectedLanguage={selectedLanguage}
						setSelectedLanguage={setSelectedLanguage}
						setValueOption={setValueOption}
						t={i18nInstance.t}
					/>
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
						disabled={settings.enable_scroll_wheel_volume_control.toString() !== "true"}
						id="osd_color_select"
						label={t("settings.sections.scrollWheelVolumeControl.osdColor.label")}
						onChange={setValueOption("osd_display_color")}
						options={colorOptions}
						selectedOption={selectedColor}
						setSelectedOption={setSelectedColor}
						title={t("settings.sections.scrollWheelVolumeControl.osdColor.title")}
						type="select"
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_volume_control.toString() !== "true"}
						id="osd_display_type"
						label={t("settings.sections.scrollWheelVolumeControl.osdType.label")}
						onChange={setValueOption("osd_display_type")}
						options={OSD_DisplayTypeOptions}
						selectedOption={selectedDisplayType}
						setSelectedOption={setSelectedDisplayType}
						title={t("settings.sections.scrollWheelVolumeControl.osdType.title")}
						type="select"
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_volume_control.toString() !== "true"}
						id="osd_display_position"
						label={t("settings.sections.scrollWheelVolumeControl.osdPosition.label")}
						onChange={setValueOption("osd_display_position")}
						options={OSD_PositionOptions}
						selectedOption={selectedDisplayPosition}
						setSelectedOption={setSelectedDisplayPosition}
						title={t("settings.sections.scrollWheelVolumeControl.osdPosition.title")}
						type="select"
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_volume_control.toString() !== "true"}
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
						disabled={settings.enable_scroll_wheel_volume_control.toString() !== "true"}
						id="volume_adjustment_steps"
						label={t("settings.sections.scrollWheelVolumeControl.osdVolumeAdjustmentSteps.label")}
						min={1}
						onChange={setValueOption("volume_adjustment_steps")}
						title={t("settings.sections.scrollWheelVolumeControl.osdVolumeAdjustmentSteps.title")}
						type="number"
						value={settings.volume_adjustment_steps}
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_volume_control.toString() !== "true"}
						id="osd_display_hide_time"
						label={t("settings.sections.scrollWheelVolumeControl.osdHide.label")}
						min={1}
						onChange={setValueOption("osd_display_hide_time")}
						title={t("settings.sections.scrollWheelVolumeControl.osdHide.title")}
						type="number"
						value={settings.osd_display_hide_time}
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_volume_control.toString() !== "true"}
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
						disabled={settings.enable_automatically_set_quality.toString() !== "true"}
						id="player_quality"
						label={t("settings.sections.automaticQuality.select.label")}
						onChange={setValueOption("player_quality")}
						options={YouTubePlayerQualityOptions}
						selectedOption={selectedPlayerQuality}
						setSelectedOption={setSelectedPlayerQuality}
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
						disabled={settings.enable_forced_playback_speed.toString() !== "true"}
						id="player_speed"
						label={t("settings.sections.playbackSpeed.select.label")}
						onChange={setValueOption("player_speed")}
						options={YouTubePlayerSpeedOptions}
						selectedOption={selectedPlayerSpeed?.toString()}
						setSelectedOption={setSelectedPlayerSpeed}
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
						disabled={settings.enable_volume_boost.toString() !== "true"}
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
						disabled={settings.enable_screenshot_button.toString() !== "true"}
						id="screenshot_save_as"
						label={t("settings.sections.screenshotButton.selectSaveAs.label")}
						onChange={setValueOption("screenshot_save_as")}
						options={ScreenshotSaveAsOptions}
						selectedOption={selectedScreenshotSaveAs}
						setSelectedOption={setSelectedScreenshotSaveAs}
						title={t("settings.sections.screenshotButton.selectSaveAs.title")}
						type="select"
					/>
					<Setting
						disabled={settings.enable_screenshot_button.toString() !== "true"}
						id="screenshot_format"
						label={t("settings.sections.screenshotButton.selectFormat.label")}
						onChange={setValueOption("screenshot_format")}
						options={ScreenshotFormatOptions}
						selectedOption={selectedScreenshotFormat}
						setSelectedOption={setSelectedScreenshotFormat}
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
								Object.assign(localStorage, Object.assign(defaultSettings, { remembered_volumes: settings.remembered_volumes }));
								chrome.storage.local.set(Object.assign(defaultSettings, { remembered_volumes: settings.remembered_volumes }));

								addNotification("success", t("pages.options.notifications.success.saved"));
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
			</div>
		)
	);
}
