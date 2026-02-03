/* eslint-disable tailwindcss/enforces-shorthand */
import type { ClassValue } from "clsx";
import type EnUS from "public/locales/en-US.json";
import type { ChangeEvent, ChangeEventHandler } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import "@/assets/styles/tailwind.css";
import "@/components/Settings/Settings.css";
import { createContext, Suspense, useContext, useEffect, useRef, useState } from "react";
import { MdOutlineExpandMore, MdOutlineOpenInNew } from "react-icons/md";
import { generateErrorMessage } from "zod-error";

import type { AllButtonNames, configuration, configurationKeys, Nullable, Path } from "@/src/types";

import { useNotifications } from "@/hooks";
import Link from "@/src/components/Link";
import SettingSearch from "@/src/components/Settings/components/SettingSearch";
import { deepDarkPreset } from "@/src/deepDarkPresets";
import { type i18nInstanceType, i18nService } from "@/src/i18n";
import { availableLocales, localeDirection, localePercentages } from "@/src/i18n/constants";
import { buttonNames, youtubePlayerMaxSpeed, youtubePlayerSpeedStep } from "@/src/types";
import { configurationImportSchema, defaultConfiguration as defaultSettings } from "@/src/utils/constants";
import { updateStoredSettings } from "@/src/utils/updateStoredSettings";
import { cn, deepMerge, formatDateForFileName, getPathValue, isButtonSelectDisabled, parseStoredValue } from "@/src/utils/utilities";

import type { SelectOption } from "../Inputs";

