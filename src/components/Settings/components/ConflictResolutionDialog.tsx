import { useState } from "react";

import type { configuration } from "@/src/types";

import { useSettings } from "@/src/components/Settings/Settings";

const modifierKeyOptions = [
	{ label: "Ctrl", value: "ctrlKey" },
	{ label: "Alt", value: "altKey" },
	{ label: "Shift", value: "shiftKey" }
] as const;

type Conflict = {
	featureA: string;
	featureB: string;
	key?: string;
	type: "enabled" | "modifierKey";
};

type Props = {
	conflicts: Conflict[];
	onCancel: () => void;
	onResolve: (resolved: configuration) => void;
	pendingSettings: configuration;
};

export default function ConflictResolutionDialog({ conflicts, onCancel, onResolve, pendingSettings }: Props) {
	const { i18nInstance } = useSettings();
	const { t } = i18nInstance;

	const getConflictId = (conflict: Conflict) => `${conflict.featureA}-${conflict.featureB}`;

	const [selections, setSelections] = useState<Record<string, string>>(() => {
		const initial: Record<string, string> = {};
		for (const conflict of conflicts) {
			// eslint-disable-next-line prefer-destructuring
			initial[getConflictId(conflict)] = conflict.featureA;
		}
		return initial;
	});

	const [modifiedKeys, setModifiedKeys] = useState<Record<string, string>>(() => {
		const initial: Record<string, string> = {};
		for (const conflict of conflicts) {
			if (conflict.type === "modifierKey" && conflict.key) {
				// eslint-disable-next-line prefer-destructuring
				initial[getConflictId(conflict)] = conflict.key;
			}
		}
		return initial;
	});

	const isConflictResolved = (conflict: Conflict): boolean => {
		if (conflict.type === "enabled") {
			return true;
		}
		if (conflict.type === "modifierKey") {
			const { [getConflictId(conflict)]: currentKey } = modifiedKeys;
			return currentKey !== conflict.key;
		}
		return false;
	};

	const allConflictsResolved = conflicts.every(isConflictResolved);

	const handleApply = () => {
		if (!allConflictsResolved) return;

		const resolved = { ...pendingSettings };

		for (const conflict of conflicts) {
			const conflictId = getConflictId(conflict);

			if (conflict.type === "enabled") {
				const featureToKeep = selections[conflictId] ?? conflict.featureA;

				if (conflict.featureA === "globalVolume" || conflict.featureA === "rememberVolume") {
					(resolved.globalVolume as { enabled: boolean }).enabled = featureToKeep === "globalVolume";
					(resolved.rememberVolume as { enabled: boolean }).enabled = featureToKeep === "rememberVolume";
				} else if (conflict.featureA === "automaticallyDisableClosedCaptions" || conflict.featureA === "automaticallyEnableClosedCaptions") {
					(resolved.automaticallyDisableClosedCaptions as { enabled: boolean }).enabled = featureToKeep === "automaticallyDisableClosedCaptions";
					(resolved.automaticallyEnableClosedCaptions as { enabled: boolean }).enabled = featureToKeep === "automaticallyEnableClosedCaptions";
				}
			} else if (conflict.type === "modifierKey") {
				const { [conflictId]: newKey } = modifiedKeys;
				if (newKey && newKey !== conflict.key) {
					(resolved.scrollWheelVolumeControl as { modifierKey: string }).modifierKey = newKey;
				}
			}
		}

		onResolve(resolved);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-lg border border-gray-300 bg-[#f5f5f5] p-6 shadow-xl dark:multi-['border-gray-700;bg-[#181a1b]']">
				<h2 className="mb-4 text-xl font-bold text-black dark:text-white">{t((tr) => tr.pages.options.notifications.error.importConflict.title)}</h2>
				<div className="mb-6 space-y-4">
					{conflicts.map((conflict, index) => (
						<ConflictItem
							conflict={conflict}
							conflictId={getConflictId(conflict)}
							isResolved={isConflictResolved(conflict)}
							key={index}
							modifiedKey={modifiedKeys[getConflictId(conflict)] ?? conflict.key}
							onKeyChange={(key) => setModifiedKeys((prev) => ({ ...prev, [getConflictId(conflict)]: key }))}
							onSelectionChange={(feature) => setSelections((prev) => ({ ...prev, [getConflictId(conflict)]: feature }))}
							selectedFeature={selections[getConflictId(conflict)] ?? conflict.featureA}
						/>
					))}
				</div>
				<div className="flex justify-end gap-3">
					<button
						className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-100 dark:multi-['border-gray-700;bg-[#23272a];text-white;hover:bg-[#2f3335]']"
						onClick={onCancel}
					>
						{t((tr) => tr.pages.options.notifications.error.importConflict.cancel)}
					</button>
					<button
						className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
							allConflictsResolved ? "bg-blue-600 text-white hover:bg-blue-700" : "cursor-not-allowed bg-gray-400 text-gray-200"
						}`}
						disabled={!allConflictsResolved}
						onClick={handleApply}
					>
						{t((tr) => tr.pages.options.notifications.error.importConflict.apply)}
					</button>
				</div>
				{!allConflictsResolved && (
					<p className="mt-3 text-xs text-red-500 dark:text-red-400">
						{t((tr) => tr.pages.options.notifications.error.importConflict.resolveConflict)}
					</p>
				)}
			</div>
		</div>
	);
}

function ConflictItem({
	conflict,
	conflictId,
	isResolved,
	modifiedKey,
	onKeyChange,
	onSelectionChange,
	selectedFeature
}: {
	conflict: Conflict;
	conflictId: string;
	isResolved: boolean;
	modifiedKey?: string;
	onKeyChange: (key: string) => void;
	onSelectionChange: (feature: string) => void;
	selectedFeature: string;
}) {
	if (conflict.type === "enabled") {
		return (
			<EnabledConflictItem
				conflict={conflict}
				featureALabel={getFeatureLabel(conflict.featureA)}
				featureBLabel={getFeatureLabel(conflict.featureB)}
				onSelectionChange={onSelectionChange}
				selectedFeature={selectedFeature}
			/>
		);
	}

	if (conflict.type === "modifierKey") {
		return (
			<ModifierKeyConflictItem
				conflict={conflict}
				conflictId={conflictId}
				featureALabel={getFeatureLabel(conflict.featureA)}
				featureBLabel={getFeatureLabel(conflict.featureB)}
				isResolved={isResolved}
				modifiedKey={modifiedKey}
				onKeyChange={onKeyChange}
			/>
		);
	}

	return null;
}

function EnabledConflictItem({
	conflict,
	featureALabel,
	featureBLabel,
	onSelectionChange,
	selectedFeature
}: {
	conflict: Conflict;
	featureALabel: string;
	featureBLabel: string;
	onSelectionChange: (feature: string) => void;
	selectedFeature: string;
}) {
	const { i18nInstance } = useSettings();
	const { t } = i18nInstance;

	return (
		<div className="rounded-lg border border-gray-300 bg-white p-4 dark:multi-['border-gray-700;bg-[#23272a]']">
			<p className="mb-3 text-sm text-black dark:text-white">
				{t((tr) => tr.pages.options.notifications.error.importConflict.enabledConflict.description, {
					FEATURE_A: featureALabel,
					FEATURE_B: featureBLabel
				})}
			</p>
			<div className="flex flex-col gap-2">
				<label className="flex cursor-pointer items-center gap-2">
					<input
						checked={selectedFeature === conflict.featureA}
						className="size-4 accent-blue-600"
						name={`conflict-${conflict.featureA}-${conflict.featureB}`}
						onChange={() => onSelectionChange(conflict.featureA)}
						type="radio"
					/>
					<span className="text-sm text-black dark:text-white">{featureALabel}</span>
				</label>
				<label className="flex cursor-pointer items-center gap-2">
					<input
						checked={selectedFeature === conflict.featureB}
						className="size-4 accent-blue-600"
						name={`conflict-${conflict.featureA}-${conflict.featureB}`}
						onChange={() => onSelectionChange(conflict.featureB)}
						type="radio"
					/>
					<span className="text-sm text-black dark:text-white">{featureBLabel}</span>
				</label>
			</div>
		</div>
	);
}

function getFeatureLabel(featureId: string): string {
	const defaults: Record<string, string> = {
		automaticallyDisableClosedCaptions: "Auto Disable Captions",
		automaticallyEnableClosedCaptions: "Auto Enable Captions",
		globalVolume: "Global Volume",
		rememberVolume: "Remember Volume",
		scrollWheelSpeedControl: "Scroll Wheel Speed Control",
		scrollWheelVolumeControl: "Scroll Wheel Volume Control"
	};

	return defaults[featureId] ?? featureId;
}

function ModifierKeyConflictItem({
	conflict,
	featureALabel,
	featureBLabel,
	isResolved,
	modifiedKey,
	onKeyChange
}: {
	conflict: Conflict;
	conflictId: string;
	featureALabel: string;
	featureBLabel: string;
	isResolved: boolean;
	modifiedKey?: string;
	onKeyChange: (key: string) => void;
}) {
	const { i18nInstance } = useSettings();
	const { t } = i18nInstance;

	return (
		<div
			className={`rounded-lg border p-4 ${isResolved ? "border-green-500 bg-white dark:border-green-600 dark:bg-[#23272a]" : "border-red-500 bg-white dark:border-red-600 dark:bg-[#23272a]"}`}
		>
			<p className="mb-3 text-sm text-black dark:text-white">
				{t((tr) => tr.pages.options.notifications.error.importConflict.modifierKeyConflict.description, {
					FEATURE_A: featureALabel,
					FEATURE_B: featureBLabel
				})}
			</p>
			<div className="mb-3 flex flex-col gap-2">
				<span className="text-xs font-medium text-black dark:text-white">{featureALabel}</span>
				<span className="text-xs font-medium text-black dark:text-white">{featureBLabel}</span>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-sm text-black dark:text-white">
					{t((tr) => tr.pages.options.notifications.error.importConflict.modifierKeyConflict.selectNewKey)}
				</span>
				<select
					className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-black dark:multi-['border-gray-700;bg-[#2f3335];text-white']"
					onChange={(e) => onKeyChange(e.target.value)}
					value={modifiedKey ?? conflict.key}
				>
					{modifierKeyOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
