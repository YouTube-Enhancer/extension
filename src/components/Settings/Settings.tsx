import type { ChangeEvent } from "react";

import { useMutation, type UseMutationResult, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import browser from "webextension-polyfill";

import type { configuration, Nullable, Path, PathValue } from "@/src/types";

import "@/assets/styles/tailwind.css";
import "@/components/Settings/Settings.css";
import { useNotifications } from "@/hooks";
import SettingsFooter from "@/src/components/Settings/components/SettingsFooter";
import SettingsHeader from "@/src/components/Settings/components/SettingsHeader";
import {
	ButtonPlacementSection,
	FeatureMenuOpenTypeSection,
	LanguageSettingsSection,
	OnScreenDisplaySection,
	YouTubeDataApiKeySection
} from "@/src/components/Settings/sections";
import SettingsGenerator from "@/src/components/Settings/SettingsGenerator";
import { type i18nInstanceType, i18nService } from "@/src/i18n";
import { localeDirection } from "@/src/i18n/constants";
import { getDefaultConfiguration } from "@/src/utils/config/defaults";
import { parseStoredValue, updateConfigAtPath } from "@/src/utils/config/utils";
import { getPathValue } from "@/src/utils/misc";

import Loader from "../Loader";
import Setting from "./components/Setting";
import SettingsNotifications from "./components/SettingNotifications";
type BooleanPath<T> = {
	[P in Path<T>]: PathValue<T, P> extends boolean ? P : never;
}[Path<T>];
type SettingsContextProps = {
	direction: "ltr" | "rtl";
	getSelectedOption: <K extends Path<configuration>>(
		key: K & (PathValue<configuration, K> extends string ? K : never)
	) => PathValue<configuration, K>;
	i18nInstance: i18nInstanceType;
	setCheckboxOption: <K extends BooleanPath<configuration>>(key: K) => ({ currentTarget }: ChangeEvent<HTMLInputElement>) => void;
	settings: configuration;
	settingsMutate: UseMutationResult<void, Error, configuration, unknown>;
	setValueOption: <K extends Path<configuration>>(key: K) => ({ currentTarget }: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
};
type StringPath<T> = {
	[P in Path<T>]: PathValue<T, P> extends string ? P : never;
}[Path<T>];
export function getSettings(): Promise<configuration> {
	return new Promise((resolve, reject) => {
		const defaultConfiguration = getDefaultConfiguration();
		void browser.storage.local.get(null).then((settings) => {
			try {
				const storedSettings: Partial<configuration> = Object.keys(settings)
					.filter((key) => typeof key === "string" && Object.keys(defaultConfiguration).includes(key as unknown as string))
					.reduce((acc, key) => Object.assign(acc, { [key]: parseStoredValue(settings[key] as string) }), {});
				const castedSettings = storedSettings as configuration;
				return resolve(castedSettings);
			} catch (error) {
				if (error instanceof Error) {
					return reject(error);
				} else {
					return reject(new Error("unknown error"));
				}
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
		onError: (error) => {
			console.error("Failed to save settings:", error);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["settings"]
			});
			const now = Date.now();
			if (now - lastToastTime > 2000) {
				addNotification("success", (translations) => translations.pages.options.notifications.success.saved);
				setLastToastTime(now);
			}
		}
	});
	const [lastToastTime, setLastToastTime] = useState(0);
	const [i18nInstance, setI18nInstance] = useState<Nullable<i18nInstanceType>>(null);
	const { addNotification } = useNotifications();
	const settingsRef = useRef(settings);
	useEffect(() => {
		settingsRef.current = settings;
	}, [settings]);
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
	function createOptionSetter<P extends Path<configuration>, E extends { currentTarget: unknown }>(
		key: P,
		extractValue: (e: E) => PathValue<configuration, P>
	): (event: E) => void;
	function createOptionSetter<P extends BooleanPath<configuration>>(
		key: P,
		extractValue: (e: ChangeEvent<HTMLInputElement>) => boolean
	): (event: ChangeEvent<HTMLInputElement>) => void;
	function createOptionSetter<P extends Path<configuration>, E>(key: P, extractValue: (e: E) => PathValue<configuration, P>) {
		return (event: E) => {
			if (!settingsRef.current) return;
			const nextValue = extractValue(event);
			const currentValue = getPathValue(settingsRef.current, key);
			if (currentValue === nextValue) return;
			settingsMutate.mutate(updateConfigAtPath(settingsRef.current, key, nextValue));
		};
	}
	const setCheckboxOption = <P extends BooleanPath<configuration>>(key: P) =>
		createOptionSetter(key, (e: ChangeEvent<HTMLInputElement>) => e.currentTarget.checked);
	const setValueOption = <P extends Path<configuration>>(key: P) =>
		createOptionSetter(key, (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => e.currentTarget.value as PathValue<configuration, P>);
	function getSelectedOption<K extends Path<configuration>>(
		key: K & (PathValue<configuration, K> extends string ? K : never)
	): PathValue<configuration, K>;
	function getSelectedOption<K extends StringPath<configuration>>(key: K): string;
	function getSelectedOption(key: StringPath<configuration>): string {
		return getPathValue(settings, key);
	}
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
			<div
				className="flex min-h-screen w-fit flex-col bg-[#f5f5f5] text-black dark:multi-['bg-[#181a1b];text-white']"
				dir={localeDirection[settings.language]}
			>
				<SettingsHeader />
				<div className="flex-1 overflow-auto">
					<Setting
						checked={settings.openSettingsOnMajorOrMinorVersionChange?.toString() === "true"}
						featureId="global"
						label={t((translations) => translations.pages.options.extras.openSettingsOnMajorOrMinorVersionChange.label)}
						onChange={setCheckboxOption("openSettingsOnMajorOrMinorVersionChange")}
						parentSetting={null}
						title={t((translations) => translations.pages.options.extras.openSettingsOnMajorOrMinorVersionChange.title)}
						type="checkbox"
					/>
					<LanguageSettingsSection />
					<FeatureMenuOpenTypeSection />
					<ButtonPlacementSection />
					<YouTubeDataApiKeySection />
					<OnScreenDisplaySection />
					<SettingsGenerator />
				</div>
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
		throw new Error("Failed to fetch settings", {
			cause: error
		});
	}
}
async function setSettings(newSettings: configuration) {
	const current = await getSettings();
	if (JSON.stringify(current) === JSON.stringify(newSettings)) return;
	await browser.storage.local.set(Object.fromEntries(Object.entries(newSettings).map(([key, value]) => [key, value])));
}

export const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);
export const useSettings = () => {
	const context = useContext(SettingsContext);
	if (context === undefined) {
		throw new Error("useSettings must be used within a SettingsProvider");
	}
	return context;
};
