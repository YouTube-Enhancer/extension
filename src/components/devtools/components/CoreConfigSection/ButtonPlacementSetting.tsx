import type { JSX } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FeatureKeys } from "@/src/features/_registry/types";
import type { i18nInstanceType } from "@/src/i18n";

import DevToolsLoader from "@/components/devtools/components/DevToolsLoader";
import { coreConfigQuery } from "@/components/devtools/hooks/useDevToolsQuery";
import { useDevToolsTranslations } from "@/src/components/devtools/hooks/useDevToolsTranslations";
import { useNotifications } from "@/src/hooks";
import { type AllButtonNames, buttonNames, buttonNameToSettingName, type configuration, fullscreenPlacements, type Nullable } from "@/src/types";
import { sendDevToolsMessage } from "@/src/utils/messaging/devtools";

type ButtonConfig = {
	button?: { enabled?: boolean; fullscreenPlacement?: string; placement?: string };
	buttons?: Record<string, { enabled?: boolean; fullscreenPlacement?: string; placement?: string }>;
};

export default function ButtonPlacementSetting({ config }: { config: configuration }): JSX.Element {
	const queryClient = useQueryClient();
	const { addNotification } = useNotifications();
	const { isPending } = useQuery(coreConfigQuery);
	const t = useDevToolsTranslations();

	const updateMutation = useMutation({
		async mutationFn({ featureId, path, value }: { featureId: FeatureKeys; path: string; value: string }) {
			await sendDevToolsMessage("devtools_update_feature_config", { id: featureId, path, value });
		},
		onError: () => {
			addNotification("error", () => "Failed to save");
		},
		onSuccess: async () => {
			await new Promise((resolve) => setTimeout(resolve, 100));
			void queryClient.invalidateQueries({ queryKey: ["devtools", "coreConfig"] });
			addNotification("success", () => "Saved");
		}
	});

	const handleChange = (featureId: FeatureKeys, path: string, value: string) => {
		console.log("[DEBUG-BP] handleChange", { featureId, path, value });
		void updateMutation.mutateAsync({ featureId, path, value });
	};

	if (isPending) return <DevToolsLoader message="Loading button placements..." />;

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

	return (
		<div className="flex flex-col gap-4 rounded border border-[#3c3c3c] p-4">
			<h3 className="text-sm font-medium text-[#d4d4d4]">{t((tr) => tr.pages.options.extras.buttonPlacement.title)}</h3>
			{buttonNames.map((buttonName) => {
				const info = getButtonPlacementInfo(buttonName);
				const fullscreenInfo = getFullscreenPlacementInfo(buttonName);
				if (!info || !fullscreenInfo) return null;

				const { featureId } = info;
				const featureConfig = config[featureId] as ButtonConfig | undefined;
				let currentPlacement = "player_controls_right";
				let currentFullscreenPlacement: string = "player_controls_right";
				let isEnabled = false;

				if (featureConfig?.button) {
					currentPlacement = featureConfig.button.placement ?? "player_controls_right";
					currentFullscreenPlacement = featureConfig.button.fullscreenPlacement ?? "player_controls_right";
					isEnabled = featureConfig.button.enabled ?? false;
				} else if (featureConfig?.buttons && buttonName in featureConfig.buttons) {
					currentPlacement = featureConfig.buttons[buttonName]?.placement ?? "player_controls_right";
					currentFullscreenPlacement = featureConfig.buttons[buttonName]?.fullscreenPlacement ?? "player_controls_right";
					isEnabled = featureConfig.buttons[buttonName]?.enabled ?? false;
				}

				const buttonLabel = t((tr) => tr.pages.options.extras.buttonPlacement.select.buttonNames[buttonName]);
				const placementText = getPlacementDescription(currentPlacement, t);
				const title = t((tr) => tr.pages.options.extras.buttonPlacement.select.title, {
					BUTTON_NAME: buttonLabel.toLowerCase(),
					PLACEMENT: placementText
				});
				const fullscreenPlacementText = getPlacementDescription(currentFullscreenPlacement, t);
				const fullscreenTitle = t((tr) => tr.pages.options.extras.buttonPlacement.select.fullscreenTitle, {
					BUTTON_NAME: buttonLabel.toLowerCase(),
					PLACEMENT: fullscreenPlacementText
				});

				return (
					<div className="flex flex-col gap-2" key={buttonName}>
						<div className="mb-1 text-xs text-[#969696]">{buttonLabel}</div>
						<div className="flex items-center gap-3">
							<span className="shrink-0 text-xs text-[#969696]">{t((tr) => tr.pages.options.extras.buttonPlacement.select.normalLabel)}</span>
							<select
								className="w-auto rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-[#d4d4d4]"
								disabled={!isEnabled}
								onChange={(e) => handleChange(info.featureId, info.path, e.target.value)}
								title={title}
								value={currentPlacement}
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
								disabled={!isEnabled}
								onChange={(e) => handleChange(fullscreenInfo.featureId, fullscreenInfo.path, e.target.value)}
								title={fullscreenTitle}
								value={currentFullscreenPlacement}
							>
								{fullscreenPlacementOptions.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label()}
									</option>
								))}
							</select>
						</div>
						{!isEnabled && <span className="text-xs text-[#6b6b6b]">Enable the feature to change placement</span>}
					</div>
				);
			})}
		</div>
	);
}

