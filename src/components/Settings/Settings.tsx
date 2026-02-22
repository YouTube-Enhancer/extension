import type { ChangeEvent } from "react";

import { useMutation, type UseMutationResult, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";

import "@/assets/styles/tailwind.css";
import "@/components/Settings/Settings.css";

import type { configuration, configurationKeys, Nullable, Path } from "@/src/types";

import { useNotifications } from "@/hooks";
import SettingsFooter from "@/src/components/Settings/components/SettingsFooter";
import SettingsHeader from "@/src/components/Settings/components/SettingsHeader";
import {
	ButtonPlacementSection,
	CustomCSSSection,
	DeepDarkCSSSection,
	FeatureMenuOpenTypeSection,
	ForwardRewindButtonsSection,
	GlobalVolumeSection,
	LanguageSettingsSection,
	MiniPlayerSection,
	MiscellaneousSection,
	OnScreenDisplaySection,
	PlayerQualitySection,
	PlayerSpeedSection,
	PlaylistLengthSection,
	PlaylistManagementButtonsSection,
	ScreenshotButtonSection,
	ScrollWheelSpeedControlSection,
	ScrollWheelVolumeControlSection,
	VideoHistorySection,
	VolumeBoostSection,
	YouTubeDataApiKeySection
} from "@/src/components/Settings/sections";
import { type i18nInstanceType, i18nService } from "@/src/i18n";
import { localeDirection } from "@/src/i18n/constants";
import { defaultConfiguration } from "@/src/utils/constants";
import { getPathValue, parseStoredValue } from "@/src/utils/utilities";

import Loader from "../Loader";
import Setting from "./components/Setting";
import SettingsNotifications from "./components/SettingNotifications";
type SettingsContextProps = {
	direction: "ltr" | "rtl";
	getSelectedOption: <K extends Path<configuration>>(key: K) => ReturnType<typeof getPathValue<configuration, K>>;
	i18nInstance: i18nInstanceType;
	setCheckboxOption: (key: Path<configuration>) => ({ currentTarget }: ChangeEvent<HTMLInputElement>) => void;
	settings: configuration;
	settingsMutate: UseMutationResult<void, Error, configuration, unknown>;
	setValueOption: (key: Path<configuration>) => ({ currentTarget }: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
};
export function getSettings(): Promise<configuration> {
	return new Promise((resolve, reject) => {
		void chrome.storage.local.get<configuration>((settings) => {
			try {
				const storedSettings: Partial<configuration> = (
					Object.keys(settings)
						.filter((key) => typeof key === "string")
						.filter((key) => Object.keys(defaultConfiguration).includes(key as unknown as string)) as configurationKeys[]
				).reduce((acc, key) => Object.assign(acc, { [key]: parseStoredValue(settings[key] as string) }), {});
				const castedSettings = storedSettings as configuration;
				resolve(castedSettings);
			} catch (error) {
				reject(error);
			}
		});
	});
}
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
	const [i18nInstance, setI18nInstance] = useState<Nullable<i18nInstanceType>>(null);
	const { addNotification } = useNotifications();
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
			const currentValue = getPathValue(settings, key);
			// Don't mutate if the value hasn't changed
			if (currentValue === checked) return;
			settingsMutate.mutate({ ...settings, [key]: checked });
		};
	const setValueOption =
		(key: Path<configuration>) =>
		({ currentTarget: { value } }: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			const currentValue = getPathValue(settings, key);
			// Don't mutate if the value hasn't changed
			if (currentValue === value) return;
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
	// TODO: add "default player mode" setting (theater, fullscreen, etc.) feature
	return (
		<SettingsContext.Provider
			value={{
				direction: localeDirection[settings.language],
				getSelectedOption,
				i18nInstance,
				setCheckboxOption,
				settings,
				settingsMutate,
				setValueOption
			}}
		>
			<div className="size-fit bg-[#f5f5f5] text-black dark:multi-['bg-[#181a1b];text-white']" dir={localeDirection[settings.language]}>
				<SettingsHeader />
				<Setting
					checked={settings.open_settings_on_major_or_minor_version_change?.toString() === "true"}
					label={t((translations) => translations.pages.options.extras.openSettingsOnMajorOrMinorVersionChange.label)}
					onChange={setCheckboxOption("open_settings_on_major_or_minor_version_change")}
					parentSetting={null}
					title={t((translations) => translations.pages.options.extras.openSettingsOnMajorOrMinorVersionChange.title)}
					type="checkbox"
				></Setting>
				<LanguageSettingsSection />
				<FeatureMenuOpenTypeSection />
				<ButtonPlacementSection />
				<YouTubeDataApiKeySection />
				<MiscellaneousSection />
				<VideoHistorySection />
				<OnScreenDisplaySection />
				<ScrollWheelSpeedControlSection />
				<ScrollWheelVolumeControlSection />
				<PlayerQualitySection />
				<PlayerSpeedSection />
				<VolumeBoostSection />
				<PlaylistManagementButtonsSection />
				<ScreenshotButtonSection />
				<ForwardRewindButtonsSection />
				<PlaylistLengthSection />
				<MiniPlayerSection />
				<YouTubeDataApiKeySection />
				<DeepDarkCSSSection />
				<GlobalVolumeSection />
				<CustomCSSSection />
				<SettingsFooter />
				<SettingsNotifications />
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
async function setSettings(newSettings: configuration) {
	const current = await getSettings();
	if (JSON.stringify(current) === JSON.stringify(newSettings)) return;
	for (const key of Object.keys(newSettings)) {
		const value = typeof newSettings[key] === "string" ? newSettings[key] : JSON.stringify(newSettings[key]);
		localStorage.setItem(key, value);
		await chrome.storage.local.set({ [key]: value });
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
