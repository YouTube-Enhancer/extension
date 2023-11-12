import "@/assets/styles/tailwind.css";
import "@/components/Settings/Settings.css";

import { useNotifications } from "@/hooks";
import type { configuration, configurationKeys } from "@/src/@types";
import { youtubePlayerSpeedRate } from "@/src/@types";
import React, { useEffect, useState, Suspense } from "react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { cn, settingsAreDefault } from "@/src/utils/utilities";
import { configurationImportSchema } from "@/src/utils/constants";
import { generateErrorMessage } from "zod-error";
import { formatDateForFileName } from "../../utils/utilities";
import SettingsNotifications from "./components/SettingNotifications";
import SettingSection from "./components/SettingSection";
import SettingTitle from "./components/SettingTitle";
import Setting from "./components/Setting";
import type { SelectOption } from "../Inputs";
import { availableLocales, type i18nInstanceType } from "@/src/i18n";
import type EnUS from "public/locales/en-US.json";
import Loader from "../Loader";
async function getLanguageOptions() {
	const languageOptions: SelectOption[] = [];
	for (const locale of availableLocales) {
		const response = await fetch(`${chrome.runtime.getURL("")}locales/${locale}.json`).catch((err) => console.error(err));
		const localeData = (await response?.json()) as EnUS;
		languageOptions.push({
			value: locale,
			label: (localeData as typeof EnUS).langName
		});
	}
	return languageOptions;
}
function LanguageOptions({
	setValueOption,
	t,
	selectedLanguage,
	setSelectedLanguage
}: {
	t: i18nInstanceType["t"];
	setValueOption: (key: configurationKeys) => ({ currentTarget }: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
	selectedLanguage: string | undefined;
	setSelectedLanguage: Dispatch<SetStateAction<string | undefined>>;
}) {
	const [languageOptions, setLanguageOptions] = useState<SelectOption[]>([]);
	useEffect(() => {
		getLanguageOptions().then(setLanguageOptions);
	}, []);
	return (
		<SettingSection>
			<SettingTitle title={t("settings.sections.language.title")} />
			<Setting
				type="select"
				id="language_select"
				disabled={false}
				title={t("settings.sections.language.select.title")}
				label={t("settings.sections.language.select.label")}
				onChange={setValueOption("language")}
				options={languageOptions}
				selectedOption={selectedLanguage}
				setSelectedOption={setSelectedLanguage}
			/>
		</SettingSection>
	);
}
export default function Settings({
	settings,
	setSettings,
	selectedColor,
	setSelectedColor,
	selectedDisplayType,
	setSelectedDisplayType,
	selectedDisplayPosition,
	setSelectedDisplayPosition,
	selectedScreenshotFormat,
	setSelectedScreenshotFormat,
	selectedScreenshotSaveAs,
	setSelectedScreenshotSaveAs,
	selectedPlayerQuality,
	setSelectedPlayerQuality,
	selectedPlayerSpeed,
	setSelectedPlayerSpeed,
	selectedLanguage,
	setSelectedLanguage,
	defaultSettings,
	i18nInstance
}: {
	settings: configuration | undefined;
	setSettings: Dispatch<SetStateAction<configuration | undefined>>;
	selectedColor: string | undefined;
	setSelectedColor: Dispatch<SetStateAction<string | undefined>>;
	selectedDisplayType: string | undefined;
	setSelectedDisplayType: Dispatch<SetStateAction<string | undefined>>;
	selectedDisplayPosition: string | undefined;
	setSelectedDisplayPosition: Dispatch<SetStateAction<string | undefined>>;
	selectedPlayerQuality: string | undefined;
	setSelectedPlayerQuality: Dispatch<SetStateAction<string | undefined>>;
	selectedPlayerSpeed: string | undefined;
	setSelectedPlayerSpeed: Dispatch<SetStateAction<string | undefined>>;
	selectedScreenshotSaveAs: string | undefined;
	setSelectedScreenshotSaveAs: Dispatch<SetStateAction<string | undefined>>;
	selectedScreenshotFormat: string | undefined;
	setSelectedScreenshotFormat: Dispatch<SetStateAction<string | undefined>>;
	selectedLanguage: string | undefined;
	setSelectedLanguage: Dispatch<SetStateAction<string | undefined>>;
	defaultSettings: configuration;
	i18nInstance: i18nInstanceType;
}) {
	const [firstLoad, setFirstLoad] = useState(true);
	const { notifications, addNotification, removeNotification } = useNotifications();
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
		colors: { red, green, blue, orange, pink, white, purple, yellow },
		position: { bottom_left, bottom_right, top_left, top_right, center },
		type: { line, no_display, round, text }
	} = t("settings.sections.scrollWheelVolumeControl.onScreenDisplay", {
		returnObjects: true,
		defaultValue: {}
	});
	const {
		format: { jpeg, png, webp },
		saveAs: { clipboard, file }
	} = t("settings.sections.screenshotButton", {
		returnObjects: true,
		defaultValue: {}
	});
	const colorOptions: SelectOption[] = [
		{
			value: "red",
			label: red,
			element: <div className={cn("m-2 h-2 w-2 rounded-[50%]", "bg-[red]")}></div>
		},
		{
			value: "green",
			label: green,
			element: <div className={cn("m-2 h-2 w-2 rounded-[50%]", "bg-[green]")}></div>
		},
		{
			value: "blue",
			label: blue,
			element: <div className={cn("m-2 h-2 w-2 rounded-[50%]", "bg-[blue]")}></div>
		},
		{
			value: "yellow",
			label: yellow,
			element: <div className={cn("m-2 h-2 w-2 rounded-[50%]", "bg-[yellow]")}></div>
		},
		{
			value: "orange",
			label: orange,
			element: <div className={cn("m-2 h-2 w-2 rounded-[50%]", "bg-[orange]")}></div>
		},
		{
			value: "purple",
			label: purple,
			element: <div className={cn("m-2 h-2 w-2 rounded-[50%]", "bg-[purple]")}></div>
		},
		{
			value: "pink",
			label: pink,
			element: <div className={cn("m-2 h-2 w-2 rounded-[50%]", "bg-[pink]")}></div>
		},
		{
			value: "white",
			label: white,
			element: <div className={cn("m-2 h-2 w-2 rounded-[50%]", "bg-[white]")}></div>
		}
	];
	const OSD_DisplayTypeOptions: SelectOption[] = [
		{
			value: "no_display",
			label: no_display
		},
		{
			value: "text",
			label: text
		},
		{
			value: "line",
			label: line
		},
		{
			value: "round",
			label: round
		}
	];
	const OSD_PositionOptions: SelectOption[] = [
		{
			value: "top_left",
			label: top_left
		},
		{
			value: "top_right",
			label: top_right
		},
		{
			value: "bottom_left",
			label: bottom_left
		},
		{
			value: "bottom_right",
			label: bottom_right
		},
		{
			value: "center",
			label: center
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
			<div className="w-fit h-fit bg-[#f5f5f5] text-black dark:bg-[#181a1b] dark:text-white">
				<h1 className="flex gap-3 items-center content-center font-bold text-xl sm:text-2xl md:text-3xl">
					<img src="/icons/icon_128.png" className="h-16 w-16 sm:h-16 sm:w-16" />
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
					<SettingTitle title={t("settings.sections.importExportSettings.title")} />
					<div className="flex gap-1 p-2">
						<input
							type="button"
							id="import_settings_button"
							className="p-2 accent dark:hover:bg-[rgba(24,26,27,0.5)] text-sm sm:text-base md:text-lg"
							value={t("settings.sections.importExportSettings.importButton.value")}
							title={t("settings.sections.importExportSettings.importButton.title")}
							onClick={importSettings}
						/>
						<input
							type="button"
							id="export_settings_button"
							className="p-2 accent dark:hover:bg-[rgba(24,26,27,0.5)] text-sm sm:text-base md:text-lg"
							value={t("settings.sections.importExportSettings.exportButton.value")}
							title={t("settings.sections.importExportSettings.exportButton.title")}
							onClick={exportSettings}
							style={{ marginLeft: "auto" }}
						/>
					</div>
				</SettingSection>
				<SettingSection>
					<SettingTitle title={t("settings.sections.miscellaneous.title")} />
					<Setting
						type="checkbox"
						id="enable_remember_last_volume"
						title={t("settings.sections.miscellaneous.features.rememberLastVolume.title")}
						label={t("settings.sections.miscellaneous.features.rememberLastVolume.label")}
						checked={settings.enable_remember_last_volume?.toString() === "true"}
						onChange={setCheckboxOption("enable_remember_last_volume")}
					/>
					<Setting
						type="checkbox"
						id="enable_maximize_player_button"
						title={t("settings.sections.miscellaneous.features.maximizePlayerButton.title")}
						label={t("settings.sections.miscellaneous.features.maximizePlayerButton.label")}
						checked={settings.enable_maximize_player_button?.toString() === "true"}
						onChange={setCheckboxOption("enable_maximize_player_button")}
					/>
					<Setting
						type="checkbox"
						id="enable_video_history"
						title={t("settings.sections.miscellaneous.features.videoHistory.title")}
						label={t("settings.sections.miscellaneous.features.videoHistory.label")}
						checked={settings.enable_video_history?.toString() === "true"}
						onChange={setCheckboxOption("enable_video_history")}
					/>
					<Setting
						type="checkbox"
						id="enable_remaining_time"
						title={t("settings.sections.miscellaneous.features.remainingTime.title")}
						label={t("settings.sections.miscellaneous.features.remainingTime.label")}
						checked={settings.enable_remaining_time?.toString() === "true"}
						onChange={setCheckboxOption("enable_remaining_time")}
					/>
					<Setting
						type="checkbox"
						id="enable_loop_button"
						title={t("settings.sections.miscellaneous.features.loopButton.title")}
						label={t("settings.sections.miscellaneous.features.loopButton.label")}
						checked={settings.enable_loop_button?.toString() === "true"}
						onChange={setCheckboxOption("enable_loop_button")}
					/>
					<Setting
						type="checkbox"
						id="enable_hide_scrollbar"
						title={t("settings.sections.miscellaneous.features.hideScrollbar.title")}
						label={t("settings.sections.miscellaneous.features.hideScrollbar.label")}
						checked={settings.enable_hide_scrollbar?.toString() === "true"}
						onChange={setCheckboxOption("enable_hide_scrollbar")}
					/>
				</SettingSection>
				<SettingSection>
					<SettingTitle title={t("settings.sections.scrollWheelVolumeControl.title")} />
					<Setting
						type="checkbox"
						id="enable_scroll_wheel_volume_control"
						title={t("settings.sections.scrollWheelVolumeControl.enable.title")}
						label={t("settings.sections.scrollWheelVolumeControl.enable.label")}
						checked={settings.enable_scroll_wheel_volume_control?.toString() === "true"}
						onChange={setCheckboxOption("enable_scroll_wheel_volume_control")}
					/>
					<Setting
						type="select"
						id="osd_color_select"
						title={t("settings.sections.scrollWheelVolumeControl.osdColor.title")}
						label={t("settings.sections.scrollWheelVolumeControl.osdColor.label")}
						onChange={setValueOption("osd_display_color")}
						options={colorOptions}
						selectedOption={selectedColor}
						setSelectedOption={setSelectedColor}
						disabled={settings.enable_scroll_wheel_volume_control.toString() !== "true"}
					/>
					<Setting
						type="select"
						id="osd_display_type"
						title={t("settings.sections.scrollWheelVolumeControl.osdType.title")}
						label={t("settings.sections.scrollWheelVolumeControl.osdType.label")}
						onChange={setValueOption("osd_display_type")}
						options={OSD_DisplayTypeOptions}
						selectedOption={selectedDisplayType}
						setSelectedOption={setSelectedDisplayType}
						disabled={settings.enable_scroll_wheel_volume_control.toString() !== "true"}
					/>
					<Setting
						type="select"
						id="osd_display_position"
						title={t("settings.sections.scrollWheelVolumeControl.osdPosition.title")}
						label={t("settings.sections.scrollWheelVolumeControl.osdPosition.label")}
						onChange={setValueOption("osd_display_position")}
						options={OSD_PositionOptions}
						selectedOption={selectedDisplayPosition}
						setSelectedOption={setSelectedDisplayPosition}
						disabled={settings.enable_scroll_wheel_volume_control.toString() !== "true"}
					/>
					<Setting
						type="number"
						id="osd_display_opacity"
						title={t("settings.sections.scrollWheelVolumeControl.osdOpacity.title")}
						label={t("settings.sections.scrollWheelVolumeControl.osdOpacity.label")}
						min={1}
						max={100}
						value={settings.osd_display_opacity}
						onChange={setValueOption("osd_display_opacity")}
						disabled={settings.enable_scroll_wheel_volume_control.toString() !== "true"}
					/>
					<Setting
						type="number"
						id="volume_adjustment_steps"
						title={t("settings.sections.scrollWheelVolumeControl.osdVolumeAdjustmentSteps.title")}
						label={t("settings.sections.scrollWheelVolumeControl.osdVolumeAdjustmentSteps.label")}
						min={1}
						value={settings.volume_adjustment_steps}
						onChange={setValueOption("volume_adjustment_steps")}
						disabled={settings.enable_scroll_wheel_volume_control.toString() !== "true"}
					/>
					<Setting
						type="number"
						id="osd_display_hide_time"
						title={t("settings.sections.scrollWheelVolumeControl.osdHide.title")}
						label={t("settings.sections.scrollWheelVolumeControl.osdHide.label")}
						min={1}
						value={settings.osd_display_hide_time}
						onChange={setValueOption("osd_display_hide_time")}
						disabled={settings.enable_scroll_wheel_volume_control.toString() !== "true"}
					/>
					<Setting
						type="number"
						id="osd_display_padding"
						title={t("settings.sections.scrollWheelVolumeControl.osdPadding.title")}
						label={t("settings.sections.scrollWheelVolumeControl.osdPadding.label")}
						min={0}
						value={settings.osd_display_padding}
						onChange={setValueOption("osd_display_padding")}
						disabled={settings.enable_scroll_wheel_volume_control.toString() !== "true"}
					/>
				</SettingSection>
				<SettingSection>
					<SettingTitle title={t("settings.sections.automaticQuality.title")} />
					<Setting
						type="checkbox"
						id="enable_automatically_set_quality"
						title={t("settings.sections.automaticQuality.enable.title")}
						label={t("settings.sections.automaticQuality.enable.label")}
						checked={settings.enable_automatically_set_quality?.toString() === "true"}
						onChange={setCheckboxOption("enable_automatically_set_quality")}
					/>
					<Setting
						type="select"
						id="player_quality"
						title={t("settings.sections.automaticQuality.select.title")}
						label={t("settings.sections.automaticQuality.select.label")}
						onChange={setValueOption("player_quality")}
						options={YouTubePlayerQualityOptions}
						selectedOption={selectedPlayerQuality}
						setSelectedOption={setSelectedPlayerQuality}
						disabled={settings.enable_automatically_set_quality.toString() !== "true"}
					/>
				</SettingSection>
				<SettingSection>
					<SettingTitle title={t("settings.sections.playbackSpeed.title")} />
					<Setting
						type="checkbox"
						id="enable_forced_playback_speed"
						title={t("settings.sections.playbackSpeed.enable.title")}
						label={t("settings.sections.playbackSpeed.enable.label")}
						checked={settings.enable_forced_playback_speed?.toString() === "true"}
						onChange={setCheckboxOption("enable_forced_playback_speed")}
					/>
					<Setting
						type="select"
						id="player_speed"
						title={t("settings.sections.playbackSpeed.select.title")}
						label={t("settings.sections.playbackSpeed.select.label")}
						onChange={setValueOption("player_speed")}
						options={YouTubePlayerSpeedOptions}
						selectedOption={selectedPlayerSpeed?.toString()}
						setSelectedOption={setSelectedPlayerSpeed}
						disabled={settings.enable_forced_playback_speed.toString() !== "true"}
					/>
				</SettingSection>
				<SettingSection>
					<SettingTitle title={t("settings.sections.volumeBoost.title")} />
					<Setting
						type="checkbox"
						id="enable_volume_boost"
						title={t("settings.sections.volumeBoost.enable.title")}
						label={t("settings.sections.volumeBoost.enable.label")}
						checked={settings.enable_volume_boost?.toString() === "true"}
						onChange={setCheckboxOption("enable_volume_boost")}
					/>
					<Setting
						type="number"
						id="volume_boost_amount"
						title={t("settings.sections.volumeBoost.number.title")}
						label={t("settings.sections.volumeBoost.number.label")}
						min={1}
						max={100}
						value={settings.volume_boost_amount}
						onChange={setValueOption("volume_boost_amount")}
						disabled={settings.enable_volume_boost.toString() !== "true"}
					/>
				</SettingSection>
				<SettingSection>
					<SettingTitle title={t("settings.sections.screenshotButton.title")} />
					<Setting
						type="checkbox"
						id="enable_screenshot_button"
						title={t("settings.sections.screenshotButton.enable.title")}
						label={t("settings.sections.screenshotButton.enable.label")}
						checked={settings.enable_screenshot_button?.toString() === "true"}
						onChange={setCheckboxOption("enable_screenshot_button")}
					/>
					<Setting
						type="select"
						id="screenshot_save_as"
						label={t("settings.sections.screenshotButton.selectSaveAs.label")}
						title={t("settings.sections.screenshotButton.selectSaveAs.title")}
						onChange={setValueOption("screenshot_save_as")}
						options={ScreenshotSaveAsOptions}
						selectedOption={selectedScreenshotSaveAs}
						setSelectedOption={setSelectedScreenshotSaveAs}
						disabled={settings.enable_screenshot_button.toString() !== "true"}
					/>
					<Setting
						type="select"
						id="screenshot_format"
						label={t("settings.sections.screenshotButton.selectFormat.label")}
						title={t("settings.sections.screenshotButton.selectFormat.title")}
						onChange={setValueOption("screenshot_format")}
						options={ScreenshotFormatOptions}
						selectedOption={selectedScreenshotFormat}
						setSelectedOption={setSelectedScreenshotFormat}
						disabled={settings.enable_screenshot_button.toString() !== "true"}
					/>
				</SettingSection>
				<div className="flex gap-1 sticky left-0 bottom-0 p-2 bg-[#f5f5f5] dark:bg-[#181a1b]">
					<input
						type="button"
						id="clear_data_button"
						className="p-2 danger dark:hover:bg-[rgba(24,26,27,0.5)] text-sm sm:text-base md:text-lg"
						title={t("settings.sections.bottomButtons.clear.title")}
						value={t("settings.sections.bottomButtons.clear.value")}
						onClick={clearData}
					/>
					{notifications.filter((n) => n.action === "reset_settings").length > 0 ? (
						<input
							type="button"
							id="confirm_button"
							className="p-2 danger dark:hover:bg-[rgba(24,26,27,0.5)] text-sm sm:text-base md:text-lg"
							style={{ marginLeft: "auto" }}
							title={t("settings.sections.bottomButtons.confirm.title")}
							value={t("settings.sections.bottomButtons.confirm.value")}
							onClick={() => {
								const notificationToRemove = notifications.find((n) => n.action === "reset_settings");
								if (notificationToRemove) {
									removeNotification(notificationToRemove);
								}
								Object.assign(localStorage, Object.assign(defaultSettings, { remembered_volumes: settings.remembered_volumes }));
								chrome.storage.local.set(Object.assign(defaultSettings, { remembered_volumes: settings.remembered_volumes }));

								addNotification("success", t("pages.options.notifications.success.saved"));
							}}
						/>
					) : (
						<input
							type="button"
							id="reset_button"
							className="p-2 warning dark:hover:bg-[rgba(24,26,27,0.5)] text-sm sm:text-base md:text-lg"
							style={{ marginLeft: "auto" }}
							title={t("settings.sections.bottomButtons.reset.title")}
							value={t("settings.sections.bottomButtons.reset.value")}
							onClick={resetOptions}
						/>
					)}
				</div>
				<SettingsNotifications />
			</div>
		)
	);
}