import Loader from "../Loader";
import Setting, { type parentSetting } from "./components/Setting";
import SettingsNotifications from "./components/SettingNotifications";
import SettingSection from "./components/SettingSection";
import SettingTitle from "./components/SettingTitle";
type SettingsContextProps = {
	direction: "ltr" | "rtl";
	i18nInstance: i18nInstanceType;
	settings: configuration;
};
export default function Settings() {
	const queryClient = useQueryClient();
	const { data: settings } = useQuery({
		queryFn: fetchSettings,
		queryKey: ["settings"]
	});
	const settingsMutate = useMutation({
		mutationFn: setSettings,
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["settings"]
			});
			addNotification("success", (translations) => translations.pages.options.notifications.success.saved);
		}
	});
	const [canScroll, setCanScroll] = useState<boolean>(true);
	useEffect(() => {
		const handleScroll = () => {
			const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
			setCanScroll(window.scrollY < scrollableHeight);
		};
		window.addEventListener("scroll", handleScroll);
		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);

	const [i18nInstance, setI18nInstance] = useState<Nullable<i18nInstanceType>>(null);
	const settingsImportRef = useRef<HTMLInputElement>(null);
	const { addNotification, notifications, removeNotification } = useNotifications();
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
			settingsMutate.mutate({ ...settings, [key]: checked });
		};
	const setValueOption =
		(key: Path<configuration>) =>
		({ currentTarget: { value } }: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			settingsMutate.mutate(
				((state) => {
					const updatedState = { ...state };
					const keys = key.split(".") as Array<keyof configuration>;
					let parentValue: any = updatedState;

					for (const currentKey of keys.slice(0, -1)) {
						({ [currentKey]: parentValue } = parentValue);
					}

					const propertyName = keys.at(keys.length - 1);
					if (!propertyName) return updatedState;
					if (typeof parentValue === "object" && parentValue !== null) {
						// If the path represents a nested property, update the nested property

						parentValue[propertyName] = value;
					} else {
						// If the path represents a top-level property, update it directly
						// @ts-expect-error not sure how to type this
						updatedState[propertyName] = value;
					}

					return updatedState;
				})(settings)
			);
		};
	const getSelectedOption = <K extends Path<configuration>>(key: K) => getPathValue(settings, key);
	function resetOptions() {
		addNotification("info", (translations) => translations.pages.options.notifications.info.reset, "reset_settings");
	}
	function clearData() {
		const userHasConfirmed = window.confirm(t((translations) => translations.pages.options.extras.clearData.confirmAlert));
		if (userHasConfirmed) {
			for (const key of Object.keys(defaultSettings)) {
				if (typeof defaultSettings[key] !== "string") {
					localStorage.setItem(key, JSON.stringify(defaultSettings[key]));
					void chrome.storage.local.set({ [key]: JSON.stringify(defaultSettings[key]) });
				} else {
					localStorage.setItem(key, defaultSettings[key]);
					void chrome.storage.local.set({ [key]: defaultSettings[key] });
				}
			}
			addNotification("success", (translations) => translations.pages.options.extras.clearData.allDataDeleted);
		}
	}
	const scrollWheelControlModifierKeyOptions: SelectOption<"scroll_wheel_speed_control_modifier_key" | "scroll_wheel_volume_control_modifier_key">[] =
		[
			{
				label: t((translations) => translations.settings.sections.scrollWheelVolumeControl.extras.optionLabel, {
					KEY: "Alt"
				}),
				value: "altKey"
			},
			{
				label: t((translations) => translations.settings.sections.scrollWheelVolumeControl.extras.optionLabel, {
					KEY: "Ctrl"
				}),
				value: "ctrlKey"
			},
			{
				label: t((translations) => translations.settings.sections.scrollWheelVolumeControl.extras.optionLabel, {
					KEY: "Shift"
				}),
				value: "shiftKey"
			}
		];
	const colorDotClassName: ClassValue = "m-2 w-3 h-3 rounded-[50%] border-DEFAULT border-solid border-black";
	const colorOptions: SelectOption<"osd_display_color">[] = [
		{
			element: <div className={cn(colorDotClassName, "bg-[red]")}></div>,
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.select.options.red),
			value: "red"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[green]")}></div>,
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.select.options.green),
			value: "green"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[blue]")}></div>,
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.select.options.blue),
			value: "blue"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[yellow]")}></div>,
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.select.options.yellow),
			value: "yellow"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[orange]")}></div>,
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.select.options.orange),
			value: "orange"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[purple]")}></div>,
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.select.options.purple),
			value: "purple"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[pink]")}></div>,
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.select.options.pink),
			value: "pink"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[white]")}></div>,
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.select.options.white),
			value: "white"
		}
	];
	const OSD_DisplayTypeOptions: SelectOption<"osd_display_type">[] = [
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.type.select.options.no_display),
			value: "no_display"
		},
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.type.select.options.text),
			value: "text"
		},
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.type.select.options.line),
			value: "line"
		},
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.type.select.options.circle),
			value: "circle"
		}
	];
	const OSD_PositionOptions: SelectOption<"osd_display_position">[] = [
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.position.select.options.top_left),
			value: "top_left"
		},
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.position.select.options.top_right),
			value: "top_right"
		},
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.position.select.options.bottom_left),
			value: "bottom_left"
		},
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.position.select.options.bottom_right),
			value: "bottom_right"
		},
		{
			label: t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.position.select.options.center),
			value: "center"
		}
	];
	const YouTubePlayerQualityOptions = [
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
		// This cast is here because otherwise it would require marking all the options 'as const'
	].reverse() as SelectOption<"player_quality">[];
	const PlayerQualityFallbackStrategyOptions = [
		{
			label: t((translations) => translations.settings.sections.playerQuality.settings.qualityFallbackStrategy.select.options.higher),
			value: "higher"
		},
		{
			label: t((translations) => translations.settings.sections.playerQuality.settings.qualityFallbackStrategy.select.options.lower),
			value: "lower"
		}
	] as SelectOption<"player_quality_fallback_strategy">[];
	const ScreenshotFormatOptions: SelectOption<"screenshot_format">[] = [
		{ label: "PNG", value: "png" },
		{ label: "JPEG", value: "jpeg" },
		{ label: "WebP", value: "webp" }
	];
	const ScreenshotSaveAsOptions: SelectOption<"screenshot_save_as">[] = [
		{ label: t((translations) => translations.settings.sections.screenshotButton.settings.saveAs.select.options.file), value: "file" },
		{ label: t((translations) => translations.settings.sections.screenshotButton.settings.saveAs.select.options.clipboard), value: "clipboard" },
		{ label: t((translations) => translations.settings.sections.screenshotButton.settings.saveAs.select.options.both), value: "both" }
	];
	const VolumeBoostModeOptions: SelectOption<"volume_boost_mode">[] = [
		{
			label: t((translations) => translations.settings.sections.volumeBoost.settings.mode.select.options.global),
			value: "global"
		},
		{
			label: t((translations) => translations.settings.sections.volumeBoost.settings.mode.select.options.perVideo),
			value: "per_video"
		}
	];
	const buttonPlacementOptions: SelectOption<
		| "button_placements.copyTimestampUrlButton"
		| "button_placements.decreasePlaybackSpeedButton"
		| "button_placements.forwardButton"
		| "button_placements.hideEndScreenCardsButton"
		| "button_placements.increasePlaybackSpeedButton"
		| "button_placements.loopButton"
		| "button_placements.maximizePlayerButton"
		| "button_placements.openTranscriptButton"
		| "button_placements.rewindButton"
		| "button_placements.screenshotButton"
		| "button_placements.volumeBoostButton"
	>[] = [
		{ label: t((translations) => translations.pages.options.extras.buttonPlacement.select.options.below_player.value), value: "below_player" },
		{ label: t((translations) => translations.pages.options.extras.buttonPlacement.select.options.feature_menu.value), value: "feature_menu" },
		{
			label: t((translations) => translations.pages.options.extras.buttonPlacement.select.options.player_controls_left.value),
			value: "player_controls_left"
		},
		{
			label: t((translations) => translations.pages.options.extras.buttonPlacement.select.options.player_controls_right.value),
			value: "player_controls_right"
		}
	];
	const videoHistoryResumeTypeOptions: SelectOption<"video_history_resume_type">[] = [
		{
			label: t((translations) => translations.settings.sections.videoHistory.settings.resumeType.select.options.automatic),
			value: "automatic"
		},
		{
			label: t((translations) => translations.settings.sections.videoHistory.settings.resumeType.select.options.prompt),
			value: "prompt"
		}
	];
	const deepDarkCSSThemeOptions: SelectOption<"deep_dark_preset">[] = deepDarkPreset.map((value) => {
		return {
			label: value,
			value
		};
	});
	const playlistLengthGetMethodOptions: SelectOption<"playlist_length_get_method">[] = [
		{
			label: "API",
			value: "api"
		},
		{
			label: "HTML",
			value: "html"
		}
	];
	const playlistWatchTimeGetMethodOptions: SelectOption<"playlist_watch_time_get_method">[] = [
		{
			label: t((translations) => translations.settings.sections.playlistLength.settings.wayToGetWatchTime.select.options.duration),
			value: "duration"
		},
		{
			label: t((translations) => translations.settings.sections.playlistLength.settings.wayToGetWatchTime.select.options.youtube),
			value: "youtube"
		}
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
						const errorMessage = generateErrorMessage(error.issues);
						window.alert(
							t((translations) => translations.pages.options.extras.importExportSettings.importButton.error.validation, {
								ERROR_MESSAGE: errorMessage
							})
						);
					} else {
						const castSettings = deepMerge(defaultSettings, importedSettings as configuration) as configuration;
						for (const key of Object.keys(castSettings)) {
							if (typeof castSettings[key] !== "string") {
								localStorage.setItem(key, JSON.stringify(castSettings[key]));
								void chrome.storage.local.set({ [key]: JSON.stringify(castSettings[key]) });
							} else {
								localStorage.setItem(key, castSettings[key]);
								void chrome.storage.local.set({ [key]: castSettings[key] });
							}
						}
						await updateStoredSettings();
						const storedSettings = await getSettings();
						// Set the imported settings in your state.
						settingsMutate.mutate(storedSettings);
						// Show a success notification.
						addNotification("success", (translations) => translations.pages.options.extras.importExportSettings.importButton.success);
					}
				} catch (_) {
					// Handle any import errors.
					window.alert(t((translations) => translations.pages.options.extras.importExportSettings.importButton.error.unknown));
				}
			}
			if (settingsImportRef.current) settingsImportRef.current.value = "";
		})();
	};
	// Import settings from a JSON file.
	function importSettings() {
		if (settingsImportRef.current === null) return;
		const isFirefox = navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
		if (isFirefox && isPopup) {
			// If user is currently on a popup, opens extensions page in a new tab to prevent settings not being imported.
			openInNewTab("src/pages/options/index.html");
			window.close();
			return;
		}
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
			addNotification("success", (translations) => translations.pages.options.extras.importExportSettings.exportButton.success);
		}
	};
	const isPopup = window.location.href.match(/.+\/src\/pages\/popup\/index\.html/g);
	const openInNewTab = (path: string) => {
		const url = chrome.runtime.getURL(path);
		void chrome.tabs.create({ url });
	};
	const isOSDDisabled =
		settings.enable_scroll_wheel_volume_control?.toString() !== "true" && settings.enable_scroll_wheel_speed_control?.toString() !== "true";
	const isDeepDarkThemeDisabled = settings.enable_deep_dark_theme?.toString() !== "true";
	const isDeepDarkThemeCustom = settings.deep_dark_preset === "Custom";
	const deepDarkThemeColorPickerParentSetting = {
		type: "singular",
		value: (translations) => translations.settings.sections.deepDarkCSS.enable.label
	} satisfies parentSetting;
	const osdParentSetting = {
		type: "either",
		value: [
			(translations) => translations.settings.sections.scrollWheelVolumeControl.enable.label,
			(translations) => translations.settings.sections.scrollWheelSpeedControl.enable.label
		]
	} satisfies parentSetting;
	const scrollWheelSpeedControlParentSetting = {
		type: "singular",
		value: (translations) => translations.settings.sections.scrollWheelSpeedControl.enable.label
	} satisfies parentSetting;
	const scrollWheelVolumeControlParentSetting = {
		type: "singular",
		value: (translations) => translations.settings.sections.scrollWheelVolumeControl.enable.label
	} satisfies parentSetting;
	const automaticQualityParentSetting = {
		type: "singular",
		value: (translations) => translations.settings.sections.playerQuality.enable.label
	} satisfies parentSetting;
	const volumeBoostParentSetting = {
		type: "singular",
		value: (translations) => translations.settings.sections.volumeBoost.enable.label
	} satisfies parentSetting;
	const screenshotButtonParentSetting = {
		type: "singular",
		value: (translations) => translations.settings.sections.screenshotButton.enable.label
	} satisfies parentSetting;
	const screenshotButtonSaveAsClipboardParentSetting = {
		type: "specificOption",
		value: (translations) => translations.pages.options.extras.optionDisabled.specificOption.screenshotButtonFileFormat
	} satisfies parentSetting;
	const playlistLengthParentSetting = {
		type: "singular",
		value: (translations) => translations.settings.sections.playlistLength.enable.label
	} satisfies parentSetting;
	// TODO: add "default player mode" setting (theater, fullscreen, etc.) feature
	return (
		<SettingsContext.Provider value={{ direction: localeDirection[settings.language], i18nInstance, settings }}>
			<div className="h-fit w-fit bg-[#f5f5f5] text-black dark:multi-['bg-[#181a1b];text-white']" dir={localeDirection[settings.language]}>
				<div className="sticky left-0 top-0 z-10 flex flex-col justify-between gap-1 bg-[#f5f5f5] dark:bg-[#181a1b]">
					<h1 className="flex content-center items-center gap-3 text-xl font-bold sm:text-2xl md:text-3xl" dir={"ltr"}>
						<img className="h-16 w-16" src="/icons/icon_128.png" />
						YouTube Enhancer
						<small className="light text-xs sm:text-sm md:text-base">v{chrome.runtime.getManifest().version}</small>
					</h1>
					<SettingSearch i18nInstance={i18nInstance} />
				</div>
				<Setting
					checked={settings.open_settings_on_major_or_minor_version_change?.toString() === "true"}
					label={t((translations) => translations.pages.options.extras.openSettingsOnMajorOrMinorVersionChange.label)}
					onChange={setCheckboxOption("open_settings_on_major_or_minor_version_change")}
					parentSetting={null}
					title={t((translations) => translations.pages.options.extras.openSettingsOnMajorOrMinorVersionChange.title)}
					type="checkbox"
				></Setting>
				<Suspense fallback={<Loader />}>
					<LanguageOptions selectedLanguage={settings["language"]} setValueOption={setValueOption} t={i18nInstance.t} />
				</Suspense>
				<SettingSection title={t((translations) => translations.pages.options.extras.featureMenu.openType.title)}>
					<SettingTitle />
					<Setting
						disabled={Object.values(settings.button_placements).every((v) => v !== "feature_menu")}
						id="feature_menu_open_type"
						label={t((translations) => translations.pages.options.extras.featureMenu.openType.select.label)}
						onChange={setValueOption("feature_menu_open_type")}
						options={[
							{ label: t((translations) => translations.pages.options.extras.featureMenu.openType.select.options.hover), value: "hover" },
							{ label: t((translations) => translations.pages.options.extras.featureMenu.openType.select.options.click), value: "click" }
						]}
						parentSetting={{
							type: "specificOption",
							value: (translations) => translations.pages.options.extras.optionDisabled.specificOption.featureMenu
						}}
						selectedOption={getSelectedOption("feature_menu_open_type")}
						title={t((translations) => translations.pages.options.extras.featureMenu.openType.select.title)}
						type="select"
					/>
				</SettingSection>
				<SettingSection title={t((translations) => translations.pages.options.extras.buttonPlacement.title)}>
					<SettingTitle />
					{buttonNames.map((feature) => {
						const label = t((translations) => translations.pages.options.extras.buttonPlacement.select.buttonNames[feature]);
						return (
							<Setting
								disabled={isButtonSelectDisabled(feature, settings)}
								id={`button_placements.${feature}` as `button_placements.${AllButtonNames}`}
								key={feature}
								label={label}
								onChange={(change) => {
									switch (feature) {
										case "decreasePlaybackSpeedButton":
										case "increasePlaybackSpeedButton": {
											setValueOption(`button_placements.decreasePlaybackSpeedButton`)(change);
											// Timeout required otherwise the button won't work
											setTimeout(() => setValueOption(`button_placements.increasePlaybackSpeedButton`)(change), 25);
											break;
										}
										case "forwardButton":
										case "rewindButton": {
											setValueOption(`button_placements.rewindButton`)(change);
											setTimeout(() => setValueOption(`button_placements.forwardButton`)(change), 50);
											break;
										}
										default:
											setValueOption(`button_placements.${feature}`)(change);
									}
								}}
								options={buttonPlacementOptions}
								parentSetting={{
									type: "singular",
									value: (translations) => translations.pages.options.extras.buttonPlacement.select.buttonNames[feature]
								}}
								selectedOption={getSelectedOption(`button_placements.${feature}`)}
								title={t((translations) => translations.pages.options.extras.buttonPlacement.select.title, {
									BUTTON_NAME: label.toLowerCase(),
									PLACEMENT: t(
										(translations) =>
											translations.pages.options.extras.buttonPlacement.select.options[getSelectedOption(`button_placements.${feature}`)].placement
									)
								})}
								type="select"
							/>
						);
					})}
				</SettingSection>
				<SettingSection title={t((translations) => translations.pages.options.extras.youtubeDataApiV3Key.title)}>
					<SettingTitle />
					<Setting
						disabled={false}
						input_type="password"
						label={t((translations) => translations.pages.options.extras.youtubeDataApiV3Key.input.label)}
						onChange={setValueOption("youtube_data_api_v3_key")}
						parentSetting={null}
						title={t((translations) => translations.pages.options.extras.youtubeDataApiV3Key.input.title)}
						type="text-input"
						value={settings.youtube_data_api_v3_key}
					/>
					<fieldset className={cn("flex flex-row gap-1")}>
						<Link className="ml-2" href="https://developers.google.com/youtube/v3/getting-started" target="_blank">
							{t((translations) => translations.pages.options.extras.youtubeDataApiV3Key.getApiKeyLinkText)}
						</Link>
					</fieldset>
				</SettingSection>
				<SettingSection title={t((translations) => translations.settings.sections.miscellaneous.title)}>
					<SettingTitle />
					<Setting
						checked={settings.enable_remember_last_volume?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.rememberVolume.enable.label)}
						onChange={setCheckboxOption("enable_remember_last_volume")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.rememberVolume.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_maximize_player_button?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.maximizePlayerButton.enable.label)}
						onChange={setCheckboxOption("enable_maximize_player_button")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.maximizePlayerButton.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_automatically_maximize_player.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyMaximizePlayer.enable.label)}
						onChange={setCheckboxOption("enable_automatically_maximize_player")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyMaximizePlayer.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_remaining_time?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.remainingTime.enable.label)}
						onChange={setCheckboxOption("enable_remaining_time")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.remainingTime.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_pausing_background_players?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.pauseBackgroundPlayers.enable.label)}
						onChange={setCheckboxOption("enable_pausing_background_players")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.pauseBackgroundPlayers.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_loop_button?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.loopButton.enable.label)}
						onChange={setCheckboxOption("enable_loop_button")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.loopButton.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_copy_timestamp_url_button?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.copyTimestampUrlButton.enable.label)}
						onChange={setCheckboxOption("enable_copy_timestamp_url_button")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.copyTimestampUrlButton.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_scrollbar?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.hideScrollbar.enable.label)}
						onChange={setCheckboxOption("enable_hide_scrollbar")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.hideScrollbar.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_automatic_theater_mode?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticTheaterMode.enable.label)}
						onChange={setCheckboxOption("enable_automatic_theater_mode")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticTheaterMode.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_open_transcript_button?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.openTranscriptButton.enable.label)}
						onChange={setCheckboxOption("enable_open_transcript_button")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.openTranscriptButton.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_open_youtube_settings_on_hover?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.openYouTubeSettingsOnHover.enable.label)}
						onChange={setCheckboxOption("enable_open_youtube_settings_on_hover")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.openYouTubeSettingsOnHover.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_redirect_remover?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.removeRedirect.enable.label)}
						onChange={setCheckboxOption("enable_redirect_remover")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.removeRedirect.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_share_shortener?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.shareShortener.enable.label)}
						onChange={setCheckboxOption("enable_share_shortener")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.shareShortener.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_skip_continue_watching?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.skipContinueWatching.enable.label)}
						onChange={setCheckboxOption("enable_skip_continue_watching")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.skipContinueWatching.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_shorts_auto_scroll?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.shortsAutoScroll.enable.label)}
						onChange={setCheckboxOption("enable_shorts_auto_scroll")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.shortsAutoScroll.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_shorts?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.hideShorts.enable.label)}
						onChange={setCheckboxOption("enable_hide_shorts")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.hideShorts.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_playables?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.hidePlayables.enable.label)}
						onChange={setCheckboxOption("enable_hide_playables")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.hidePlayables.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_artificial_intelligence_summary?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.hideArtificialIntelligenceSummary.enable.label)}
						onChange={setCheckboxOption("enable_hide_artificial_intelligence_summary")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.hideArtificialIntelligenceSummary.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_live_stream_chat?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.hideLiveStreamChat.enable.label)}
						onChange={setCheckboxOption("enable_hide_live_stream_chat")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.hideLiveStreamChat.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_translate_comment?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.hideTranslateComment.enable.label)}
						onChange={setCheckboxOption("enable_hide_translate_comment")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.hideTranslateComment.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_end_screen_cards?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.hideEndScreenCards.enable.label)}
						onChange={setCheckboxOption("enable_hide_end_screen_cards")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.hideEndScreenCards.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_end_screen_cards_button?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.hideEndScreenCardsButton.enable.label)}
						onChange={setCheckboxOption("enable_hide_end_screen_cards_button")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.hideEndScreenCardsButton.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_paid_promotion_banner?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.hidePaidPromotionBanner.enable.label)}
						onChange={setCheckboxOption("enable_hide_paid_promotion_banner")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.hidePaidPromotionBanner.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_official_artist_videos_from_home_page?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.hideOfficialArtistVideosFromHomePage.enable.label)}
						onChange={setCheckboxOption("enable_hide_official_artist_videos_from_home_page")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.hideOfficialArtistVideosFromHomePage.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_automatically_disable_closed_captions?.toString() === "true"}
						disabled={settings.enable_automatically_enable_closed_captions?.toString() === "true"}
						disabledReason={t((translations) => translations.pages.options.notifications.error.optionConflict, {
							OPTION: t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyEnableClosedCaptions.enable.label)
						})}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableClosedCaptions.enable.label)}
						onChange={setCheckboxOption("enable_automatically_disable_closed_captions")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableClosedCaptions.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_automatically_enable_closed_captions?.toString() === "true"}
						disabled={settings.enable_automatically_disable_closed_captions?.toString() === "true"}
						disabledReason={t((translations) => translations.pages.options.notifications.error.optionConflict, {
							OPTION: t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableClosedCaptions.enable.label)
						})}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyEnableClosedCaptions.enable.label)}
						onChange={setCheckboxOption("enable_automatically_enable_closed_captions")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyEnableClosedCaptions.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_playlist_recommendations_from_home_page?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.hidePlaylistRecommendationsFromHomePage.enable.label)}
						onChange={setCheckboxOption("enable_hide_playlist_recommendations_from_home_page")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.hidePlaylistRecommendationsFromHomePage.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_members_only_videos?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.hideMembersOnlyVideos.enable.label)}
						onChange={setCheckboxOption("enable_hide_members_only_videos")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.hideMembersOnlyVideos.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_automatically_disable_ambient_mode?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableAmbientMode.enable.label)}
						onChange={setCheckboxOption("enable_automatically_disable_ambient_mode")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableAmbientMode.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_default_to_original_audio_track?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.defaultToOriginalAudioTrack.enable.label)}
						onChange={setCheckboxOption("enable_default_to_original_audio_track")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.defaultToOriginalAudioTrack.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_restore_fullscreen_scrolling?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.restoreFullscreenScrolling.enable.label)}
						onChange={setCheckboxOption("enable_restore_fullscreen_scrolling")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.restoreFullscreenScrolling.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_save_to_watch_later_button?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.saveToWatchLaterButton.enable.label)}
						onChange={setCheckboxOption("enable_save_to_watch_later_button")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.saveToWatchLaterButton.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_automatically_show_more_videos_on_end_screen?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyShowMoreVideosOnEndScreen.enable.label)}
						onChange={setCheckboxOption("enable_automatically_show_more_videos_on_end_screen")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyShowMoreVideosOnEndScreen.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_sidebar_recommended_videos?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.hideSidebarRecommendedVideos.enable.label)}
						onChange={setCheckboxOption("enable_hide_sidebar_recommended_videos")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.hideSidebarRecommendedVideos.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_automatically_disable_autoplay?.toString() === "true"}
						label={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableAutoPlay.enable.label)}
						onChange={setCheckboxOption("enable_automatically_disable_autoplay")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.miscellaneous.settings.automaticallyDisableAutoPlay.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_timestamp_peek?.toString() === "true"}
						label={t("settings.sections.miscellaneous.settings.timestampPeek.enable.label")}
						onChange={setCheckboxOption("enable_timestamp_peek")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.settings.timestampPeek.enable.title")}
						type="checkbox"
					/>
				</SettingSection>
				<SettingSection title={t((translations) => translations.settings.sections.videoHistory.title)}>
					<SettingTitle />
					<Setting
						checked={settings.enable_video_history?.toString() === "true"}
						label={t((translations) => translations.settings.sections.videoHistory.enable.label)}
						onChange={setCheckboxOption("enable_video_history")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.videoHistory.enable.title)}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_video_history?.toString() !== "true"}
						id="video_history_resume_type"
						label={t((translations) => translations.settings.sections.videoHistory.settings.resumeType.select.label)}
						onChange={setValueOption("video_history_resume_type")}
						options={videoHistoryResumeTypeOptions}
						parentSetting={{
							type: "singular",
							value: (translations) => translations.settings.sections.videoHistory.enable.label
						}}
						selectedOption={getSelectedOption("video_history_resume_type")}
						title={t((translations) => translations.settings.sections.videoHistory.settings.resumeType.select.title)}
						type="select"
					/>
				</SettingSection>
				<SettingSection title={t((translations) => translations.settings.sections.onScreenDisplaySettings.title)}>
					<SettingTitle />
					<Setting
						disabled={isOSDDisabled}
						id="osd_display_color"
						label={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.label)}
						onChange={setValueOption("osd_display_color")}
						options={colorOptions}
						parentSetting={osdParentSetting}
						selectedOption={getSelectedOption("osd_display_color")}
						title={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.color.title)}
						type="select"
					/>
					<Setting
						disabled={isOSDDisabled}
						id="osd_display_type"
						label={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.type.label)}
						onChange={setValueOption("osd_display_type")}
						options={OSD_DisplayTypeOptions}
						parentSetting={osdParentSetting}
						selectedOption={getSelectedOption("osd_display_type")}
						title={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.type.title)}
						type="select"
					/>
					<Setting
						disabled={isOSDDisabled}
						id="osd_display_position"
						label={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.position.label)}
						onChange={setValueOption("osd_display_position")}
						options={OSD_PositionOptions}
						parentSetting={osdParentSetting}
						selectedOption={getSelectedOption("osd_display_position")}
						title={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.position.title)}
						type="select"
					/>
					<Setting
						disabled={isOSDDisabled}
						label={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.opacity.label)}
						max={100}
						min={1}
						onChange={setValueOption("osd_display_opacity")}
						parentSetting={osdParentSetting}
						title={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.opacity.title)}
						type="number"
						value={settings.osd_display_opacity}
					/>
					<Setting
						disabled={isOSDDisabled}
						label={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.hide.label)}
						min={1}
						onChange={setValueOption("osd_display_hide_time")}
						parentSetting={osdParentSetting}
						title={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.hide.title)}
						type="number"
						value={settings.osd_display_hide_time}
					/>
					<Setting
						disabled={isOSDDisabled}
						label={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.padding.label)}
						min={0}
						onChange={setValueOption("osd_display_padding")}
						parentSetting={osdParentSetting}
						title={t((translations) => translations.settings.sections.onScreenDisplaySettings.settings.padding.title)}
						type="number"
						value={settings.osd_display_padding}
					/>
				</SettingSection>
				<SettingSection title={t((translations) => translations.settings.sections.scrollWheelSpeedControl.title)}>
					<SettingTitle />
					<Setting
						checked={settings.enable_scroll_wheel_speed_control?.toString() === "true"}
						label={t((translations) => translations.settings.sections.scrollWheelSpeedControl.enable.label)}
						onChange={setCheckboxOption("enable_scroll_wheel_speed_control")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.scrollWheelSpeedControl.enable.title)}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_speed_control?.toString() !== "true"}
						id="scroll_wheel_speed_control_modifier_key"
						label={t((translations) => translations.settings.sections.scrollWheelSpeedControl.settings.modifierKey.select.label)}
						onChange={(value) => {
							const {
								currentTarget: { value: scrollWheelModifierKey }
							} = value;
							if (
								settings.enable_scroll_wheel_speed_control &&
								settings.enable_scroll_wheel_volume_control_hold_modifier_key &&
								settings.scroll_wheel_volume_control_modifier_key === scrollWheelModifierKey
							) {
								return addNotification(
									"error",
									(translations) => translations.pages.options.notifications.error.scrollWheelHoldModifierKey.sameKey.speedControl
								);
							}
							setValueOption("scroll_wheel_speed_control_modifier_key")(value);
						}}
						options={scrollWheelControlModifierKeyOptions}
						parentSetting={scrollWheelSpeedControlParentSetting}
						selectedOption={getSelectedOption("scroll_wheel_speed_control_modifier_key")}
						title={t((translations) => translations.settings.sections.scrollWheelSpeedControl.settings.modifierKey.select.title)}
						type="select"
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_speed_control?.toString() !== "true"}
						label={t((translations) => translations.settings.sections.scrollWheelSpeedControl.settings.adjustmentSteps.label)}
						max={1}
						min={0.05}
						onChange={setValueOption("speed_adjustment_steps")}
						parentSetting={scrollWheelSpeedControlParentSetting}
						step={0.05}
						title={t((translations) => translations.settings.sections.scrollWheelSpeedControl.settings.adjustmentSteps.title)}
						type="number"
						value={settings.speed_adjustment_steps}
					/>
				</SettingSection>
				<SettingSection title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.title)}>
					<SettingTitle />
					<Setting
						checked={settings.enable_scroll_wheel_volume_control?.toString() === "true"}
						label={t((translations) => translations.settings.sections.scrollWheelVolumeControl.enable.label)}
						onChange={setCheckboxOption("enable_scroll_wheel_volume_control")}
						parentSetting={scrollWheelVolumeControlParentSetting}
						title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_scroll_wheel_volume_control_hold_modifier_key?.toString() === "true"}
						label={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdModifierKey.label)}
						onChange={setCheckboxOption("enable_scroll_wheel_volume_control_hold_modifier_key")}
						parentSetting={scrollWheelVolumeControlParentSetting}
						title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdModifierKey.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_scroll_wheel_volume_control_hold_right_click?.toString() === "true"}
						label={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdRightClick.label)}
						onChange={setCheckboxOption("enable_scroll_wheel_volume_control_hold_right_click")}
						parentSetting={scrollWheelVolumeControlParentSetting}
						title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdRightClick.title)}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_volume_control_hold_modifier_key?.toString() !== "true"}
						id="scroll_wheel_volume_control_modifier_key"
						label={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdModifierKey.select.label)}
						onChange={(value) => {
							const {
								currentTarget: { value: scrollWheelModifierKey }
							} = value;
							if (
								settings.enable_scroll_wheel_speed_control &&
								settings.enable_scroll_wheel_volume_control_hold_modifier_key &&
								settings.scroll_wheel_speed_control_modifier_key === scrollWheelModifierKey
							) {
								return addNotification(
									"error",
									(translations) => translations.pages.options.notifications.error.scrollWheelHoldModifierKey.sameKey.volumeControl
								);
							}
							setValueOption("scroll_wheel_volume_control_modifier_key")(value);
						}}
						options={scrollWheelControlModifierKeyOptions}
						parentSetting={scrollWheelVolumeControlParentSetting}
						selectedOption={getSelectedOption("scroll_wheel_volume_control_modifier_key")}
						title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.holdModifierKey.select.title)}
						type="select"
					/>
					<Setting
						disabled={settings.enable_scroll_wheel_volume_control?.toString() !== "true"}
						label={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.adjustmentSteps.label)}
						min={1}
						onChange={setValueOption("volume_adjustment_steps")}
						parentSetting={scrollWheelVolumeControlParentSetting}
						title={t((translations) => translations.settings.sections.scrollWheelVolumeControl.settings.adjustmentSteps.title)}
						type="number"
						value={settings.volume_adjustment_steps}
					/>
				</SettingSection>
				<SettingSection title={t((translations) => translations.settings.sections.playerQuality.title)}>
					<SettingTitle />
					<Setting
						checked={settings.enable_automatically_set_quality?.toString() === "true"}
						label={t((translations) => translations.settings.sections.playerQuality.enable.label)}
						onChange={setCheckboxOption("enable_automatically_set_quality")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.playerQuality.enable.title)}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_automatically_set_quality?.toString() !== "true"}
						id="player_quality"
						label={t((translations) => translations.settings.sections.playerQuality.settings.quality.select.label)}
						onChange={setValueOption("player_quality")}
						options={YouTubePlayerQualityOptions}
						parentSetting={automaticQualityParentSetting}
						selectedOption={getSelectedOption("player_quality")}
						title={t((translations) => translations.settings.sections.playerQuality.settings.quality.select.title)}
						type="select"
					/>
					<Setting
						disabled={settings.enable_automatically_set_quality?.toString() !== "true"}
						id="player_quality_fallback_strategy"
						label={t((translations) => translations.settings.sections.playerQuality.settings.qualityFallbackStrategy.select.label)}
						onChange={setValueOption("player_quality_fallback_strategy")}
						options={PlayerQualityFallbackStrategyOptions}
						parentSetting={automaticQualityParentSetting}
						selectedOption={getSelectedOption("player_quality_fallback_strategy")}
						title={t((translations) => translations.settings.sections.playerQuality.settings.qualityFallbackStrategy.select.title)}
						type="select"
					/>
				</SettingSection>
				<SettingSection title={t((translations) => translations.settings.sections.playerSpeed.title)}>
					<SettingTitle />
					<Setting
						checked={settings.enable_forced_playback_speed?.toString() === "true"}
						label={t((translations) => translations.settings.sections.playerSpeed.enable.label)}
						onChange={setCheckboxOption("enable_forced_playback_speed")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.playerSpeed.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_playback_speed_buttons?.toString() === "true"}
						label={t((translations) => translations.settings.sections.playerSpeed.settings.buttons.label)}
						onChange={setCheckboxOption("enable_playback_speed_buttons")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.playerSpeed.settings.buttons.title)}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_forced_playback_speed?.toString() !== "true"}
						label={t((translations) => translations.settings.sections.playerSpeed.settings.speed.select.label)}
						max={youtubePlayerMaxSpeed}
						min={youtubePlayerSpeedStep}
						onChange={setValueOption("player_speed")}
						parentSetting={{
							type: "singular",
							value: (translations) => translations.settings.sections.playerSpeed.enable.label
						}}
						step={youtubePlayerSpeedStep}
						title={t((translations) => translations.settings.sections.playerSpeed.settings.speed.select.title)}
						type="number"
						value={settings.player_speed}
					/>
					<Setting
						disabled={settings.enable_playback_speed_buttons?.toString() !== "true"}
						label={t((translations) => translations.settings.sections.playerSpeed.settings.buttons.select.label)}
						max={1}
						min={youtubePlayerSpeedStep}
						onChange={setValueOption("playback_buttons_speed")}
						parentSetting={{
							type: "singular",
							value: (translations) => translations.settings.sections.playerSpeed.settings.buttons.label
						}}
						step={youtubePlayerSpeedStep}
						title={t((translations) => translations.settings.sections.playerSpeed.settings.buttons.select.title)}
						type="number"
						value={settings.playback_buttons_speed}
					/>
				</SettingSection>
				<SettingSection title={t((translations) => translations.settings.sections.volumeBoost.title)}>
					<SettingTitle />
					<Setting
						checked={settings.enable_volume_boost?.toString() === "true"}
						label={t((translations) => translations.settings.sections.volumeBoost.enable.label)}
						onChange={setCheckboxOption("enable_volume_boost")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.volumeBoost.enable.title)}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_volume_boost?.toString() !== "true"}
						id="volume_boost_mode"
						label={t((translations) => translations.settings.sections.volumeBoost.settings.mode.select.label)}
						onChange={setValueOption("volume_boost_mode")}
						options={VolumeBoostModeOptions}
						parentSetting={volumeBoostParentSetting}
						selectedOption={getSelectedOption("volume_boost_mode")}
						title={t((translations) => translations.settings.sections.volumeBoost.settings.mode.select.title)}
						type="select"
					/>
					<Setting
						disabled={settings.enable_volume_boost?.toString() !== "true"}
						label={t((translations) => translations.settings.sections.volumeBoost.settings.amount.label)}
						max={100}
						min={1}
						onChange={setValueOption("volume_boost_amount")}
						parentSetting={volumeBoostParentSetting}
						title={t((translations) => translations.settings.sections.volumeBoost.settings.amount.title)}
						type="number"
						value={settings.volume_boost_amount}
					/>
				</SettingSection>
				<SettingSection title={t((translations) => translations.settings.sections.playlistManagementButtons.title)}>
					<SettingTitle />
					<Setting
						checked={settings.enable_playlist_remove_button?.toString() === "true"}
						label={t((translations) => translations.settings.sections.playlistManagementButtons.settings.removeVideoButton.enable.label)}
						onChange={setCheckboxOption("enable_playlist_remove_button")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.playlistManagementButtons.settings.removeVideoButton.enable.title)}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_playlist_reset_button?.toString() === "true"}
						label={t((translations) => translations.settings.sections.playlistManagementButtons.settings.markAsUnwatchedButton.enable.label)}
						onChange={setCheckboxOption("enable_playlist_reset_button")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.playlistManagementButtons.settings.markAsUnwatchedButton.enable.title)}
						type="checkbox"
					/>
				</SettingSection>
				<SettingSection title={t((translations) => translations.settings.sections.screenshotButton.title)}>
					<SettingTitle />
					<Setting
						checked={settings.enable_screenshot_button?.toString() === "true"}
						label={t((translations) => translations.settings.sections.screenshotButton.enable.label)}
						onChange={setCheckboxOption("enable_screenshot_button")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.screenshotButton.enable.title)}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_screenshot_button?.toString() !== "true"}
						id="screenshot_save_as"
						label={t((translations) => translations.settings.sections.screenshotButton.settings.saveAs.select.label)}
						onChange={setValueOption("screenshot_save_as")}
						options={ScreenshotSaveAsOptions}
						parentSetting={screenshotButtonParentSetting}
						selectedOption={getSelectedOption("screenshot_save_as")}
						title={t((translations) => translations.settings.sections.screenshotButton.settings.saveAs.select.label)}
						type="select"
					/>
					<Setting
						disabled={settings.enable_screenshot_button?.toString() !== "true" || settings.screenshot_save_as?.toString() === "clipboard"}
						id="screenshot_format"
						label={t((translations) => translations.settings.sections.screenshotButton.settings.format.label)}
						onChange={setValueOption("screenshot_format")}
						options={ScreenshotFormatOptions}
						parentSetting={
							settings.enable_screenshot_button?.toString() === "true" && settings.screenshot_save_as?.toString() === "clipboard" ?
								screenshotButtonSaveAsClipboardParentSetting
							:	screenshotButtonParentSetting
						}
						selectedOption={getSelectedOption("screenshot_format")}
						title={t((translations) => translations.settings.sections.screenshotButton.settings.format.title)}
						type="select"
					/>
				</SettingSection>
				<SettingSection title={t((translations) => translations.settings.sections.forwardRewindButtons.title)}>
					<SettingTitle />
					<Setting
						checked={settings.enable_forward_rewind_buttons?.toString() === "true"}
						label={t((translations) => translations.settings.sections.forwardRewindButtons.enable.label)}
						onChange={setCheckboxOption("enable_forward_rewind_buttons")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.forwardRewindButtons.enable.title)}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_forward_rewind_buttons?.toString() !== "true"}
						label={t((translations) => translations.settings.sections.forwardRewindButtons.settings.time.label)}
						onChange={setValueOption("forward_rewind_buttons_time")}
						parentSetting={{
							type: "singular",
							value: (translations) => translations.settings.sections.forwardRewindButtons.enable.label
						}}
						title={t((translations) => translations.settings.sections.forwardRewindButtons.settings.time.title)}
						type="number"
						value={settings.forward_rewind_buttons_time}
					/>
				</SettingSection>
				<SettingSection title={t((translations) => translations.settings.sections.playlistLength.title)}>
					<SettingTitle />
					<Setting
						checked={settings.enable_playlist_length?.toString() === "true"}
						label={t((translations) => translations.settings.sections.playlistLength.enable.label)}
						onChange={setCheckboxOption("enable_playlist_length")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.playlistLength.enable.title)}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_playlist_length?.toString() !== "true"}
						id="playlist_length_get_method"
						label={t((translations) => translations.settings.sections.playlistLength.settings.wayToGetLength.select.label)}
						onChange={setValueOption("playlist_length_get_method")}
						options={playlistLengthGetMethodOptions}
						parentSetting={playlistLengthParentSetting}
						selectedOption={getSelectedOption("playlist_length_get_method")}
						title={t((translations) => translations.settings.sections.playlistLength.settings.wayToGetLength.select.title)}
						type="select"
					/>
					<Setting
						disabled={settings.enable_playlist_length?.toString() !== "true"}
						id="playlist_watch_time_get_method"
						label={t((translations) => translations.settings.sections.playlistLength.settings.wayToGetWatchTime.select.label)}
						onChange={setValueOption("playlist_watch_time_get_method")}
						options={playlistWatchTimeGetMethodOptions}
						parentSetting={playlistLengthParentSetting}
						selectedOption={getSelectedOption("playlist_watch_time_get_method")}
						title={t((translations) => translations.settings.sections.playlistLength.settings.wayToGetWatchTime.select.title)}
						type="select"
					/>
				</SettingSection>
				<SettingSection title={t((translations) => translations.settings.sections.deepDarkCSS.title)}>
					<SettingTitle />
					<fieldset className={cn("flex flex-row gap-1")}>
						<fieldset className={cn("flex flex-row gap-1")}>
							<legend className="mb-1 text-lg sm:text-xl md:text-2xl">
								{t((translations) => translations.settings.sections.deepDarkCSS.extras.author)}
							</legend>
							<Link href="https://github.com/RaitaroH">RaitaroH</Link>
						</fieldset>
						<fieldset className={cn("flex flex-row gap-1")}>
							<legend className="mb-1 text-lg sm:text-xl md:text-2xl">
								{t((translations) => translations.settings.sections.deepDarkCSS.extras["co-authors"])}
							</legend>
							<Link href="https://github.com/MechaLynx">MechaLynx</Link>
						</fieldset>
					</fieldset>
					<Setting
						checked={settings.enable_deep_dark_theme?.toString() === "true"}
						label={t((translations) => translations.settings.sections.deepDarkCSS.enable.label)}
						onChange={setCheckboxOption("enable_deep_dark_theme")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.deepDarkCSS.enable.title)}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_deep_dark_theme?.toString() === "false"}
						id="deep_dark_preset"
						label={t((translations) => translations.settings.sections.deepDarkCSS.settings.theme.select.label)}
						onChange={setValueOption("deep_dark_preset")}
						options={deepDarkCSSThemeOptions}
						parentSetting={{
							type: "singular",
							value: (translations) => translations.settings.sections.deepDarkCSS.enable.label
						}}
						selectedOption={getSelectedOption("deep_dark_preset")}
						title={t((translations) => translations.settings.sections.deepDarkCSS.settings.theme.select.title)}
						type="select"
					/>
					{isDeepDarkThemeCustom && (
						<>
							<Setting
								disabled={isDeepDarkThemeDisabled}
								label={t((translations) => translations.settings.sections.deepDarkCSS.settings.mainColor.label)}
								onChange={setValueOption("deep_dark_custom_theme_colors.mainColor")}
								parentSetting={deepDarkThemeColorPickerParentSetting}
								title={t((translations) => translations.settings.sections.deepDarkCSS.settings.mainColor.title)}
								type="color-picker"
								value={settings.deep_dark_custom_theme_colors.mainColor}
							/>
							<Setting
								disabled={isDeepDarkThemeDisabled}
								label={t((translations) => translations.settings.sections.deepDarkCSS.settings.mainBackground.label)}
								onChange={setValueOption("deep_dark_custom_theme_colors.mainBackground")}
								parentSetting={deepDarkThemeColorPickerParentSetting}
								title={t((translations) => translations.settings.sections.deepDarkCSS.settings.mainBackground.title)}
								type="color-picker"
								value={settings.deep_dark_custom_theme_colors.mainBackground}
							/>
							<Setting
								disabled={isDeepDarkThemeDisabled}
								label={t((translations) => translations.settings.sections.deepDarkCSS.settings.secondBackground.label)}
								onChange={setValueOption("deep_dark_custom_theme_colors.secondBackground")}
								parentSetting={deepDarkThemeColorPickerParentSetting}
								title={t((translations) => translations.settings.sections.deepDarkCSS.settings.secondBackground.title)}
								type="color-picker"
								value={settings.deep_dark_custom_theme_colors.secondBackground}
							/>
							<Setting
								disabled={isDeepDarkThemeDisabled}
								label={t((translations) => translations.settings.sections.deepDarkCSS.settings.hoverBackground.label)}
								onChange={setValueOption("deep_dark_custom_theme_colors.hoverBackground")}
								parentSetting={deepDarkThemeColorPickerParentSetting}
								title={t((translations) => translations.settings.sections.deepDarkCSS.settings.hoverBackground.title)}
								type="color-picker"
								value={settings.deep_dark_custom_theme_colors.hoverBackground}
							/>
							<Setting
								disabled={isDeepDarkThemeDisabled}
								label={t((translations) => translations.settings.sections.deepDarkCSS.settings.mainText.label)}
								onChange={setValueOption("deep_dark_custom_theme_colors.mainText")}
								parentSetting={deepDarkThemeColorPickerParentSetting}
								title={t((translations) => translations.settings.sections.deepDarkCSS.settings.mainText.title)}
								type="color-picker"
								value={settings.deep_dark_custom_theme_colors.mainText}
							/>
							<Setting
								disabled={isDeepDarkThemeDisabled}
								label={t((translations) => translations.settings.sections.deepDarkCSS.settings.dimmerText.label)}
								onChange={setValueOption("deep_dark_custom_theme_colors.dimmerText")}
								parentSetting={deepDarkThemeColorPickerParentSetting}
								title={t((translations) => translations.settings.sections.deepDarkCSS.settings.dimmerText.title)}
								type="color-picker"
								value={settings.deep_dark_custom_theme_colors.dimmerText}
							/>
							<Setting
								disabled={isDeepDarkThemeDisabled}
								label={t((translations) => translations.settings.sections.deepDarkCSS.settings.colorShadow.label)}
								onChange={setValueOption("deep_dark_custom_theme_colors.colorShadow")}
								parentSetting={deepDarkThemeColorPickerParentSetting}
								title={t((translations) => translations.settings.sections.deepDarkCSS.settings.colorShadow.title)}
								type="color-picker"
								value={settings.deep_dark_custom_theme_colors.colorShadow}
							/>
						</>
					)}
				</SettingSection>
				<SettingSection title={t((translations) => translations.settings.sections.customCSS.title)}>
					<SettingTitle />
					<Setting
						checked={settings.enable_custom_css?.toString() === "true"}
						label={t((translations) => translations.settings.sections.customCSS.enable.label)}
						onChange={setCheckboxOption("enable_custom_css")}
						parentSetting={null}
						title={t((translations) => translations.settings.sections.customCSS.enable.title)}
						type="checkbox"
					/>
					<Setting
						alwaysVisible
						disabled={settings.enable_custom_css?.toString() !== "true"}
						onChange={(value) => {
							if (value !== undefined) {
								setValueOption("custom_css_code")({ currentTarget: { value } } as ChangeEvent<HTMLInputElement>);
							}
						}}
						parentSetting={{
							type: "singular",
							value: (translations) => translations.settings.sections.customCSS.enable.label
						}}
						type="css-editor"
						value={settings.custom_css_code}
					/>
				</SettingSection>
				{!isPopup && canScroll && (
					<div
						className="z-100 fixed bottom-0 right-0 mb-4 mr-4 flex justify-between gap-1 bg-[#f5f5f5] p-2 dark:bg-[#181a1b]"
						title={t((translations) => translations.pages.options.extras.scrollForMoreSettings)}
					>
						<MdOutlineExpandMore className="h-10 w-10 text-gray-500 dark:text-gray-300" />
					</div>
				)}
				<div className="sticky bottom-0 left-0 z-10 flex justify-between gap-1 bg-[#f5f5f5] p-2 dark:bg-[#181a1b]">
					<input
						className="danger p-2 text-sm sm:text-base md:text-lg dark:hover:bg-[rgba(24,26,27,0.5)]"
						id="clear_data_button"
						onClick={clearData}
						title={t((translations) => translations.pages.options.extras.bottomButtons.clear.title)}
						type="button"
						value={t((translations) => translations.pages.options.extras.bottomButtons.clear.value)}
					/>
					<input
						className="accent p-2 text-sm sm:text-base md:text-lg dark:hover:bg-[rgba(24,26,27,0.5)]"
						id="import_settings_button"
						onClick={importSettings}
						title={t((translations) => translations.pages.options.extras.importExportSettings.importButton.title)}
						type="button"
						value={t((translations) => translations.pages.options.extras.importExportSettings.importButton.value)}
					/>
					{isPopup && (
						<button
							className="accent flex items-center justify-center p-2 text-sm sm:text-base md:text-lg dark:hover:bg-[rgba(24,26,27,0.5)]"
							id="openinnewtab_button"
							onClick={() => openInNewTab("src/pages/options/index.html")}
							title={t((translations) => translations.pages.options.extras.bottomButtons.openTab.title)}
							type="button"
						>
							<MdOutlineOpenInNew color="white" size={20} />
						</button>
					)}
					<input
						className="accent p-2 text-sm sm:text-base md:text-lg dark:hover:bg-[rgba(24,26,27,0.5)]"
						id="export_settings_button"
						onClick={exportSettings}
						title={t((translations) => translations.pages.options.extras.importExportSettings.exportButton.title)}
						type="button"
						value={t((translations) => translations.pages.options.extras.importExportSettings.exportButton.value)}
					/>
					{notifications.filter((n) => n.action === "reset_settings").length > 0 ?
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

								addNotification("success", (translations) => translations.pages.options.notifications.success.saved);
							}}
							title={t((translations) => translations.pages.options.extras.bottomButtons.confirm.title)}
							type="button"
							value={t((translations) => translations.pages.options.extras.bottomButtons.confirm.value)}
						/>
					:	<input
							className="warning p-2 text-sm sm:text-base md:text-lg dark:hover:bg-[rgba(24,26,27,0.5)]"
							id="reset_button"
							onClick={resetOptions}
							title={t((translations) => translations.pages.options.extras.bottomButtons.reset.title)}
							type="button"
							value={t((translations) => translations.pages.options.extras.bottomButtons.reset.value)}
						/>
					}
					{isPopup && canScroll && (
						<div
							className="w-10items-center flex h-10 justify-center"
							title={t((translations) => translations.pages.options.extras.scrollForMoreSettings)}
						>
							<MdOutlineExpandMore className="h-10 w-10 text-gray-500 dark:text-gray-300" />
						</div>
					)}
				</div>
				<SettingsNotifications />
				<input accept=".json" hidden={true} id="import_settings_input" onChange={settingsImportChange} ref={settingsImportRef} type="file" />
			</div>
		</SettingsContext.Provider>
	);
}
async function fetchSettings() {
	try {
		const settings = await getSettings();
		return settings;
	} catch (error) {
		console.error("Failed to get settings:", error);
		throw new Error("Failed to fetch settings");
	}
}
async function getLanguageOptions() {
	const promises = availableLocales.map(async (locale) => {
		try {
			const response = await fetch(`${chrome.runtime.getURL("")}locales/${locale}.json`);
			const localeData = await response.json();
			const languageOption: SelectOption<"language"> = {
				label: `${(localeData as EnUS).langName} (${localePercentages[locale] ?? 0}%)`,
				value: locale
			};
			return Promise.resolve(languageOption);
		} catch (err) {
			return Promise.reject(err);
		}
	});

	const results = await Promise.allSettled(promises);

	const languageOptions: SelectOption<"language">[] = results
		.filter((result): result is PromiseFulfilledResult<SelectOption<"language">> => result.status === "fulfilled")
		.map((result) => result.value);

	return languageOptions;
}
function getSettings(): Promise<configuration> {
	return new Promise((resolve, reject) => {
		void chrome.storage.local.get<configuration>((settings) => {
			try {
				const storedSettings: Partial<configuration> = (
					Object.keys(settings)
						.filter((key) => typeof key === "string")
						.filter((key) => Object.keys(defaultSettings).includes(key as unknown as string)) as configurationKeys[]
				).reduce((acc, key) => Object.assign(acc, { [key]: parseStoredValue(settings[key] as string) }), {});
				const castedSettings = storedSettings as configuration;
				resolve(castedSettings);
			} catch (error) {
				reject(error);
			}
		});
	});
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
	const [languageOptions, setLanguageOptions] = useState<SelectOption<"language">[]>([]);
	const [languagesLoading, setLanguagesLoading] = useState(true);
	useEffect(() => {
		void (async () => {
			try {
				const languages = await getLanguageOptions();
				setLanguageOptions(languages);
				setLanguagesLoading(false);
			} catch (_) {
				setLanguagesLoading(false);
			}
		})();
	}, []);
	return (
		<SettingSection title={t((translations) => translations.pages.options.extras.language.title)}>
			<SettingTitle />
			<Setting
				disabled={false}
				id="language"
				label={t((translations) => translations.pages.options.extras.language.select.label)}
				loading={languagesLoading}
				onChange={setValueOption("language")}
				options={languageOptions}
				parentSetting={null}
				selectedOption={selectedLanguage}
				title={t((translations) => translations.pages.options.extras.language.select.title)}
				type="select"
			/>
		</SettingSection>
	);
}
async function setSettings(settings: configuration) {
	for (const key of Object.keys(settings)) {
		if (typeof settings[key] !== "string") {
			localStorage.setItem(key, JSON.stringify(settings[key]));
			await chrome.storage.local.set({ [key]: JSON.stringify(settings[key]) });
		} else {
			localStorage.setItem(key, settings[key]);
			await chrome.storage.local.set({ [key]: settings[key] });
		}
	}
}
export const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);
export const useSettings = () => {
	const context = useContext(SettingsContext);
	if (context === undefined) {
		throw new Error("useSettings must be used within a SettingsProvider");
	}
	return context;
};
