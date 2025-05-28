/* eslint-disable tailwindcss/enforces-shorthand */
import type { AllButtonNames, configuration, configurationKeys, Nullable, Path } from "@/src/types";
import type { ClassValue } from "clsx";
import type EnUS from "public/locales/en-US.json";
import type { ChangeEvent, ChangeEventHandler } from "react";

import "@/assets/styles/tailwind.css";
import "@/components/Settings/Settings.css";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, Suspense, useContext, useEffect, useRef, useState } from "react";
import { MdOutlineOpenInNew } from "react-icons/md";
import { generateErrorMessage } from "zod-error";

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
			addNotification("success", "pages.options.notifications.success.saved");
		}
	});
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
					localStorage.setItem(key, defaultSettings[key]);
					void chrome.storage.local.set({ [key]: defaultSettings[key] });
				}
			}
			addNotification("success", "settings.clearData.allDataDeleted");
		}
	}
	const scrollWheelControlModifierKeyOptions: SelectOption<"scroll_wheel_speed_control_modifier_key" | "scroll_wheel_volume_control_modifier_key">[] =
		[
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
		];
	const colorDotClassName: ClassValue = "m-2 w-3 h-3 rounded-[50%] border-DEFAULT border-solid border-black";
	const colorOptions: SelectOption<"osd_display_color">[] = [
		{
			element: <div className={cn(colorDotClassName, "bg-[red]")}></div>,
			label: t("settings.sections.onScreenDisplaySettings.color.options.red"),
			value: "red"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[green]")}></div>,
			label: t("settings.sections.onScreenDisplaySettings.color.options.green"),
			value: "green"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[blue]")}></div>,
			label: t("settings.sections.onScreenDisplaySettings.color.options.blue"),
			value: "blue"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[yellow]")}></div>,
			label: t("settings.sections.onScreenDisplaySettings.color.options.yellow"),
			value: "yellow"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[orange]")}></div>,
			label: t("settings.sections.onScreenDisplaySettings.color.options.orange"),
			value: "orange"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[purple]")}></div>,
			label: t("settings.sections.onScreenDisplaySettings.color.options.purple"),
			value: "purple"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[pink]")}></div>,
			label: t("settings.sections.onScreenDisplaySettings.color.options.pink"),
			value: "pink"
		},
		{
			element: <div className={cn(colorDotClassName, "bg-[white]")}></div>,
			label: t("settings.sections.onScreenDisplaySettings.color.options.white"),
			value: "white"
		}
	];
	const OSD_DisplayTypeOptions: SelectOption<"osd_display_type">[] = [
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
			label: t("settings.sections.onScreenDisplaySettings.type.options.circle"),
			value: "circle"
		}
	];
	const OSD_PositionOptions: SelectOption<"osd_display_position">[] = [
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
			label: t("settings.sections.automaticQuality.fallbackQualityStrategy.select.options.higher"),
			value: "higher"
		},
		{
			label: t("settings.sections.automaticQuality.fallbackQualityStrategy.select.options.lower"),
			value: "lower"
		}
	] as SelectOption<"player_quality_fallback_strategy">[];
	const ScreenshotFormatOptions: SelectOption<"screenshot_format">[] = [
		{ label: "PNG", value: "png" },
		{ label: "JPEG", value: "jpeg" },
		{ label: "WebP", value: "webp" }
	];
	const ScreenshotSaveAsOptions: SelectOption<"screenshot_save_as">[] = [
		{ label: t("settings.sections.screenshotButton.saveAs.file"), value: "file" },
		{ label: t("settings.sections.screenshotButton.saveAs.clipboard"), value: "clipboard" }
	];
	const VolumeBoostModeOptions: SelectOption<"volume_boost_mode">[] = [
		{
			label: t("settings.sections.volumeBoost.mode.select.options.global"),
			value: "global"
		},
		{
			label: t("settings.sections.volumeBoost.mode.select.options.perVideo"),
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
	];
	const videoHistoryResumeTypeOptions: SelectOption<"video_history_resume_type">[] = [
		{
			label: t("settings.sections.videoHistory.resumeType.select.options.automatic"),
			value: "automatic"
		},
		{
			label: t("settings.sections.videoHistory.resumeType.select.options.prompt"),
			value: "prompt"
		}
	];
	const youtubeDeepDarkThemeOptions: SelectOption<"deep_dark_preset">[] = deepDarkPreset.map((value) => {
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
			label: t("settings.sections.playlistLength.wayToGetWatchTime.select.options.duration"),
			value: "duration"
		},
		{
			label: t("settings.sections.playlistLength.wayToGetWatchTime.select.options.youtube"),
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
						const errorMessage = generateErrorMessage(error.errors);
						window.alert(
							t("settings.sections.importExportSettings.importButton.error.validation", {
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
						addNotification("success", "settings.sections.importExportSettings.importButton.success");
					}
				} catch (_) {
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
			addNotification("success", "settings.sections.importExportSettings.exportButton.success");
		}
	};
	const isPopup = window.location.href.match(/.+\/src\/pages\/popup\/index\.html/g);
	const openInNewTab = (path: string) => {
		const url = chrome.runtime.getURL(path);
		void chrome.tabs.create({ url });
	};
	const isOSDDisabled =
		settings.enable_scroll_wheel_volume_control?.toString() !== "true" &&
		settings.enable_scroll_wheel_speed_control?.toString() !== "true" &&
		settings.enable_playback_speed_buttons?.toString() !== "true";
	const isDeepDarkThemeDisabled = settings.enable_deep_dark_theme?.toString() !== "true";
	const isDeepDarkThemeCustom = settings.deep_dark_preset === "Custom";
	const isDeepDarkThemeColorPickerDisabled = isDeepDarkThemeDisabled || (!isDeepDarkThemeDisabled && !isDeepDarkThemeCustom);
	const deepDarkThemeColorPickerParentSetting = (
		(isDeepDarkThemeDisabled && !isDeepDarkThemeCustom) || (isDeepDarkThemeDisabled && isDeepDarkThemeCustom) ?
			{
				type: "singular",
				value: "settings.sections.youtubeDeepDark.enable.label"
			}
		:	{
				type: "specificOption",
				value: "settings.optionDisabled.specificOption.deepDarkCustomTheme"
			}) satisfies parentSetting;
	const osdParentSetting = {
		type: "either",
		value: ["settings.sections.scrollWheelVolumeControl.enable.label", "settings.sections.scrollWheelSpeedControl.enable.label"]
	} satisfies parentSetting;
	const scrollWheelSpeedControlParentSetting = {
		type: "singular",
		value: "settings.sections.scrollWheelSpeedControl.enable.label"
	} satisfies parentSetting;
	const scrollWheelVolumeControlParentSetting = {
		type: "singular",
		value: "settings.sections.scrollWheelVolumeControl.enable.label"
	} satisfies parentSetting;
	const automaticQualityParentSetting = {
		type: "singular",
		value: "settings.sections.automaticQuality.enable.label"
	} satisfies parentSetting;
	const volumeBoostParentSetting = {
		type: "singular",
		value: "settings.sections.volumeBoost.enable.label"
	} satisfies parentSetting;
	const screenshotButtonParentSetting = {
		type: "singular",
		value: "settings.sections.screenshotButton.enable.label"
	} satisfies parentSetting;
	const playlistLengthParentSetting = {
		type: "singular",
		value: "settings.sections.playlistLength.enable.label"
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
				<Suspense fallback={<Loader />}>
					<LanguageOptions selectedLanguage={settings["language"]} setValueOption={setValueOption} t={i18nInstance.t} />
				</Suspense>
				<SettingSection title={t("settings.sections.featureMenu.openType.title")}>
					<SettingTitle />
					<Setting
						disabled={Object.values(settings.button_placements).every((v) => v !== "feature_menu")}
						id="feature_menu_open_type"
						label={t("settings.sections.featureMenu.openType.select.label")}
						onChange={setValueOption("feature_menu_open_type")}
						options={[
							{ label: t("settings.sections.featureMenu.openType.select.options.hover"), value: "hover" },
							{ label: t("settings.sections.featureMenu.openType.select.options.click"), value: "click" }
						]}
						parentSetting={{
							type: "specificOption",
							value: "settings.optionDisabled.specificOption.featureMenu"
						}}
						selectedOption={getSelectedOption("feature_menu_open_type")}
						title={t("settings.sections.featureMenu.openType.select.title")}
						type="select"
					/>
				</SettingSection>
				<SettingSection title={t("settings.sections.buttonPlacement.title")}>
					<SettingTitle />
					{buttonNames.map((feature) => {
						const label = t(`settings.sections.buttonPlacement.select.buttonNames.${feature}`);
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
									value: `settings.sections.buttonPlacement.select.buttonNames.${feature}`
								}}
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
				<SettingSection title={t("settings.sections.miscellaneous.title")}>
					<SettingTitle />
					<Setting
						checked={settings.enable_remember_last_volume?.toString() === "true"}
						id="enable_remember_last_volume"
						label={t("settings.sections.miscellaneous.features.rememberLastVolume.label")}
						onChange={setCheckboxOption("enable_remember_last_volume")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.rememberLastVolume.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_maximize_player_button?.toString() === "true"}
						id="enable_maximize_player_button"
						label={t("settings.sections.miscellaneous.features.maximizePlayerButton.label")}
						onChange={setCheckboxOption("enable_maximize_player_button")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.maximizePlayerButton.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_remaining_time?.toString() === "true"}
						id="enable_remaining_time"
						label={t("settings.sections.miscellaneous.features.remainingTime.label")}
						onChange={setCheckboxOption("enable_remaining_time")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.remainingTime.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_pausing_background_players?.toString() === "true"}
						id="enable_pausing_background_players"
						label={t("settings.sections.miscellaneous.features.pauseBackgroundPlayers.label")}
						onChange={setCheckboxOption("enable_pausing_background_players")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.pauseBackgroundPlayers.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_loop_button?.toString() === "true"}
						id="enable_loop_button"
						label={t("settings.sections.miscellaneous.features.loopButton.label")}
						onChange={setCheckboxOption("enable_loop_button")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.loopButton.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_copy_timestamp_url_button?.toString() === "true"}
						id="enable_copy_timestamp_url_button"
						label={t("settings.sections.miscellaneous.features.copyTimestampUrlButton.label")}
						onChange={setCheckboxOption("enable_copy_timestamp_url_button")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.copyTimestampUrlButton.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_scrollbar?.toString() === "true"}
						id="enable_hide_scrollbar"
						label={t("settings.sections.miscellaneous.features.hideScrollbar.label")}
						onChange={setCheckboxOption("enable_hide_scrollbar")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.hideScrollbar.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_automatic_theater_mode?.toString() === "true"}
						id="enable_automatic_theater_mode"
						label={t("settings.sections.miscellaneous.features.automaticTheaterMode.label")}
						onChange={setCheckboxOption("enable_automatic_theater_mode")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.automaticTheaterMode.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_open_transcript_button?.toString() === "true"}
						id="enable_open_transcript_button"
						label={t("settings.sections.miscellaneous.features.openTranscriptButton.label")}
						onChange={setCheckboxOption("enable_open_transcript_button")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.openTranscriptButton.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_open_youtube_settings_on_hover?.toString() === "true"}
						id="enable_open_youtube_settings_on_hover"
						label={t("settings.sections.miscellaneous.features.openYouTubeSettingsOnHover.label")}
						onChange={setCheckboxOption("enable_open_youtube_settings_on_hover")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.openYouTubeSettingsOnHover.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_redirect_remover?.toString() === "true"}
						id="enable_redirect_remover"
						label={t("settings.sections.miscellaneous.features.removeRedirect.label")}
						onChange={setCheckboxOption("enable_redirect_remover")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.removeRedirect.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_share_shortener?.toString() === "true"}
						id="enable_share_shortener"
						label={t("settings.sections.miscellaneous.features.shareShortener.label")}
						onChange={setCheckboxOption("enable_share_shortener")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.shareShortener.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_skip_continue_watching?.toString() === "true"}
						id="enable_skip_continue_watching"
						label={t("settings.sections.miscellaneous.features.skipContinueWatching.label")}
						onChange={setCheckboxOption("enable_skip_continue_watching")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.skipContinueWatching.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_shorts_auto_scroll?.toString() === "true"}
						id="enable_shorts_auto_scroll"
						label={t("settings.sections.miscellaneous.features.shortsAutoScroll.label")}
						onChange={setCheckboxOption("enable_shorts_auto_scroll")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.shortsAutoScroll.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_shorts?.toString() === "true"}
						id="enable_hide_shorts"
						label={t("settings.sections.miscellaneous.features.hideShorts.label")}
						onChange={setCheckboxOption("enable_hide_shorts")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.hideShorts.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_live_stream_chat?.toString() === "true"}
						id="enable_hide_live_stream_chat"
						label={t("settings.sections.miscellaneous.features.hideLiveStreamChat.label")}
						onChange={setCheckboxOption("enable_hide_live_stream_chat")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.hideLiveStreamChat.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_translate_comment?.toString() === "true"}
						id="enable_hide_translate_comment"
						label={t("settings.sections.miscellaneous.features.hideTranslateComment.label")}
						onChange={setCheckboxOption("enable_hide_translate_comment")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.hideTranslateComment.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_end_screen_cards?.toString() === "true"}
						id="enable_hide_end_screen_cards"
						label={t("settings.sections.miscellaneous.features.hideEndScreenCards.label")}
						onChange={setCheckboxOption("enable_hide_end_screen_cards")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.hideEndScreenCards.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_end_screen_cards_button?.toString() === "true"}
						id="enable_hide_end_screen_cards_button"
						label={t("settings.sections.miscellaneous.features.hideEndScreenCardsButton.label")}
						onChange={setCheckboxOption("enable_hide_end_screen_cards_button")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.hideEndScreenCardsButton.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_paid_promotion_banner?.toString() === "true"}
						id="enable_hide_paid_promotion_banner"
						label={t("settings.sections.miscellaneous.features.hidePaidPromotionBanner.label")}
						onChange={setCheckboxOption("enable_hide_paid_promotion_banner")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.hidePaidPromotionBanner.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_official_artist_videos_from_home_page?.toString() === "true"}
						id="enable_hide_official_artist_videos_from_home_page"
						label={t("settings.sections.miscellaneous.features.hideOfficialArtistVideosFromHomePage.label")}
						onChange={setCheckboxOption("enable_hide_official_artist_videos_from_home_page")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.hideOfficialArtistVideosFromHomePage.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_automatically_disable_closed_captions?.toString() === "true"}
						id="enable_automatically_disable_closed_captions"
						label={t("settings.sections.miscellaneous.features.automaticallyDisableClosedCaptions.label")}
						onChange={setCheckboxOption("enable_automatically_disable_closed_captions")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.automaticallyDisableClosedCaptions.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_hide_playlist_recommendations_from_home_page?.toString() === "true"}
						id="enable_hide_playlist_recommendations_from_home_page"
						label={t("settings.sections.miscellaneous.features.playlistRemover.label")}
						onChange={setCheckboxOption("enable_hide_playlist_recommendations_from_home_page")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.playlistRemover.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_automatically_disable_ambient_mode?.toString() === "true"}
						id="enable_automatically_disable_ambient_mode"
						label={t("settings.sections.miscellaneous.features.automaticallyDisableAmbientMode.label")}
						onChange={setCheckboxOption("enable_automatically_disable_ambient_mode")}
						parentSetting={null}
						title={t("settings.sections.miscellaneous.features.automaticallyDisableAmbientMode.title")}
						type="checkbox"
					/>
				</SettingSection>
				<SettingSection title={t("settings.sections.videoHistory.title")}>
					<SettingTitle />
					<Setting
						checked={settings.enable_video_history?.toString() === "true"}
						id="enable_video_history"
						label={t("settings.sections.videoHistory.enable.label")}
						onChange={setCheckboxOption("enable_video_history")}
						parentSetting={null}
						title={t("settings.sections.videoHistory.enable.title")}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_video_history?.toString() !== "true"}
						id="video_history_resume_type"
						label={t("settings.sections.videoHistory.resumeType.select.label")}
						onChange={setValueOption("video_history_resume_type")}
						options={videoHistoryResumeTypeOptions}
						parentSetting={{
							type: "singular",
							value: "settings.sections.videoHistory.enable.label"
						}}
						selectedOption={getSelectedOption("video_history_resume_type")}
						title={t("settings.sections.videoHistory.resumeType.select.title")}
						type="select"
					/>
				</SettingSection>
				<SettingSection title={t("settings.sections.onScreenDisplaySettings.title")}>
					<SettingTitle />
					<Setting
						disabled={isOSDDisabled}
						id="osd_display_color"
						label={t("settings.sections.onScreenDisplaySettings.color.label")}
						onChange={setValueOption("osd_display_color")}
						options={colorOptions}
						parentSetting={osdParentSetting}
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
						parentSetting={osdParentSetting}
						selectedOption={getSelectedOption("osd_display_type")}
						title={t("settings.sections.onScreenDisplaySettings.type.title")}
						type="select"
					/>
					<Setting
						disabled={isOSDDisabled}
						id="osd_display_position"
						label={t("settings.sections.onScreenDisplaySettings.position.label")}
						onChange={setValueOption("osd_display_position")}
						options={OSD_PositionOptions}
						parentSetting={osdParentSetting}
						selectedOption={getSelectedOption("osd_display_position")}
						title={t("settings.sections.onScreenDisplaySettings.position.title")}
						type="select"
					/>
					<Setting
						disabled={isOSDDisabled}
						id="osd_display_opacity"
						label={t("settings.sections.onScreenDisplaySettings.opacity.label")}
						max={100}
						min={1}
						onChange={setValueOption("osd_display_opacity")}
						parentSetting={osdParentSetting}
						title={t("settings.sections.onScreenDisplaySettings.opacity.title")}
						type="number"
						value={settings.osd_display_opacity}
					/>
					<Setting
						disabled={isOSDDisabled}
						id="osd_display_hide_time"
						label={t("settings.sections.onScreenDisplaySettings.hide.label")}
						min={1}
						onChange={setValueOption("osd_display_hide_time")}
						parentSetting={osdParentSetting}
						title={t("settings.sections.onScreenDisplaySettings.hide.title")}
						type="number"
						value={settings.osd_display_hide_time}
					/>
					<Setting
						disabled={isOSDDisabled}
						id="osd_display_padding"
						label={t("settings.sections.onScreenDisplaySettings.padding.label")}
						min={0}
						onChange={setValueOption("osd_display_padding")}
						parentSetting={osdParentSetting}
						title={t("settings.sections.onScreenDisplaySettings.padding.title")}
						type="number"
						value={settings.osd_display_padding}
					/>
				</SettingSection>
				<SettingSection title={t("settings.sections.scrollWheelSpeedControl.title")}>
					<SettingTitle />
					<Setting
						checked={settings.enable_scroll_wheel_speed_control?.toString() === "true"}
						id="enable_scroll_wheel_speed_control"
						label={t("settings.sections.scrollWheelSpeedControl.enable.label")}
						onChange={setCheckboxOption("enable_scroll_wheel_speed_control")}
						parentSetting={null}
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
						parentSetting={scrollWheelSpeedControlParentSetting}
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
						parentSetting={scrollWheelSpeedControlParentSetting}
						step={0.05}
						title={t("settings.sections.scrollWheelSpeedControl.adjustmentSteps.title")}
						type="number"
						value={settings.speed_adjustment_steps}
					/>
				</SettingSection>
				<SettingSection title={t("settings.sections.scrollWheelVolumeControl.title")}>
					<SettingTitle />
					<Setting
						checked={settings.enable_scroll_wheel_volume_control?.toString() === "true"}
						id="enable_scroll_wheel_volume_control"
						label={t("settings.sections.scrollWheelVolumeControl.enable.label")}
						onChange={setCheckboxOption("enable_scroll_wheel_volume_control")}
						parentSetting={scrollWheelVolumeControlParentSetting}
						title={t("settings.sections.scrollWheelVolumeControl.enable.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_scroll_wheel_volume_control_hold_modifier_key?.toString() === "true"}
						id="enable_scroll_wheel_volume_control_hold_modifier_key"
						label={t("settings.sections.scrollWheelVolumeControl.holdModifierKey.enable.label")}
						onChange={setCheckboxOption("enable_scroll_wheel_volume_control_hold_modifier_key")}
						parentSetting={scrollWheelVolumeControlParentSetting}
						title={t("settings.sections.scrollWheelVolumeControl.holdModifierKey.enable.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_scroll_wheel_volume_control_hold_right_click?.toString() === "true"}
						id="enable_scroll_wheel_volume_control_hold_right_click"
						label={t("settings.sections.scrollWheelVolumeControl.holdRightClick.enable.label")}
						onChange={setCheckboxOption("enable_scroll_wheel_volume_control_hold_right_click")}
						parentSetting={scrollWheelVolumeControlParentSetting}
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
						parentSetting={scrollWheelVolumeControlParentSetting}
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
						parentSetting={scrollWheelVolumeControlParentSetting}
						title={t("settings.sections.scrollWheelVolumeControl.adjustmentSteps.title")}
						type="number"
						value={settings.volume_adjustment_steps}
					/>
				</SettingSection>
				<SettingSection title={t("settings.sections.automaticQuality.title")}>
					<SettingTitle />
					<Setting
						checked={settings.enable_automatically_set_quality?.toString() === "true"}
						id="enable_automatically_set_quality"
						label={t("settings.sections.automaticQuality.enable.label")}
						onChange={setCheckboxOption("enable_automatically_set_quality")}
						parentSetting={null}
						title={t("settings.sections.automaticQuality.enable.title")}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_automatically_set_quality?.toString() !== "true"}
						id="player_quality"
						label={t("settings.sections.automaticQuality.select.label")}
						onChange={setValueOption("player_quality")}
						options={YouTubePlayerQualityOptions}
						parentSetting={automaticQualityParentSetting}
						selectedOption={getSelectedOption("player_quality")}
						title={t("settings.sections.automaticQuality.select.title")}
						type="select"
					/>
					<Setting
						disabled={settings.enable_automatically_set_quality?.toString() !== "true"}
						id="player_quality_fallback_strategy"
						label={t("settings.sections.automaticQuality.fallbackQualityStrategy.select.label")}
						onChange={setValueOption("player_quality_fallback_strategy")}
						options={PlayerQualityFallbackStrategyOptions}
						parentSetting={automaticQualityParentSetting}
						selectedOption={getSelectedOption("player_quality_fallback_strategy")}
						title={t("settings.sections.automaticQuality.fallbackQualityStrategy.select.title")}
						type="select"
					/>
				</SettingSection>
				<SettingSection title={t("settings.sections.playbackSpeed.title")}>
					<SettingTitle />
					<Setting
						checked={settings.enable_forced_playback_speed?.toString() === "true"}
						id="enable_forced_playback_speed"
						label={t("settings.sections.playbackSpeed.enable.label")}
						onChange={setCheckboxOption("enable_forced_playback_speed")}
						parentSetting={null}
						title={t("settings.sections.playbackSpeed.enable.title")}
						type="checkbox"
					/>
					<Setting
						checked={settings.enable_playback_speed_buttons?.toString() === "true"}
						id="enable_playback_speed_buttons"
						label={t("settings.sections.playbackSpeed.playbackSpeedButtons.label")}
						onChange={setCheckboxOption("enable_playback_speed_buttons")}
						parentSetting={null}
						title={t("settings.sections.playbackSpeed.playbackSpeedButtons.title")}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_forced_playback_speed?.toString() !== "true"}
						id="player_speed"
						label={t("settings.sections.playbackSpeed.select.label")}
						max={youtubePlayerMaxSpeed}
						min={youtubePlayerSpeedStep}
						onChange={setValueOption("player_speed")}
						parentSetting={{
							type: "singular",
							value: "settings.sections.playbackSpeed.enable.label"
						}}
						step={youtubePlayerSpeedStep}
						title={t("settings.sections.playbackSpeed.select.title")}
						type="number"
						value={settings.player_speed}
					/>
					<Setting
						disabled={settings.enable_playback_speed_buttons?.toString() !== "true"}
						id="playback_buttons_speed"
						label={t("settings.sections.playbackSpeed.playbackSpeedButtons.select.label")}
						max={1}
						min={youtubePlayerSpeedStep}
						onChange={setValueOption("playback_buttons_speed")}
						parentSetting={{
							type: "singular",
							value: "settings.sections.playbackSpeed.playbackSpeedButtons.label"
						}}
						step={youtubePlayerSpeedStep}
						title={t("settings.sections.playbackSpeed.playbackSpeedButtons.select.title")}
						type="number"
						value={settings.playback_buttons_speed}
					/>
				</SettingSection>
				<SettingSection title={t("settings.sections.volumeBoost.title")}>
					<SettingTitle />
					<Setting
						checked={settings.enable_volume_boost?.toString() === "true"}
						id="enable_volume_boost"
						label={t("settings.sections.volumeBoost.enable.label")}
						onChange={setCheckboxOption("enable_volume_boost")}
						parentSetting={null}
						title={t("settings.sections.volumeBoost.enable.title")}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_volume_boost?.toString() !== "true"}
						id="volume_boost_mode"
						label={t("settings.sections.volumeBoost.mode.select.label")}
						onChange={setValueOption("volume_boost_mode")}
						options={VolumeBoostModeOptions}
						parentSetting={volumeBoostParentSetting}
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
						parentSetting={volumeBoostParentSetting}
						title={t("settings.sections.volumeBoost.boostAmount.title")}
						type="number"
						value={settings.volume_boost_amount}
					/>
				</SettingSection>
				<SettingSection title={t("settings.sections.screenshotButton.title")}>
					<SettingTitle />
					<Setting
						checked={settings.enable_screenshot_button?.toString() === "true"}
						id="enable_screenshot_button"
						label={t("settings.sections.screenshotButton.enable.label")}
						onChange={setCheckboxOption("enable_screenshot_button")}
						parentSetting={null}
						title={t("settings.sections.screenshotButton.enable.title")}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_screenshot_button?.toString() !== "true"}
						id="screenshot_save_as"
						label={t("settings.sections.screenshotButton.selectSaveAs.label")}
						onChange={setValueOption("screenshot_save_as")}
						options={ScreenshotSaveAsOptions}
						parentSetting={screenshotButtonParentSetting}
						selectedOption={getSelectedOption("screenshot_save_as")}
						title={t("settings.sections.screenshotButton.selectSaveAs.title")}
						type="select"
					/>
					<Setting
						disabled={settings.enable_screenshot_button?.toString() !== "true" || settings.screenshot_save_as?.toString() === "clipboard"}
						id="screenshot_format"
						label={t("settings.sections.screenshotButton.selectFormat.label")}
						onChange={setValueOption("screenshot_format")}
						options={ScreenshotFormatOptions}
						parentSetting={screenshotButtonParentSetting}
						selectedOption={getSelectedOption("screenshot_format")}
						title={t("settings.sections.screenshotButton.selectFormat.title")}
						type="select"
					/>
				</SettingSection>
				<SettingSection title={t("settings.sections.forwardRewindButtons.title")}>
					<SettingTitle />
					<Setting
						checked={settings.enable_forward_rewind_buttons?.toString() === "true"}
						id="enable_forward_rewind_buttons"
						label={t("settings.sections.forwardRewindButtons.enable.label")}
						onChange={setCheckboxOption("enable_forward_rewind_buttons")}
						parentSetting={null}
						title={t("settings.sections.forwardRewindButtons.enable.title")}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_forward_rewind_buttons?.toString() !== "true"}
						id="forward_rewind_buttons_time"
						label={t("settings.sections.forwardRewindButtons.time.label")}
						onChange={setValueOption("forward_rewind_buttons_time")}
						parentSetting={{
							type: "singular",
							value: "settings.sections.forwardRewindButtons.enable.label"
						}}
						title={t("settings.sections.forwardRewindButtons.time.title")}
						type="number"
						value={settings.forward_rewind_buttons_time}
					/>
				</SettingSection>
				<SettingSection title={t("settings.sections.playlistLength.title")}>
					<SettingTitle />
					<Setting
						checked={settings.enable_playlist_length?.toString() === "true"}
						id="enable_playlist_length"
						label={t("settings.sections.playlistLength.enable.label")}
						onChange={setCheckboxOption("enable_playlist_length")}
						parentSetting={null}
						title={t("settings.sections.playlistLength.enable.title")}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_playlist_length?.toString() !== "true"}
						id="playlist_length_get_method"
						label={t("settings.sections.playlistLength.wayToGetLength.select.label")}
						onChange={setValueOption("playlist_length_get_method")}
						options={playlistLengthGetMethodOptions}
						parentSetting={playlistLengthParentSetting}
						selectedOption={getSelectedOption("playlist_length_get_method")}
						title={t("settings.sections.playlistLength.wayToGetLength.select.title")}
						type="select"
					/>
					<Setting
						disabled={settings.enable_playlist_length?.toString() !== "true"}
						id="playlist_watch_time_get_method"
						label={t("settings.sections.playlistLength.wayToGetWatchTime.select.label")}
						onChange={setValueOption("playlist_watch_time_get_method")}
						options={playlistWatchTimeGetMethodOptions}
						parentSetting={playlistLengthParentSetting}
						selectedOption={getSelectedOption("playlist_watch_time_get_method")}
						title={t("settings.sections.playlistLength.wayToGetWatchTime.select.title")}
						type="select"
					/>
				</SettingSection>
				<SettingSection title={t("settings.sections.youtubeDataApiV3Key.title")}>
					<SettingTitle />
					<Setting
						disabled={false}
						id="youtube_data_api_v3_key"
						input_type="password"
						label={t("settings.sections.youtubeDataApiV3Key.input.label")}
						onChange={setValueOption("youtube_data_api_v3_key")}
						parentSetting={null}
						title={t("settings.sections.youtubeDataApiV3Key.input.title")}
						type="text-input"
						value={settings.youtube_data_api_v3_key}
					/>
					<fieldset className={cn("flex flex-row gap-1")}>
						<Link className="ml-2" href="https://developers.google.com/youtube/v3/getting-started" target="_blank">
							{t("settings.sections.youtubeDataApiV3Key.getApiKeyLinkText")}
						</Link>
					</fieldset>
				</SettingSection>
				<SettingSection title={t("settings.sections.youtubeDeepDark.title")}>
					<SettingTitle />
					<fieldset className={cn("flex flex-row gap-1")}>
						<fieldset className={cn("flex flex-row gap-1")}>
							<legend className="mb-1 text-lg sm:text-xl md:text-2xl">{t("settings.sections.youtubeDeepDark.author")}</legend>
							<Link href="https://github.com/RaitaroH">RaitaroH</Link>
						</fieldset>
						<fieldset className={cn("flex flex-row gap-1")}>
							<legend className="mb-1 text-lg sm:text-xl md:text-2xl">{t("settings.sections.youtubeDeepDark.co-authors")}</legend>
							<Link href="https://github.com/MechaLynx">MechaLynx</Link>
						</fieldset>
					</fieldset>
					<Setting
						checked={settings.enable_deep_dark_theme?.toString() === "true"}
						id="enable_deep_dark_theme"
						label={t("settings.sections.youtubeDeepDark.enable.label")}
						onChange={setCheckboxOption("enable_deep_dark_theme")}
						parentSetting={null}
						title={t("settings.sections.youtubeDeepDark.enable.title")}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_deep_dark_theme?.toString() === "false"}
						id="deep_dark_preset"
						label={t("settings.sections.youtubeDeepDark.select.label")}
						onChange={setValueOption("deep_dark_preset")}
						options={youtubeDeepDarkThemeOptions}
						parentSetting={{
							type: "singular",
							value: "settings.sections.youtubeDeepDark.enable.label"
						}}
						selectedOption={getSelectedOption("deep_dark_preset")}
						title={t("settings.sections.youtubeDeepDark.select.title")}
						type="select"
					/>
					<Setting
						disabled={isDeepDarkThemeColorPickerDisabled}
						id={"deep_dark_custom_theme_colors.mainColor"}
						label={t("settings.sections.youtubeDeepDark.colors.mainColor.label")}
						onChange={setValueOption("deep_dark_custom_theme_colors.mainColor")}
						parentSetting={deepDarkThemeColorPickerParentSetting}
						title={t("settings.sections.youtubeDeepDark.colors.mainColor.title")}
						type="color-picker"
						value={settings.deep_dark_custom_theme_colors.mainColor}
					/>
					<Setting
						disabled={isDeepDarkThemeColorPickerDisabled}
						id={"deep_dark_custom_theme_colors.mainBackground"}
						label={t("settings.sections.youtubeDeepDark.colors.mainBackground.label")}
						onChange={setValueOption("deep_dark_custom_theme_colors.mainBackground")}
						parentSetting={deepDarkThemeColorPickerParentSetting}
						title={t("settings.sections.youtubeDeepDark.colors.mainBackground.title")}
						type="color-picker"
						value={settings.deep_dark_custom_theme_colors.mainBackground}
					/>
					<Setting
						disabled={isDeepDarkThemeColorPickerDisabled}
						id={"deep_dark_custom_theme_colors.secondBackground"}
						label={t("settings.sections.youtubeDeepDark.colors.secondBackground.label")}
						onChange={setValueOption("deep_dark_custom_theme_colors.secondBackground")}
						parentSetting={deepDarkThemeColorPickerParentSetting}
						title={t("settings.sections.youtubeDeepDark.colors.secondBackground.title")}
						type="color-picker"
						value={settings.deep_dark_custom_theme_colors.secondBackground}
					/>
					<Setting
						disabled={isDeepDarkThemeColorPickerDisabled}
						id={"deep_dark_custom_theme_colors.hoverBackground"}
						label={t("settings.sections.youtubeDeepDark.colors.hoverBackground.label")}
						onChange={setValueOption("deep_dark_custom_theme_colors.hoverBackground")}
						parentSetting={deepDarkThemeColorPickerParentSetting}
						title={t("settings.sections.youtubeDeepDark.colors.hoverBackground.title")}
						type="color-picker"
						value={settings.deep_dark_custom_theme_colors.hoverBackground}
					/>
					<Setting
						disabled={isDeepDarkThemeColorPickerDisabled}
						id={"deep_dark_custom_theme_colors.mainText"}
						label={t("settings.sections.youtubeDeepDark.colors.mainText.label")}
						onChange={setValueOption("deep_dark_custom_theme_colors.mainText")}
						parentSetting={deepDarkThemeColorPickerParentSetting}
						title={t("settings.sections.youtubeDeepDark.colors.mainText.title")}
						type="color-picker"
						value={settings.deep_dark_custom_theme_colors.mainText}
					/>
					<Setting
						disabled={isDeepDarkThemeColorPickerDisabled}
						id={"deep_dark_custom_theme_colors.dimmerText"}
						label={t("settings.sections.youtubeDeepDark.colors.dimmerText.label")}
						onChange={setValueOption("deep_dark_custom_theme_colors.dimmerText")}
						parentSetting={deepDarkThemeColorPickerParentSetting}
						title={t("settings.sections.youtubeDeepDark.colors.dimmerText.title")}
						type="color-picker"
						value={settings.deep_dark_custom_theme_colors.dimmerText}
					/>
					<Setting
						disabled={isDeepDarkThemeColorPickerDisabled}
						id={"deep_dark_custom_theme_colors.colorShadow"}
						label={t("settings.sections.youtubeDeepDark.colors.colorShadow.label")}
						onChange={setValueOption("deep_dark_custom_theme_colors.colorShadow")}
						parentSetting={deepDarkThemeColorPickerParentSetting}
						title={t("settings.sections.youtubeDeepDark.colors.colorShadow.title")}
						type="color-picker"
						value={settings.deep_dark_custom_theme_colors.colorShadow}
					/>
				</SettingSection>
				<SettingSection title={t("settings.sections.customCSS.title")}>
					<SettingTitle />
					<Setting
						checked={settings.enable_custom_css?.toString() === "true"}
						id="enable_custom_css"
						label={t("settings.sections.customCSS.enable.label")}
						onChange={setCheckboxOption("enable_custom_css")}
						parentSetting={null}
						title={t("settings.sections.customCSS.enable.title")}
						type="checkbox"
					/>
					<Setting
						disabled={settings.enable_custom_css?.toString() !== "true"}
						id="custom_css_code"
						onChange={(value) => {
							if (value !== undefined) {
								setValueOption("custom_css_code")({ currentTarget: { value } } as ChangeEvent<HTMLInputElement>);
							}
						}}
						parentSetting={{
							type: "singular",
							value: "settings.sections.customCSS.enable.label"
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
					{isPopup && (
						<button
							className="accent flex items-center justify-center p-2 text-sm sm:text-base md:text-lg dark:hover:bg-[rgba(24,26,27,0.5)]"
							id="openinnewtab_button"
							onClick={() => openInNewTab("src/pages/options/index.html")}
							title={t("settings.sections.bottomButtons.openTab.title")}
							type="button"
						>
							<MdOutlineOpenInNew color="white" size={20} />
						</button>
					)}
					<input
						className="accent p-2 text-sm sm:text-base md:text-lg dark:hover:bg-[rgba(24,26,27,0.5)]"
						id="export_settings_button"
						onClick={exportSettings}
						title={t("settings.sections.importExportSettings.exportButton.title")}
						type="button"
						value={t("settings.sections.importExportSettings.exportButton.value")}
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

								addNotification("success", "pages.options.notifications.success.saved");
							}}
							title={t("settings.sections.bottomButtons.confirm.title")}
							type="button"
							value={t("settings.sections.bottomButtons.confirm.value")}
						/>
					:	<input
							className="warning p-2 text-sm sm:text-base md:text-lg dark:hover:bg-[rgba(24,26,27,0.5)]"
							id="reset_button"
							onClick={resetOptions}
							title={t("settings.sections.bottomButtons.reset.title")}
							type="button"
							value={t("settings.sections.bottomButtons.reset.value")}
						/>
					}
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
		<SettingSection title={t("settings.sections.language.title")}>
			<SettingTitle />
			<Setting
				disabled={false}
				id="language"
				label={t("settings.sections.language.select.label")}
				loading={languagesLoading}
				onChange={setValueOption("language")}
				options={languageOptions}
				parentSetting={null}
				selectedOption={selectedLanguage}
				title={t("settings.sections.language.select.title")}
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
