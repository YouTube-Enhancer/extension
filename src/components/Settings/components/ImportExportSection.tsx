import { type ChangeEventHandler, type DragEvent, useRef, useState } from "react";
import { MdDownload, MdUpload } from "react-icons/md";
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

export default function ImportExportSection() {
	const {
		i18nInstance: { t },
		settings,
		settingsMutate
	} = useSettings();
	const { addNotification } = useNotifications();
	const settingsImportRef = useRef<HTMLInputElement>(null);
	const [conflicts, setConflicts] = useState<Conflict[]>([]);
	const [pendingSettings, setPendingSettings] = useState<configuration | null>(null);
	const [isDraggingOver, setIsDraggingOver] = useState(false);
	const defaultConfiguration = getDefaultConfiguration();
	const configurationImportSchema = getConfigurationImportSchema();

	async function refreshSettings() {
		await updateStoredSettings();
		settingsMutate.mutate(await getSettings());
	}

	async function processImportedText(fileContents: string) {
		try {
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
			if (isLegacyConfiguration(configEntries)) {
				importedSettings = migrateConfiguration(configEntries, defaultConfiguration);
			} else {
				importedSettings = configEntries as configuration;
			}
			const result = configurationImportSchema.safeParse(importedSettings);
			if (!result.success) {
				const errorMessage = generateErrorMessage(result.error.issues);
				window.alert(
					t((translations) => translations.pages.options.extras.importExportSettings.importButton.error.validation, { ERROR_MESSAGE: errorMessage })
				);
				return;
			}
			const castSettings = deepMerge(defaultConfiguration, importedSettings) as configuration;
			try {
				validateNumbers(castSettings, numberConstraints);
			} catch (numError) {
				window.alert((numError as Error).message);
				return;
			}
			const { conflicts: detectedConflicts, resolved } = detectConflicts(castSettings);
			if (detectedConflicts.length > 0) {
				setPendingSettings(resolved);
				setConflicts(detectedConflicts);
				return;
			}
			const validKeys = new Set(Object.keys(defaultConfiguration));
			const filteredConfig = Object.fromEntries(Object.entries(castSettings).filter(([key]) => validKeys.has(key)));
			const stateKeys = metadataRegistry.getAll().map((feature) => `state:${feature.id}` as const);
			const filteredState = Object.fromEntries(Object.entries(stateEntries).filter(([key]) => stateKeys.includes(key as string)));
			await browser.storage.local.set({ ...filteredConfig, ...filteredState });
			await refreshSettings();
			addNotification("success", (translations) => translations.pages.options.extras.importExportSettings.importButton.success);
		} catch (_) {
			window.alert(t((translations) => translations.pages.options.extras.importExportSettings.importButton.error.unknown));
		}
	}

	const settingsImportChange: ChangeEventHandler<HTMLInputElement> = (event): void => {
		void (async () => {
			const { target } = event;
			if (!target) return;
			const { files } = target as HTMLInputElement;
			const file = files?.[0];
			if (!file) return;
			const fileContents = await file.text();
			await processImportedText(fileContents);
			if (settingsImportRef.current) settingsImportRef.current.value = "";
		})();
	};

	function handleDragOver(e: DragEvent<HTMLButtonElement>) {
		e.preventDefault();
		setIsDraggingOver(true);
	}
	function handleDragLeave() {
		setIsDraggingOver(false);
	}
	function handleDrop(e: DragEvent<HTMLButtonElement>) {
		e.preventDefault();
		setIsDraggingOver(false);
		const file = e.dataTransfer.files.item(0);
		if (!file) return;
		void file.text().then(processImportedText);
	}

	function importSettings() {
		if (settingsImportRef.current === null) return;
		settingsImportRef.current.click();
	}

	const exportSettings = async () => {
		if (settings) {
			const exportableSettings: configuration = Object.keys(defaultConfiguration).reduce(
				(acc, key) => Object.assign(acc, { [key]: parseStoredValue(settings[key] as string) }),
				{} as configuration
			);
			const stateKeys = metadataRegistry.getAll().map((feature) => `state:${feature.id}` as const);
			const storedState = await browser.storage.local.get(stateKeys);
			const exportableState: FeatureState = stateKeys.reduce((acc, key) => Object.assign(acc, { [key]: storedState[key] }), {} as FeatureState);
			const exportableSettingsWithState = { ...exportableSettings, ...exportableState };
			const timestamp = formatDateForFileName(new Date());
			const filename = `youtube_enhancer_settings_${timestamp}.json`;
			const settingsJSON = JSON.stringify(exportableSettingsWithState);
			const blob = new Blob([settingsJSON], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			a.click();
			addNotification("success", (translations) => translations.pages.options.extras.importExportSettings.exportButton.success);
		}
	};

	return (
		<div className="rounded-xl bg-[var(--card-bg)] p-3 shadow-sm">
			<p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--card-text-muted)]">Import & Export</p>
			<div className="grid grid-cols-2 gap-2">
				<button
					className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed py-4 text-xs font-medium transition-all duration-150 ${
						isDraggingOver ?
							"border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
						:	"border-[var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
					}`}
					id="import_settings_button"
					onClick={importSettings}
					onDragLeave={handleDragLeave}
					onDragOver={handleDragOver}
					onDrop={handleDrop}
					title={t((translations) => translations.pages.options.extras.importExportSettings.importButton.title)}
					type="button"
				>
					<MdDownload size={22} />
					<span>{t((translations) => translations.pages.options.extras.importExportSettings.importButton.value)}</span>
					<span className="text-[10px] opacity-50">or drop a .json file</span>
				</button>
				<button
					className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] py-4 text-xs font-medium text-[var(--btn-secondary-text)] transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)]"
					id="export_settings_button"
					onClick={() => void exportSettings()}
					title={t((translations) => translations.pages.options.extras.importExportSettings.exportButton.title)}
					type="button"
				>
					<MdUpload size={22} />
					<span>{t((translations) => translations.pages.options.extras.importExportSettings.exportButton.value)}</span>
					<span className="text-[10px] opacity-50">saves as JSON</span>
				</button>
			</div>
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
