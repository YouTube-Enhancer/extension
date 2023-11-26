import type {
	OnScreenDisplayColor,
	OnScreenDisplayPosition,
	OnScreenDisplayType,
	ScreenshotFormat,
	ScreenshotType,
	YoutubePlayerQualityLevel,
	configuration,
	configurationKeys
} from "@/src/types";

import Loader from "@/src/components/Loader";
import Settings from "@/src/components/Settings/Settings";
import { NotificationsProvider } from "@/src/hooks/useNotifications/provider";
import { type AvailableLocales, type i18nInstanceType, i18nService } from "@/src/i18n";
import { defaultConfiguration } from "@/src/utils/constants";
import { parseStoredValue } from "@/src/utils/utilities";
import React, { useEffect, useState } from "react";
// TODO: try to get rid of this SettingsWrapper component and just have the Settings Component
export default function SettingsWrapper(): JSX.Element {
	const [settings, setSettings] = useState<configuration | undefined>(undefined);
	const [selectedColor, setSelectedColor] = useState<string | undefined>();
	const [selectedDisplayType, setSelectedDisplayType] = useState<string | undefined>();
	const [selectedDisplayPosition, setSelectedDisplayPosition] = useState<string | undefined>();
	const [selectedPlayerQuality, setSelectedPlayerQuality] = useState<string | undefined>();
	const [selectedPlayerSpeed, setSelectedPlayerSpeed] = useState<string | undefined>();
	const [selectedScreenshotSaveAs, setSelectedScreenshotSaveAs] = useState<string | undefined>();
	const [selectedScreenshotFormat, setSelectedScreenshotFormat] = useState<string | undefined>();
	const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>();
	const [selectedModifierKey, setSelectedModifierKey] = useState<string | undefined>();
	const [i18nInstance, setI18nInstance] = useState<i18nInstanceType | null>(null);
	useEffect(() => {
		const fetchSettings = () => {
			chrome.storage.local.get((settings) => {
				const storedSettings: Partial<configuration> = (
					Object.keys(settings)
						.filter((key) => typeof key === "string")
						.filter((key) => Object.keys(defaultConfiguration).includes(key as unknown as string)) as configurationKeys[]
				).reduce((acc, key) => Object.assign(acc, { [key]: parseStoredValue(settings[key] as string) }), {});
				const castedSettings = storedSettings as configuration;
				setSettings({ ...castedSettings });
				setSelectedColor(castedSettings.osd_display_color);
				setSelectedDisplayType(castedSettings.osd_display_type);
				setSelectedDisplayPosition(castedSettings.osd_display_position);
				setSelectedPlayerQuality(castedSettings.player_quality);
				setSelectedPlayerSpeed(castedSettings.player_speed.toString());
				setSelectedScreenshotSaveAs(castedSettings.screenshot_save_as);
				setSelectedScreenshotFormat(castedSettings.screenshot_format);
				setSelectedLanguage(castedSettings.language);
				setSelectedModifierKey(castedSettings.scroll_wheel_volume_control_modifier_key);
			});
		};

		fetchSettings();
	}, []);

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
				switch (key) {
					case "osd_display_color":
						setSelectedColor(parsedNewValue as OnScreenDisplayColor);
						break;
					case "osd_display_type":
						setSelectedDisplayType(parsedNewValue as OnScreenDisplayType);
						break;
					case "osd_display_position":
						setSelectedDisplayPosition(parsedNewValue as OnScreenDisplayPosition);
						break;
					case "player_quality":
						setSelectedPlayerQuality(parsedNewValue as YoutubePlayerQualityLevel);
						break;
					case "player_speed":
						setSelectedPlayerSpeed(parsedNewValue as string);
						break;
					case "screenshot_save_as":
						setSelectedScreenshotSaveAs(parsedNewValue as ScreenshotType);
						break;
					case "screenshot_format":
						setSelectedScreenshotFormat(parsedNewValue as ScreenshotFormat);
						break;
					case "language":
						setSelectedLanguage(parsedNewValue as AvailableLocales);
						break;
				}
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
		void (async () => {
			const instance = await i18nService((selectedLanguage as AvailableLocales) ?? "en-US");
			setI18nInstance(instance);
		})();
	}, [selectedLanguage]);
	const defaultOptions = defaultConfiguration;
	if (!settings || !i18nInstance || (i18nInstance && i18nInstance.isInitialized === false)) {
		return <Loader />;
	}
	return (
		<NotificationsProvider>
			<Settings
				defaultSettings={defaultOptions}
				i18nInstance={i18nInstance}
				selectedColor={selectedColor}
				selectedDisplayPosition={selectedDisplayPosition}
				selectedDisplayType={selectedDisplayType}
				selectedLanguage={selectedLanguage}
				selectedModifierKey={selectedModifierKey}
				selectedPlayerQuality={selectedPlayerQuality}
				selectedPlayerSpeed={selectedPlayerSpeed}
				selectedScreenshotFormat={selectedScreenshotFormat}
				selectedScreenshotSaveAs={selectedScreenshotSaveAs}
				setSelectedColor={setSelectedColor}
				setSelectedDisplayPosition={setSelectedDisplayPosition}
				setSelectedDisplayType={setSelectedDisplayType}
				setSelectedLanguage={setSelectedLanguage}
				setSelectedModifierKey={setSelectedModifierKey}
				setSelectedPlayerQuality={setSelectedPlayerQuality}
				setSelectedPlayerSpeed={setSelectedPlayerSpeed}
				setSelectedScreenshotFormat={setSelectedScreenshotFormat}
				setSelectedScreenshotSaveAs={setSelectedScreenshotSaveAs}
				setSettings={setSettings}
				settings={settings}
			/>
		</NotificationsProvider>
	);
}
