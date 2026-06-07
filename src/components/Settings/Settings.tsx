import type { ChangeEvent } from "react";

import { useMutation, type UseMutationResult, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { MdBuild, MdPalette, MdTune } from "react-icons/md";
import browser from "webextension-polyfill";

import type { TabId } from "@/src/components/Settings/components/TabBar";
import type { configuration, Nullable, Path, PathValue } from "@/src/types";
import type { UiTheme } from "@/src/utils/uiTheme";

import "@/assets/styles/tailwind.css";
import "@/components/Settings/Settings.css";
import { useNotifications } from "@/hooks";
import ImportExportSection from "@/src/components/Settings/components/ImportExportSection";
import SettingSearch from "@/src/components/Settings/components/SettingSearch";
import DataManagementSection from "@/src/components/Settings/components/SettingsFooter";
import WelcomeModal, { shouldShowWelcomeModal } from "@/src/components/Settings/components/WelcomeModal";
import {
	ButtonPlacementSection,
	FeatureMenuOpenTypeSection,
	LanguageSettingsSection,
	OnScreenDisplaySection,
	YouTubeDataApiKeySection
} from "@/src/components/Settings/sections";
import SettingsGenerator from "@/src/components/Settings/SettingsGenerator";
import AppearanceTab from "@/src/components/Settings/tabs/AppearanceTab";
import { type i18nInstanceType, i18nService } from "@/src/i18n";
import { localeDirection } from "@/src/i18n/constants";
import { getDefaultConfiguration } from "@/src/utils/config/defaults";
import { parseStoredValue, updateConfigAtPath } from "@/src/utils/config/utils";
import { getPathValue } from "@/src/utils/misc";
import { cn } from "@/src/utils/style";
import { applyTheme, getUiTheme } from "@/src/utils/uiTheme";

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
	const [activeTab, setActiveTab] = useState<TabId>("basic");
	const [showWelcome, setShowWelcome] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);
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
	useEffect(() => {
		void shouldShowWelcomeModal().then(setShowWelcome);
	}, []);
	useEffect(() => {
		void (async () => {
			const theme = await getUiTheme();
			if (wrapperRef.current) applyTheme(theme, wrapperRef.current);
		})();
	}, []);

	const handleThemeChange = useCallback((theme: UiTheme) => {
		if (wrapperRef.current) applyTheme(theme, wrapperRef.current);
	}, []);

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

	const tabs = [
		{ icon: <MdTune size={16} />, id: "basic" as TabId, label: "Basic" },
		{ icon: <MdBuild size={16} />, id: "advanced" as TabId, label: "Advanced" },
		{ icon: <MdPalette size={16} />, id: "appearance" as TabId, label: "Appearance" }
	];

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
				className="flex h-screen overflow-hidden bg-[#f5f5f5] text-black dark:bg-[#181a1b] dark:text-white"
				dir={localeDirection[settings.language]}
				ref={wrapperRef}
			>
				{/* Sidebar navigation */}
				<aside className="flex w-56 shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]">
					<div className="flex items-center gap-3 px-4 py-5">
						<img alt="YouTube Enhancer" className="size-10" src="/icons/icon_128.png" />
						<div>
							<p className="text-sm font-bold leading-tight">YouTube Enhancer</p>
							<p className="text-xs text-gray-500" dir="ltr">
								v{chrome.runtime.getManifest().version}
							</p>
						</div>
					</div>
					<nav className="flex flex-col gap-0.5 px-2">
						{tabs.map((tab) => (
							<button
								className={cn(
									"flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
									activeTab === tab.id ?
										"bg-[var(--accent)]/10 text-[var(--accent)]"
									:	"text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/40"
								)}
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								type="button"
							>
								<span className="text-base leading-none">{tab.icon}</span>
								{tab.label}
							</button>
						))}
					</nav>
					<div className="mt-auto flex flex-col gap-2 p-3">
						<ImportExportSection />
						<DataManagementSection />
					</div>
				</aside>

				{/* Main content area */}
				<div className="flex flex-1 flex-col overflow-hidden">
					<div className="shrink-0 border-b border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] px-4 py-2">
						<SettingSearch />
					</div>
					<main className="flex-1 overflow-y-auto p-4">
						{activeTab === "basic" && (
							<div className="columns-1 gap-3 lg:columns-2">
								<div className="mb-3 break-inside-avoid [column-span:all] rounded-xl bg-[var(--card-bg)] p-2 shadow-sm">
									<Setting
										checked={settings.openSettingsOnMajorOrMinorVersionChange?.toString() === "true"}
										featureId="global"
										label={t((translations) => translations.pages.options.extras.openSettingsOnMajorOrMinorVersionChange.label)}
										onChange={setCheckboxOption("openSettingsOnMajorOrMinorVersionChange")}
										parentSetting={null}
										title={t((translations) => translations.pages.options.extras.openSettingsOnMajorOrMinorVersionChange.title)}
										type="checkbox"
									/>
								</div>
								<LanguageSettingsSection />
								<SettingsGenerator tab="basic" />
							</div>
						)}
						{activeTab === "advanced" && (
							<div className="columns-1 gap-3 lg:columns-2">
								<FeatureMenuOpenTypeSection />
								<ButtonPlacementSection />
								<YouTubeDataApiKeySection />
								<OnScreenDisplaySection />
								<SettingsGenerator tab="advanced" />
							</div>
						)}
						{activeTab === "appearance" && <AppearanceTab onThemeChange={handleThemeChange} />}
					</main>
				</div>

				<SettingsNotifications />
				{showWelcome && <WelcomeModal onDismiss={() => setShowWelcome(false)} />}
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
