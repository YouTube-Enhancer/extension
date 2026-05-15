import { type ChangeEventHandler, useRef, useState } from "react";
import { MdOutlineOpenInNew } from "react-icons/md";
import browser from "webextension-polyfill";
import { generateErrorMessage } from "zod-error";

import type { FeatureState } from "@/src/features/_registry/types";
import type { configuration } from "@/src/types";

import ConflictResolutionDialog from "@/src/components/Settings/components/ConflictResolutionDialog";
import { getSettings, useSettings } from "@/src/components/Settings/Settings";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { useNotifications } from "@/src/hooks";
import { getDefaultConfiguration } from "@/src/utils/config/defaults";
import { getConfigurationImportSchema } from "@/src/utils/config/importSchema";
import { updateStoredSettings } from "@/src/utils/config/storage";
import { deepMerge, isLegacyConfiguration, migrateConfiguration, parseStoredValue } from "@/src/utils/config/utils";
import { formatDateForFileName } from "@/src/utils/format/date";
import { numberConstraints, validateNumbers } from "@/src/validation";

type Conflict = {
	featureA: string;
	featureB: string;
	key?: string;
	type: "enabled" | "modifierKey";
};

export default function SettingsFooter() {
	const {
		i18nInstance: { t },
		settings,
		settingsMutate
	} = useSettings();
	const isPopup = window.location.href.match(/.+\/src\/pages\/popup\/index\.html/g);
	const { addNotification, notifications, removeNotification } = useNotifications();
	const settingsImportRef = useRef<HTMLInputElement>(null);
	const [conflicts, setConflicts] = useState<Conflict[]>([]);
	const [pendingSettings, setPendingSettings] = useState<configuration | null>(null);
	const defaultConfiguration = getDefaultConfiguration();
	const configurationImportSchema = getConfigurationImportSchema();
	async function refreshSettings() {
		await updateStoredSettings();
		settingsMutate.mutate(await getSettings());
	}
	const settingsImportChange: ChangeEventHandler<HTMLInputElement> = (event): void => {
		void (async () => {
			const { target } = event;
			if (!target) return;
			const { files } = target as HTMLInputElement;
			const file = files?.[0];
			if (!file) return;
			try {
				const fileContents = await file.text();
				const importedRaw = JSON.parse(fileContents) as Record<string, unknown>;
				const configEntries: Record<string, unknown> = {};
				const stateEntries: Record<string, unknown> = {};
				for (const [key, value] of Object.entries(importedRaw)) {
					if ((key as string).startsWith("state:")) {
						stateEntries[key] = value;
					} else {
						configEntries[key] = value;
					}
				}
				let importedSettings: configuration;
				// Legacy configuration migration
				if (isLegacyConfiguration(configEntries)) {
					importedSettings = migrateConfiguration(configEntries, defaultConfiguration);
				} else {
					importedSettings = configEntries as configuration;
				}
				// Validate the imported settings.
				const result = configurationImportSchema.safeParse(importedSettings);
				if (!result.success) {
					const errorMessage = generateErrorMessage(result.error.issues);
					window.alert(
						t((translations) => translations.pages.options.extras.importExportSettings.importButton.error.validation, { ERROR_MESSAGE: errorMessage })
					);
					return;
				}
				const castSettings = deepMerge(defaultConfiguration, importedSettings) as configuration;
				// Validate number constraints
				try {
					validateNumbers(castSettings, numberConstraints);
				} catch (numError) {
					window.alert((numError as Error).message);
					return;
				}

				// Detect conflicts
				const { conflicts: detectedConflicts, resolved } = detectConflicts(castSettings);
				if (detectedConflicts.length > 0) {
					setPendingSettings(resolved);
					setConflicts(detectedConflicts);
					return;
				}

				// Store validated settings
				const validKeys = new Set(Object.keys(defaultConfiguration));
				const filteredConfig = Object.fromEntries(Object.entries(castSettings).filter(([key]) => validKeys.has(key)));
				const stateKeys = metadataRegistry.getAll().map((feature) => `state:${feature.id}` as const);
				const filteredState = Object.fromEntries(
					Object.entries(stateEntries).filter(([key]) => {
						return stateKeys.includes(key as string);
					})
				);
				await browser.storage.local.set({
					...filteredConfig,
					...filteredState
				});
				await refreshSettings();
				// Show a success notification.
				addNotification("success", (translations) => translations.pages.options.extras.importExportSettings.importButton.success);
			} catch (_) {
				// Handle any import errors.
				window.alert(t((translations) => translations.pages.options.extras.importExportSettings.importButton.error.unknown));
			}
			if (settingsImportRef.current) settingsImportRef.current.value = "";
		})();
	};
	function resetOptions() {
		addNotification("info", (translations) => translations.pages.options.notifications.info.reset, "reset_settings");
	}
	function clearData() {
		void (async () => {
			const userHasConfirmed = window.confirm(t((translations) => translations.pages.options.extras.clearData.confirmAlert));
			if (userHasConfirmed) {
				void browser.storage.local.set(defaultConfiguration);
				await refreshSettings();
				addNotification("success", (translations) => translations.pages.options.extras.clearData.allDataDeleted);
			}
		})();
	}
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
	const exportSettings = async () => {
		if (settings) {
			// Get the current settings
			const exportableSettings: configuration = Object.keys(defaultConfiguration).reduce(
				(acc, key) =>
					Object.assign(acc, {
						[key]: parseStoredValue(settings[key] as string)
					}),
				{} as configuration
			);
			const stateKeys = metadataRegistry.getAll().map((feature) => `state:${feature.id}` as const);
			const storedState = await browser.storage.local.get(stateKeys);
			const exportableState: FeatureState = stateKeys.reduce((acc, key) => Object.assign(acc, { [key]: storedState[key] }), {} as FeatureState);
			const exportableSettingsWithState = { ...exportableSettings, ...exportableState };
			// Get the current date and time, and format it for use in the filename.
			const timestamp = formatDateForFileName(new Date());
			// Create the filename.
			const filename = `youtube_enhancer_settings_${timestamp}.json`;
			// Convert the settings to JSON.
			const settingsJSON = JSON.stringify(exportableSettingsWithState);
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
	const openInNewTab = (path: string) => {
		const url = chrome.runtime.getURL(path);
		void chrome.tabs.create({ url });
	};
	return (
		<div className="sticky bottom-0 left-0 z-10 flex justify-between gap-1 bg-[#f5f5f5] p-2 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] dark:bg-[#181a1b] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.7)]">
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
				onClick={() => void exportSettings()}
				title={t((translations) => translations.pages.options.extras.importExportSettings.exportButton.title)}
				type="button"
				value={t((translations) => translations.pages.options.extras.importExportSettings.exportButton.value)}
			/>
			{notifications.filter((n) => n.action === "reset_settings").length > 0 ?
				<input
					className="danger p-2 text-sm sm:text-base md:text-lg dark:hover:bg-[rgba(24,26,27,0.5)]"
					id="confirm_button"
					onClick={() => {
						void (async () => {
							const notificationToRemove = notifications.find((n) => n.action === "reset_settings");
							if (notificationToRemove) {
								removeNotification(notificationToRemove);
							}
							void browser.storage.local.set({ ...defaultConfiguration, ...{ rememberVolume: settings.rememberVolume } });
							await refreshSettings();
							addNotification("success", (translations) => translations.pages.options.notifications.success.saved);
						})();
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
			<input accept=".json" hidden={true} id="import_settings_input" onChange={settingsImportChange} ref={settingsImportRef} type="file" />
			{conflicts.length > 0 && pendingSettings && (
				<ConflictResolutionDialog
					conflicts={conflicts}
					onCancel={() => {
						setConflicts([]);
						setPendingSettings(null);
					}}
					onResolve={(resolvedConfig) => {
						void (async () => {
							const validKeys = new Set(Object.keys(defaultConfiguration));
							const filteredConfig = Object.fromEntries(Object.entries(resolvedConfig).filter(([key]) => validKeys.has(key)));
							await browser.storage.local.set(filteredConfig);
							await refreshSettings();
							setConflicts([]);
							setPendingSettings(null);
						})();
					}}
					pendingSettings={pendingSettings}
				/>
			)}
		</div>
	);
}

function detectConflicts(settings: configuration): { conflicts: Conflict[]; resolved: configuration } {
	const conflicts: Conflict[] = [];
	const resolved = { ...settings };

	if (resolved.globalVolume?.enabled && resolved.rememberVolume?.enabled) {
		conflicts.push({ featureA: "globalVolume", featureB: "rememberVolume", type: "enabled" });
	}

	if (resolved.automaticallyDisableClosedCaptions?.enabled && resolved.automaticallyEnableClosedCaptions?.enabled) {
		conflicts.push({ featureA: "automaticallyDisableClosedCaptions", featureB: "automaticallyEnableClosedCaptions", type: "enabled" });
	}

	if (
		resolved.scrollWheelVolumeControl?.enabled &&
		resolved.scrollWheelSpeedControl?.enabled &&
		resolved.scrollWheelVolumeControl?.modifierKey === resolved.scrollWheelSpeedControl?.modifierKey
	) {
		conflicts.push({
			featureA: "scrollWheelVolumeControl",
			featureB: "scrollWheelSpeedControl",
			key: resolved.scrollWheelVolumeControl.modifierKey,
			type: "modifierKey"
		});
	}

	return { conflicts, resolved };
}
