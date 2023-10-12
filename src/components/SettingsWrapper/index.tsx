import Loader from "@/src/components/Loader";
import Settings from "@/src/components/Settings/Settings";
import type { configuration } from "@/src/types";
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
	useEffect(() => {
		const fetchSettings = () => {
			chrome.storage.local.get((settings) => {
				for (const [key, value] of Object.entries(settings)) {
					settings[key] = parseStoredValue(value);
				}
				setSettings({ ...settings } as configuration);
				setSelectedColor(settings.osd_display_color);
				setSelectedDisplayType(settings.osd_display_type);
				setSelectedDisplayPosition(settings.osd_display_position);
				setSelectedPlayerQuality(settings.player_quality);
				setSelectedPlayerSpeed(settings.player_speed);
				setSelectedScreenshotSaveAs(settings.screenshot_save_as);
				setSelectedScreenshotFormat(settings.screenshot_format);
			});
		};

		fetchSettings();
	}, []);

	useEffect(() => {
		const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
			if (areaName !== "local") return;
			const castedChanges = changes as {
				[K in keyof configuration]: {
					oldValue: configuration[K] | undefined;
					newValue: configuration[K] | undefined;
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

	const defaultOptions = defaultConfiguration;
	if (!settings) {
		return <Loader />;
	}
	return (
		<Settings
			settings={settings}
			setSettings={setSettings}
			defaultSettings={defaultOptions}
			selectedColor={selectedColor}
			setSelectedColor={setSelectedColor}
			selectedDisplayType={selectedDisplayType}
			setSelectedDisplayType={setSelectedDisplayType}
			selectedDisplayPosition={selectedDisplayPosition}
			setSelectedDisplayPosition={setSelectedDisplayPosition}
			selectedPlayerQuality={selectedPlayerQuality}
			setSelectedPlayerQuality={setSelectedPlayerQuality}
			selectedPlayerSpeed={selectedPlayerSpeed}
			setSelectedPlayerSpeed={setSelectedPlayerSpeed}
			selectedScreenshotSaveAs={selectedScreenshotSaveAs}
			setSelectedScreenshotSaveAs={setSelectedScreenshotSaveAs}
			selectedScreenshotFormat={selectedScreenshotFormat}
			setSelectedScreenshotFormat={setSelectedScreenshotFormat}
		/>
	);
}