function getButtonPlacementInfo(buttonName: AllButtonNames): Nullable<{ featureId: FeatureKeys; path: string }> {
	const featureId = buttonNameToSettingName[buttonName] as FeatureKeys | undefined;
	if (!featureId) return null;

	switch (buttonName) {
		case "decreasePlaybackSpeedButton":
		case "increasePlaybackSpeedButton":
			return { featureId, path: "playbackSpeedButtons.button.placement" };
		case "flipVideoHorizontalButton":
		case "flipVideoVerticalButton":
			return { featureId, path: `flipVideoButtons.buttons.${buttonName}.placement` };
		case "forwardButton":
		case "rewindButton":
			return { featureId, path: "forwardRewindButtons.button.placement" };
		case "volumeBoostButton":
			return { featureId, path: "volumeBoost.button.placement" };
		default:
			return { featureId, path: `${featureId}.button.placement` };
	}
}

function getFullscreenPlacementInfo(buttonName: AllButtonNames): Nullable<{ featureId: FeatureKeys; path: string }> {
	const featureId = buttonNameToSettingName[buttonName] as FeatureKeys | undefined;
	if (!featureId) return null;

	switch (buttonName) {
		case "decreasePlaybackSpeedButton":
		case "increasePlaybackSpeedButton":
			return { featureId, path: "playbackSpeedButtons.button.fullscreenPlacement" };
		case "flipVideoHorizontalButton":
		case "flipVideoVerticalButton":
			return { featureId, path: `flipVideoButtons.buttons.${buttonName}.fullscreenPlacement` };
		case "forwardButton":
		case "rewindButton":
			return { featureId, path: "forwardRewindButtons.button.fullscreenPlacement" };
		case "volumeBoostButton":
			return { featureId, path: "volumeBoost.button.fullscreenPlacement" };
		default:
			return { featureId, path: `${featureId}.button.fullscreenPlacement` };
	}
}

function getPlacementDescription(placement: string, t: i18nInstanceType["t"]): string {
	switch (placement) {
		case "below_player":
			return t((tr) => tr.pages.options.extras.buttonPlacement.select.options.below_player.placement);
		case "feature_menu":
			return t((tr) => tr.pages.options.extras.buttonPlacement.select.options.feature_menu.placement);
		case "player_controls_left":
			return t((tr) => tr.pages.options.extras.buttonPlacement.select.options.player_controls_left.placement);
		case "player_controls_right":
			return t((tr) => tr.pages.options.extras.buttonPlacement.select.options.player_controls_right.placement);
		default:
			return "";
	}
}
