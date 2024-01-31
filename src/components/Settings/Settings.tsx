import type { ButtonPlacement, ModifierKey, Path, VideoHistoryResumeType, VolumeBoostMode, configuration, configurationKeys } from "@/src/types";
import type EnUS from "public/locales/en-US.json";
import type { ChangeEvent, ChangeEventHandler } from "react";

import "@/assets/styles/tailwind.css";
import "@/components/Settings/Settings.css";
import { useNotifications } from "@/hooks";
import { availableLocales, type i18nInstanceType, i18nService, localeDirection, localePercentages } from "@/src/i18n";
import { featuresThatHaveButtons, youtubePlayerSpeedRate } from "@/src/types";
import { configurationImportSchema, defaultConfiguration as defaultSettings } from "@/src/utils/constants";
import { cn, getPathValue, parseStoredValue, settingsAreDefault } from "@/src/utils/utilities";
import { Suspense, createContext, useContext, useEffect, useRef, useState } from "react";
import { generateErrorMessage } from "zod-error";

import type { SelectOption } from "../Inputs";

import { defaultConfiguration } from "../../utils/constants";
import { formatDateForFileName } from "../../utils/utilities";
import Loader from "../Loader";
import Setting from "./components/Setting";
import SettingsNotifications from "./components/SettingNotifications";
import SettingSection from "./components/SettingSection";
import SettingTitle from "./components/SettingTitle";

