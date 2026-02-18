import { type ChangeEventHandler, useRef } from "react";
import { MdOutlineOpenInNew } from "react-icons/md";
import { generateErrorMessage } from "zod-error";

import type { configuration } from "@/src/types";

import ScrollHint from "@/src/components/Settings/components/ScrollHint";
import { getSettings, useSettings } from "@/src/components/Settings/Settings";
import { useNotifications } from "@/src/hooks";
import { configurationImportSchema, defaultConfiguration, numberConstraints, validateNumbers } from "@/src/utils/constants";
import { updateStoredSettings } from "@/src/utils/updateStoredSettings";
import { deepMerge, formatDateForFileName, parseStoredValue } from "@/src/utils/utilities";
export default function SettingsFooter() {
	const {
		i18nInstance: { t },
		settings,
		settingsMutate
	} = useSettings();
	const isPopup = window.location.href.match(/.+\/src\/pages\/popup\/index\.html/g);
	const { addNotification, notifications, removeNotification } = useNotifications();
	const settingsImportRef = useRef<HTMLInputElement>(null);
	const settingsImportChange: ChangeEventHandler<HTMLInputElement> = (event): void => {
		void (async () => {
			const { target } = event;
			if (!target) return;
			const { files } = target as HTMLInputElement;
			const file = files?.[0];
			if (!file) return;
			try {
				const fileContents = await file.text();
				const importedSettings = JSON.parse(fileContents);
				// Validate the imported settings.
				const result = configurationImportSchema.safeParse(importedSettings);
				if (!result.success) {
					const errorMessage = generateErrorMessage(result.error.issues);
					window.alert(
						t((translations) => translations.pages.options.extras.importExportSettings.importButton.error.validation, { ERROR_MESSAGE: errorMessage })
					);
					return;
				}
				const castSettings = deepMerge(defaultConfiguration, importedSettings as configuration) as configuration;
				// Validate number constraints
				try {
					validateNumbers(castSettings, numberConstraints);
				} catch (numError) {
					window.alert((numError as Error).message);
					return;
				}
				// Store validated settings
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
		const userHasConfirmed = window.confirm(t((translations) => translations.pages.options.extras.clearData.confirmAlert));
		if (userHasConfirmed) {
			for (const key of Object.keys(defaultConfiguration)) {
				if (typeof defaultConfiguration[key] !== "string") {
					localStorage.setItem(key, JSON.stringify(defaultConfiguration[key]));
					void chrome.storage.local.set({ [key]: JSON.stringify(defaultConfiguration[key]) });
				} else {
					localStorage.setItem(key, defaultConfiguration[key]);
					void chrome.storage.local.set({ [key]: defaultConfiguration[key] });
				}
			}
			addNotification("success", (translations) => translations.pages.options.extras.clearData.allDataDeleted);
		}
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
	const exportSettings = () => {
		if (settings) {
			// Get the current settings
			const exportableSettings: configuration = Object.keys(defaultConfiguration).reduce(
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
	const openInNewTab = (path: string) => {
		const url = chrome.runtime.getURL(path);
		void chrome.tabs.create({ url });
	};
	return (
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
						for (const key of Object.keys(defaultConfiguration)) {
							if (typeof defaultConfiguration[key] !== "string") {
								localStorage.setItem(key, JSON.stringify(defaultConfiguration[key]));
								void chrome.storage.local.set({ [key]: JSON.stringify(defaultConfiguration[key]) });
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
			<ScrollHint />
			<input accept=".json" hidden={true} id="import_settings_input" onChange={settingsImportChange} ref={settingsImportRef} type="file" />
		</div>
	);
}
