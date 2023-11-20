import type { configuration } from "@/src/types";

import Loader from "@/src/components/Loader";
import Settings from "@/src/components/Settings/Settings";
import { NotificationsProvider } from "@/src/hooks/useNotifications/provider";
import { type AvailableLocales, type i18nInstanceType, i18nService } from "@/src/i18n";
import { defaultConfiguration } from "@/src/utils/constants";
import { parseStoredValue } from "@/src/utils/utilities";
import React, { useEffect, useState } from "react";

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
				for (const [key, value] of Object.entries(settings)) {
					settings[key] = parseStoredValue(value);
				}
				const castedSettings = settings as configuration;
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
				if (oldValue === newValue) return;
				switch (key) {
					case "osd_display_color":
						setSelectedColor(newValue);
						break;
					case "osd_display_type":
						setSelectedDisplayType(newValue);
						break;
					case "osd_display_position":
						setSelectedDisplayPosition(newValue);
						break;
					case "player_quality":
						setSelectedPlayerQuality(newValue);
						break;
					case "player_speed":
						setSelectedPlayerSpeed(newValue);
						break;
					case "screenshot_save_as":
						setSelectedScreenshotSaveAs(newValue);
						break;
					case "screenshot_format":
						setSelectedScreenshotFormat(newValue);
						break;
					case "language":
						setSelectedLanguage(newValue);
						break;
				}
				setSettings((prevSettings) => {
					if (prevSettings) {
						return { ...prevSettings, [key]: newValue };
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
		(async () => {
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