async function getLanguageOptions() {
	const promises = availableLocales.map(async (locale) => {
		try {
			const response = await fetch(`${chrome.runtime.getURL("")}locales/${locale}.json`);
			const localeData = await response.json();
			return Promise.resolve({
				label: `${(localeData as EnUS).langName} (${localePercentages[locale]}%)`,
				value: locale
			} as SelectOption);
		} catch (err) {
			return Promise.reject(err);
		}
	});

	const results = await Promise.allSettled(promises);

	const languageOptions: SelectOption[] = results
		.filter((result): result is PromiseFulfilledResult<SelectOption> => result.status === "fulfilled")
		.map((result) => result.value);

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
	const [languagesLoading, setLanguagesLoading] = useState(true);
	useEffect(() => {
		void (async () => {
			try {
				const languages = await getLanguageOptions();
				setLanguageOptions(languages);
				setLanguagesLoading(false);
			} catch (error) {
				setLanguagesLoading(false);
			}
		})();
	}, []);
	return (
		<SettingSection>
			<SettingTitle title={t("settings.sections.language.title")} />
			<Setting
				disabled={false}
				id="language"
				label={t("settings.sections.language.select.label")}
				loading={languagesLoading}
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
		(key: Path<configuration>) =>
		({ currentTarget: { checked } }: ChangeEvent<HTMLInputElement>) => {
			setFirstLoad(false);
			setSettings((options) => (options ? { ...options, [key]: checked } : undefined));
		};
	const setValueOption =
		(key: Path<configuration>) =>
		({ currentTarget: { value } }: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			setFirstLoad(false);
			setSettings((state) => {
				if (!state) {
					return undefined;
				}

				const updatedState = { ...state };
				const keys = key.split(".") as Array<keyof configuration>;
				let parentValue: any = updatedState;

				for (const currentKey of keys.slice(0, -1)) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					({ [currentKey]: parentValue } = parentValue);
				}

				const propertyName = keys.at(keys.length - 1);
				if (!propertyName) return updatedState;
				if (typeof parentValue === "object" && parentValue !== null) {
					// If the path represents a nested property, update the nested property
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					parentValue[propertyName] = value;
				} else {
					// If the path represents a top-level property, update it directly
					// @ts-expect-error not sure how to type this
					updatedState[propertyName] = value;
				}

				return updatedState;
			});
		};
	const getSelectedOption = <K extends Path<configuration>>(key: K) => getPathValue(settings, key);
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
	const scrollWheelControlModifierKeyOptions = [
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
			label: t("settings.sections.onScreenDisplaySettings.color.options.red"),
			value: "red"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-[1px] border-solid border-black", "bg-[green]")}></div>,
			label: t("settings.sections.onScreenDisplaySettings.color.options.green"),
			value: "green"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-[1px] border-solid border-black", "bg-[blue]")}></div>,
			label: t("settings.sections.onScreenDisplaySettings.color.options.blue"),
			value: "blue"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-[1px] border-solid border-black", "bg-[yellow]")}></div>,
			label: t("settings.sections.onScreenDisplaySettings.color.options.yellow"),
			value: "yellow"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-[1px] border-solid border-black", "bg-[orange]")}></div>,
			label: t("settings.sections.onScreenDisplaySettings.color.options.orange"),
			value: "orange"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-[1px] border-solid border-black", "bg-[purple]")}></div>,
			label: t("settings.sections.onScreenDisplaySettings.color.options.purple"),
			value: "purple"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-[1px] border-solid border-black", "bg-[pink]")}></div>,
			label: t("settings.sections.onScreenDisplaySettings.color.options.pink"),
			value: "pink"
		},
		{
			element: <div className={cn("m-2 h-3 w-3 rounded-[50%] border-[1px] border-solid border-black", "bg-[white]")}></div>,
			label: t("settings.sections.onScreenDisplaySettings.color.options.white"),
			value: "white"
		}
	];
	const OSD_DisplayTypeOptions: SelectOption[] = [
		{
			label: t("settings.sections.onScreenDisplaySettings.type.options.no_display"),
			value: "no_display"
		},
		{
			label: t("settings.sections.onScreenDisplaySettings.type.options.text"),
			value: "text"
		},
		{
			label: t("settings.sections.onScreenDisplaySettings.type.options.line"),
			value: "line"
		},
		{
			label: t("settings.sections.onScreenDisplaySettings.type.options.round"),
			value: "round"
		}
	];
	const OSD_PositionOptions: SelectOption[] = [
		{
			label: t("settings.sections.onScreenDisplaySettings.position.options.top_left"),
			value: "top_left"
		},
		{
			label: t("settings.sections.onScreenDisplaySettings.position.options.top_right"),
			value: "top_right"
		},
		{
			label: t("settings.sections.onScreenDisplaySettings.position.options.bottom_left"),
			value: "bottom_left"
		},
		{
			label: t("settings.sections.onScreenDisplaySettings.position.options.bottom_right"),
			value: "bottom_right"
		},
		{
			label: t("settings.sections.onScreenDisplaySettings.position.options.center"),
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
		{ label: t("settings.sections.screenshotButton.saveAs.file"), value: "file" },
		{ label: t("settings.sections.screenshotButton.saveAs.clipboard"), value: "clipboard" }
	];
	const VolumeBoostModeOptions: SelectOption[] = [
		{
			label: t("settings.sections.volumeBoost.mode.select.options.global"),
			value: "global"
		},
		{
			label: t("settings.sections.volumeBoost.mode.select.options.perVideo"),
			value: "per_video"
		}
	] as { label: string; value: VolumeBoostMode }[] as SelectOption[];
	const buttonPlacementOptions: SelectOption[] = [
		{ label: t("settings.sections.buttonPlacement.select.options.below_player.value"), value: "below_player" },
		{ label: t("settings.sections.buttonPlacement.select.options.feature_menu.value"), value: "feature_menu" },
		{
			label: t("settings.sections.buttonPlacement.select.options.player_controls_left.value"),
			value: "player_controls_left"
		},
		{
			label: t("settings.sections.buttonPlacement.select.options.player_controls_right.value"),
			value: "player_controls_right"
		}
	] as {
		label: string;
		value: ButtonPlacement;
	}[] as SelectOption[];
	const videoHistoryResumeTypeOptions: SelectOption[] = [
		{
			label: t("settings.sections.videoHistory.resumeType.select.options.automatic"),
			value: "automatic"
		},
		{
			label: t("settings.sections.videoHistory.resumeType.select.options.prompt"),
			value: "prompt"
		}
	] as { label: string; value: VideoHistoryResumeType }[] as SelectOption[];
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
						const castSettings = { ...defaultConfiguration, ...(importedSettings as configuration) };
						// Set the imported settings in your state.
						setSettings(castSettings);
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
					<SettingTitle title={t("settings.sections.featureMenu.openType.title")} />
					<Setting
						disabled={Object.values(settings.button_placements).every((v) => v !== "feature_menu")}
						id="feature_menu_open_type"
						label={t("settings.sections.featureMenu.openType.select.label")}
						onChange={setValueOption("feature_menu_open_type")}
						options={[
							{ label: t("settings.sections.featureMenu.openType.select.options.hover"), value: "hover" },
							{ label: t("settings.sections.featureMenu.openType.select.options.click"), value: "click" }
						]}
						selectedOption={getSelectedOption("feature_menu_open_type")}
						title={t("settings.sections.featureMenu.openType.select.title")}
						type="select"
					/>
				</SettingSection>
				<SettingSection>
					<SettingTitle title={t("settings.sections.buttonPlacement.title")} />
					{featuresThatHaveButtons.map((feature) => {
						// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
						const label = t(`settings.sections.buttonPlacement.select.buttonNames.${feature}`) as string;
						return (
							<Setting
								id={`button_placements.${feature}`}
								key={feature}
								label={label}
								onChange={setValueOption(`button_placements.${feature}`)}
								options={buttonPlacementOptions}
								selectedOption={getSelectedOption(`button_placements.${feature}`)}
								title={t(`settings.sections.buttonPlacement.select.title`, {
									BUTTON_NAME: label.toLowerCase(),
									PLACEMENT: t(`settings.sections.buttonPlacement.select.options.${getSelectedOption(`button_placements.${feature}`)}.placement`)
								})}
								type="select"
							/>
						);
					})}
				</SettingSection>
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
					<Setting
						checked={settings.enable_open_transcript_button?.toString() === "true"}
						id="enable_open_transcript_button"
						label={t("settings.sections.miscellaneous.features.openTranscriptButton.label")}
						onChange={setCheckboxOption("enable_open_transcript_button")}
						title={t("settings.sections.miscellaneous.features.openTranscriptButton.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_open_youtube_settings_on_hover?.toString() === "true"}
						id="enable_open_youtube_settings_on_hover"
						label={t("settings.sections.miscellaneous.features.openYouTubeSettingsOnHover.label")}
						onChange={setCheckboxOption("enable_open_youtube_settings_on_hover")}
						title={t("settings.sections.miscellaneous.features.openYouTubeSettingsOnHover.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_redirect_remover?.toString() === "true"}
						id="enable_redirect_remover"
						label={t("settings.sections.miscellaneous.features.removeRedirect.label")}
						onChange={setCheckboxOption("enable_redirect_remover")}
						title={t("settings.sections.miscellaneous.features.removeRedirect.title")}
						type="checkbox"
					/>
				</SettingSection>
				<SettingSection>
					<SettingTitle title={t("settings.sections.videoHistory.title")} />
					<Setting
						checked={settings.enable_video_history?.toString() === "true"}
						id="enable_video_history"
						label={t("settings.sections.videoHistory.enable.label")}
						onChange={setCheckboxOption("enable_video_history")}
						title={t("settings.sections.videoHistory.enable.title")}
						type="checkbox"
					/>
					<Setting
						id="video_history_resume_type"
						label={t("settings.sections.videoHistory.resumeType.select.label")}
						onChange={setValueOption("video_history_resume_type")}
						options={videoHistoryResumeTypeOptions}
						selectedOption={getSelectedOption("video_history_resume_type")}
						title={t("settings.sections.videoHistory.resumeType.select.title")}
						type="select"
					/>
				</SettingSection>
				<SettingSection>
					<SettingTitle title={t("settings.sections.onScreenDisplaySettings.title")} />
					<Setting
						disabled={
							settings.enable_scroll_wheel_volume_control?.toString() !== "true" && settings.enable_scroll_wheel_speed_control?.toString() !== "true"
						}
						id="osd_display_color"
						label={t("settings.sections.onScreenDisplaySettings.color.label")}
						onChange={setValueOption("osd_display_color")}
						options={colorOptions}
						selectedOption={getSelectedOption("osd_display_color")}
						title={t("settings.sections.onScreenDisplaySettings.color.title")}
						type="select"
					/>
					<Setting
						disabled={
							settings.enable_scroll_wheel_volume_control?.toString() !== "true" && settings.enable_scroll_wheel_speed_control?.toString() !== "true"
						}
						id="osd_display_type"
						label={t("settings.sections.onScreenDisplaySettings.type.label")}
						onChange={setValueOption("osd_display_type")}
						options={OSD_DisplayTypeOptions}
						selectedOption={getSelectedOption("osd_display_type")}
						title={t("settings.sections.onScreenDisplaySettings.type.title")}
						type="select"
					/>
					<Setting
						disabled={
							settings.enable_scroll_wheel_volume_control?.toString() !== "true" && settings.enable_scroll_wheel_speed_control?.toString() !== "true"
						}
						id="osd_display_position"
						label={t("settings.sections.onScreenDisplaySettings.position.label")}
						onChange={setValueOption("osd_display_position")}
						options={OSD_PositionOptions}
						selectedOption={getSelectedOption("osd_display_position")}
						title={t("settings.sections.onScreenDisplaySettings.position.title")}
						type="select"
					/>
					<Setting
						disabled={
							settings.enable_scroll_wheel_volume_control?.toString() !== "true" && settings.enable_scroll_wheel_speed_control?.toString() !== "true"
						}
						id="osd_display_opacity"
						label={t("settings.sections.onScreenDisplaySettings.opacity.label")}
						max={100}
						min={1}
						onChange={setValueOption("osd_display_opacity")}
						title={t("settings.sections.onScreenDisplaySettings.opacity.title")}
						type="number"
						value={settings.osd_display_opacity}
					/>
					<Setting
						disabled={
							settings.enable_scroll_wheel_volume_control?.toString() !== "true" && settings.enable_scroll_wheel_speed_control?.toString() !== "true"
						}
						id="osd_display_hide_time"
						label={t("settings.sections.onScreenDisplaySettings.hide.label")}
						min={1}
						onChange={setValueOption("osd_display_hide_time")}
						title={t("settings.sections.onScreenDisplaySettings.hide.title")}
						type="number"
						value={settings.osd_display_hide_time}
					/>
					<Setting
						disabled={
							settings.enable_scroll_wheel_volume_control?.toString() !== "true" && settings.enable_scroll_wheel_speed_control?.toString() !== "true"
						}
						id="osd_display_padding"
						label={t("settings.sections.onScreenDisplaySettings.padding.label")}
						min={0}
						onChange={setValueOption("osd_display_padding")}
						title={t("settings.sections.onScreenDisplaySettings.padding.title")}
						type="number"
						value={settings.osd_display_padding}
					/>
				</SettingSection>
				<SettingSection>
					<SettingTitle title={t("settings.sections.scrollWheelSpeedControl.title")} />
					<Setting
						checked={settings.enable_scroll_wheel_speed_control?.toString() === "true"}
						id="enable_scroll_wheel_speed_control"
						label={t("settings.sections.scrollWheelSpeedControl.enable.label")}
						onChange={setCheckboxOption("enable_scroll_wheel_speed_control")}
						title={t("settings.sections.scrollWheelSpeedControl.enable.title")}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_speed_control?.toString() !== "true"}
						id="scroll_wheel_speed_control_modifier_key"
						label={t("settings.sections.scrollWheelSpeedControl.select.label")}
						onChange={(value) => {
							const {
								currentTarget: { value: scrollWheelModifierKey }
							} = value;
							if (
								settings.enable_scroll_wheel_speed_control &&
								settings.enable_scroll_wheel_volume_control_hold_modifier_key &&
								settings.scroll_wheel_volume_control_modifier_key === scrollWheelModifierKey
							) {
								return addNotification("error", "pages.options.notifications.error.scrollWheelHoldModifierKey.sameKey.speedControl");
							}
							setValueOption("scroll_wheel_speed_control_modifier_key")(value);
						}}
						options={scrollWheelControlModifierKeyOptions}
						selectedOption={getSelectedOption("scroll_wheel_speed_control_modifier_key")}
						title={t("settings.sections.scrollWheelSpeedControl.select.title")}
						type="select"
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_speed_control?.toString() !== "true"}
						id="speed_adjustment_steps"
						label={t("settings.sections.scrollWheelSpeedControl.adjustmentSteps.label")}
						max={1}
						min={0.05}
						onChange={setValueOption("speed_adjustment_steps")}
						step={0.05}
						title={t("settings.sections.scrollWheelSpeedControl.adjustmentSteps.title")}
						type="number"
						value={settings.speed_adjustment_steps}
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
						onChange={(value) => {
							const {
								currentTarget: { value: scrollWheelModifierKey }
							} = value;
							if (
								settings.enable_scroll_wheel_speed_control &&
								settings.enable_scroll_wheel_volume_control_hold_modifier_key &&
								settings.scroll_wheel_speed_control_modifier_key === scrollWheelModifierKey
							) {
								return addNotification("error", "pages.options.notifications.error.scrollWheelHoldModifierKey.sameKey.volumeControl");
							}
							setValueOption("scroll_wheel_volume_control_modifier_key")(value);
						}}
						options={scrollWheelControlModifierKeyOptions}
						selectedOption={getSelectedOption("scroll_wheel_volume_control_modifier_key")}
						title={t("settings.sections.scrollWheelVolumeControl.holdModifierKey.select.title")}
						type="select"
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_volume_control?.toString() !== "true"}
						id="volume_adjustment_steps"
						label={t("settings.sections.scrollWheelVolumeControl.adjustmentSteps.label")}
						min={1}
						onChange={setValueOption("volume_adjustment_steps")}
						title={t("settings.sections.scrollWheelVolumeControl.adjustmentSteps.title")}
						type="number"
						value={settings.volume_adjustment_steps}
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
						id="volume_boost_mode"
						label={t("settings.sections.volumeBoost.mode.select.label")}
						onChange={setValueOption("volume_boost_mode")}
						options={VolumeBoostModeOptions}
						selectedOption={getSelectedOption("volume_boost_mode")}
						title={t("settings.sections.volumeBoost.mode.select.title")}
						type="select"
					/>
					<Setting
						disabled={settings.enable_volume_boost?.toString() !== "true"}
						id="volume_boost_amount"
						label={t("settings.sections.volumeBoost.boostAmount.label")}
						max={100}
						min={1}
						onChange={setValueOption("volume_boost_amount")}
						title={t("settings.sections.volumeBoost.boostAmount.title")}
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
				<SettingSection>
					<SettingTitle title={t("settings.sections.customCSS.title")} />
					<Setting
						checked={settings.enable_custom_css?.toString() === "true"}
						id="enable_custom_css"
						label={t("settings.sections.customCSS.enable.label")}
						onChange={setCheckboxOption("enable_custom_css")}
						title={t("settings.sections.customCSS.enable.title")}
						type="checkbox"
					/>
					<Setting
						id="custom_css_code"
						onChange={(value) => {
							if (value !== undefined) {
								setValueOption("custom_css_code")({ currentTarget: { value } } as ChangeEvent<HTMLInputElement>);
							}
						}}
						type="css-editor"
						value={settings.custom_css_code}
					/>
				</SettingSection>
				<div className="sticky bottom-0 left-0 z-10 flex justify-between gap-1 bg-[#f5f5f5] p-2 dark:bg-[#181a1b]">
					<input
						className="danger p-2 text-sm sm:text-base md:text-lg dark:hover:bg-[rgba(24,26,27,0.5)]"
						id="clear_data_button"
						onClick={clearData}
						title={t("settings.sections.bottomButtons.clear.title")}
						type="button"
						value={t("settings.sections.bottomButtons.clear.value")}
					/>
					<input
						className="accent p-2 text-sm sm:text-base md:text-lg dark:hover:bg-[rgba(24,26,27,0.5)]"
						id="import_settings_button"
						onClick={importSettings}
						title={t("settings.sections.importExportSettings.importButton.title")}
						type="button"
						value={t("settings.sections.importExportSettings.importButton.value")}
					/>
					<input
						className="accent p-2 text-sm sm:text-base md:text-lg dark:hover:bg-[rgba(24,26,27,0.5)]"
						id="export_settings_button"
						onClick={exportSettings}
						title={t("settings.sections.importExportSettings.exportButton.title")}
						type="button"
						value={t("settings.sections.importExportSettings.exportButton.value")}
					/>
					{notifications.filter((n) => n.action === "reset_settings").length > 0 ? (
						<input
							className="danger p-2 text-sm sm:text-base md:text-lg dark:hover:bg-[rgba(24,26,27,0.5)]"
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
							className="warning p-2 text-sm sm:text-base md:text-lg dark:hover:bg-[rgba(24,26,27,0.5)]"
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
