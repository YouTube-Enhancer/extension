import Loader from "@/src/components/Loader";
import Settings from "@/src/components/Settings/Settings";
import { configuration, configurationWithDefaults } from "@/src/types";
import React, { useEffect, useState } from "react";

export default function Popup(): JSX.Element {
	const [settings, setSettings] = useState<configuration | undefined>(undefined);
	const [selectedColor, setSelectedColor] = useState<string | undefined>();
	const [selectedDisplayType, setSelectedDisplayType] = useState<string | undefined>();
	const [selectedDisplayPosition, setSelectedDisplayPosition] = useState<string | undefined>();
	const [selectedPlayerQuality, setSelectedPlayerQuality] = useState<string | undefined>();

	useEffect(() => {
		const fetchSettings = () => {
			chrome.storage.local.get((settings) => {
				setSettings({ ...settings } as configuration);
				setSelectedColor(settings.osd_display_color);
				setSelectedDisplayType(settings.osd_display_type);
				setSelectedDisplayPosition(settings.osd_display_position);
				setSelectedPlayerQuality(settings.player_quality);
			});
		};

		fetchSettings();
	}, []);

	useEffect(() => {
		const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
			if (areaName === "local") {
				Object.keys(changes as Partial<configuration>).forEach((key) => {
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
					}
					setSettings((prevSettings) => {
						if (prevSettings) {
							return { ...prevSettings, [key]: newValue };
						}
						return undefined;
					});
				});
			}
		};

		chrome.storage.onChanged.addListener(handleStorageChange);
		chrome.runtime.onSuspend.addListener(() => {
			chrome.storage.onChanged.removeListener(handleStorageChange);
		});
		return () => {
			chrome.storage.onChanged.removeListener(handleStorageChange);
		};
	}, []);

	const defaultOptions = Object.keys(localStorage as unknown as configurationWithDefaults)
		.filter((key) => key.endsWith("_default"))
		.reduce(
			(options, key) => ({
				...options,
				[key.replace("_default", "")]: localStorage[key]
			}),
			{}
		) as configuration;
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
		/>
	);
}
