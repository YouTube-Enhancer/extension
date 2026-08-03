import type { JSX } from "react";

import { useMutation } from "@tanstack/react-query";

import type { FeatureKeys, FeatureSettingNode } from "@/src/features/_registry/types";

import { DevToolsEmpty } from "@/components/devtools/components/DevToolsMessage";
import { featureConfigUpdateQuery } from "@/components/devtools/hooks/useDevToolsQuery";
import { useDevToolsTranslations } from "@/src/components/devtools/hooks/useDevToolsTranslations";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { useNotifications } from "@/src/hooks";
import { fullscreenPlacements } from "@/src/types";

import type { ConfigSlideOverProps } from "./types";

import ConfigInput from "./ConfigInput";
import { useConfigSettings } from "./useConfigSettings";
import { getSettingConfigs } from "./utils";

type MultiButtonConfig = { buttons?: Record<string, { fullscreenPlacement?: string; placement?: string }> };

export type { ConfigInputProps, ConfigSlideOverProps, SettingItem } from "./types";

type SingleButtonConfig = { button?: { fullscreenPlacement?: string; placement?: string } };

export default function ConfigSlideOver<F extends FeatureKeys>({
	allConfigs,
	currentConfig,
	featureId,
	isOpen,
	onClose,
	onConfigSaved
}: ConfigSlideOverProps<F>): JSX.Element | null {
	const { addNotification } = useNotifications();
	const { handleChange, settings } = useConfigSettings<F>(featureId, currentConfig);
	const t = useDevToolsTranslations();
	const updateMutation = useMutation({
		mutationFn: async ({ id, path, value }: { id: FeatureKeys; path: string; value: unknown }) => {
			return featureConfigUpdateQuery(id, path, value).queryFn();
		},
		onError: (_error: unknown) => {
			console.error("[ConfigSlideOver] Mutation failed to save config:", { error: _error, featureId });
			addNotification("error", () => "Failed to save config");
		},
		onSuccess: () => {
			onConfigSaved();
			addNotification("success", () => "Config saved");
		}
	});
	const metadata = featureId ? (metadataRegistry.get(featureId) ?? null) : null;
	if (!isOpen || !metadata || !featureId) return null;
	const showSettings = getSettingConfigs<F>((metadata.settings ?? []) as FeatureSettingNode<F>[]);

	const handleSettingChange = (id: string, value: unknown) => {
		handleChange(id, value);
		updateMutation.mutate({
			id: featureId,
			path: id,
			value
		});
	};

	return (
		<div className="fixed inset-0 z-50 flex justify-end">
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />
			<div className="relative w-full max-w-md overflow-y-auto bg-[#1e1e1e] p-4 shadow-xl">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-medium text-[#d4d4d4]">{featureId} Config</h2>
					<button className="rounded p-1 text-[#6b6b6b] hover:bg-[#3c3c3c] hover:text-[#d4d4d4]" onClick={onClose}>
						×
					</button>
				</div>

				{showSettings.length === 0 && !hasButtonPlacement(currentConfig) && <DevToolsEmpty message="No configurable options" />}

				{showSettings.length > 0 && (
					<div className="space-y-4">
						{showSettings.map((setting) => (
							<ConfigInput<F>
								allConfigs={allConfigs}
								currentValue={settings.find((s) => s.id === setting.id)?.currentValue}
								key={setting.id}
								onChange={handleSettingChange}
								setting={setting}
								t={t}
							/>
						))}
					</div>
				)}

				{hasButtonPlacement(currentConfig) && (
					<div className="mt-6 border-t border-[#3c3c3c] pt-4">
						<h3 className="mb-3 text-sm font-medium text-[#d4d4d4]">Button Placement</h3>
						<ButtonPlacementSelector config={currentConfig} featureId={featureId} onChange={handleSettingChange} />
					</div>
				)}
			</div>
		</div>
	);
}
function ButtonPlacementSelector({
	config,
	featureId,
	onChange
}: {
	config: unknown;
	featureId: FeatureKeys;
	onChange: (path: string, value: unknown) => void;
}): JSX.Element | null {
	const t = useDevToolsTranslations();
	const placementOptions = [
		{ label: () => t((tr) => tr.pages.options.extras.buttonPlacement.select.options.below_player.value), value: "below_player" },
		{ label: () => t((tr) => tr.pages.options.extras.buttonPlacement.select.options.feature_menu.value), value: "feature_menu" },
		{ label: () => t((tr) => tr.pages.options.extras.buttonPlacement.select.options.player_controls_left.value), value: "player_controls_left" },
		{ label: () => t((tr) => tr.pages.options.extras.buttonPlacement.select.options.player_controls_right.value), value: "player_controls_right" }
	];
	const fullscreenPlacementOptions = fullscreenPlacements.map((p) => ({
		label: () => t((tr) => tr.pages.options.extras.buttonPlacement.select.options[p].value),
		value: p
	}));

	if (isSingleButtonConfig(config)) {
		return (
			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-3">
					<span className="shrink-0 text-xs text-[#969696]">{t((tr) => tr.pages.options.extras.buttonPlacement.select.normalLabel)}</span>
					<select
						className="w-auto rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-[#d4d4d4]"
						onChange={(e) => onChange(`${featureId}.button.placement`, e.target.value)}
						value={config.button?.placement ?? "player_controls_right"}
					>
						{placementOptions.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label()}
							</option>
						))}
					</select>
					<span className="shrink-0 text-xs text-[#969696]">{t((tr) => tr.pages.options.extras.buttonPlacement.select.fullscreenLabel)}</span>
					<select
						className="w-auto rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-[#d4d4d4]"
						onChange={(e) => onChange(`${featureId}.button.fullscreenPlacement`, e.target.value)}
						value={config.button?.fullscreenPlacement ?? "player_controls_right"}
					>
						{fullscreenPlacementOptions.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label()}
							</option>
						))}
					</select>
				</div>
			</div>
		);
	}

	if (isMultiButtonConfig(config)) {
		return (
			<div className="flex flex-col gap-3">
				{Object.entries(config.buttons ?? {}).map(([btnName, btnConfig]) => {
					const name = btnName as string;
					const cfg = btnConfig as undefined | { fullscreenPlacement?: string; placement?: string };
					return (
						<div className="flex flex-col gap-2" key={name}>
							<label className="text-xs text-[#969696]">{formatButtonName(name)}</label>
							<div className="flex items-center gap-3">
								<span className="shrink-0 text-xs text-[#969696]">{t((tr) => tr.pages.options.extras.buttonPlacement.select.normalLabel)}</span>
								<select
									className="w-auto rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-[#d4d4d4]"
									onChange={(e) => onChange(`${featureId}.buttons.${name}.placement`, e.target.value)}
									value={cfg?.placement ?? "player_controls_right"}
								>
									{placementOptions.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label()}
										</option>
									))}
								</select>
								<span className="shrink-0 text-xs text-[#969696]">{t((tr) => tr.pages.options.extras.buttonPlacement.select.fullscreenLabel)}</span>
								<select
									className="w-auto rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-[#d4d4d4]"
									onChange={(e) => onChange(`${featureId}.buttons.${name}.fullscreenPlacement`, e.target.value)}
									value={cfg?.fullscreenPlacement ?? "player_controls_right"}
								>
									{fullscreenPlacementOptions.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label()}
										</option>
									))}
								</select>
							</div>
						</div>
					);
				})}
			</div>
		);
	}

	return null;
}

function formatButtonName(buttonName: string): string {
	return buttonName
		.replace(/Button$/, "")
		.replace(/([A-Z])/g, " $1")
		.trim()
		.replace(/^./, (str) => str.toUpperCase());
}

function hasButtonPlacement(config: unknown): boolean {
	if (!config || typeof config !== "object") return false;
	return "button" in config || "buttons" in config;
}

function isMultiButtonConfig(config: unknown): config is MultiButtonConfig {
	return config !== null && typeof config === "object" && "buttons" in config;
}

function isSingleButtonConfig(config: unknown): config is SingleButtonConfig {
	return config !== null && typeof config === "object" && "button" in config;
}
