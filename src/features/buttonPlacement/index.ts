import type { GetIconType } from "@/src/icons";

import { enableFeatureMenu } from "@/src/features/featureMenu";

import "./index.css";

import { addFeatureItemToMenu, getFeatureMenuItem, removeFeatureItemFromMenu } from "@/src/features/featureMenu/utils";
import {
	type AllButtonNames,
	buttonNameToSettingName,
	type ButtonPlacement,
	type FullscreenPlacement,
	type SingleButtonFeatureNames
} from "@/src/types";
import { removeTooltip } from "@/src/utils/dom/tooltip";
import { waitForElement } from "@/src/utils/dom/wait";
import { waitForSpecificMessage } from "@/src/utils/messaging";
import { isNewYouTubeVideoLayout } from "@/src/utils/url";

import {
	getEffectivePlacement,
	getFeatureButton,
	getFeatureButtonId,
	isInTheaterMode,
	type ListenerType,
	makeFeatureButton,
	placeButton,
	trackButton,
	untrackButton
} from "./utils";

export async function addFeatureButton<Name extends AllButtonNames, Placement extends ButtonPlacement, Label extends string, Toggle extends boolean>(
	buttonName: Name,
	placement: Placement,
	label: Label,
	icon: GetIconType<Name, Placement>,
	listener: ListenerType<Toggle>,
	isToggle: boolean,
	initialChecked: boolean = false,
	fullscreenPlacement: FullscreenPlacement
) {
	const effectivePlacement = getEffectivePlacement(placement, fullscreenPlacement);
	const selector = getPlacementSelector(effectivePlacement);
	await enableFeatureMenu();
	if (selector) {
		const element = await waitForElement(selector);
		if (!element) return;
	}
	switch (effectivePlacement) {
		case "below_player":
		case "player_controls_left":
		case "player_controls_right": {
			const featureButton = getFeatureButton(buttonName);
			if (featureButton) await removeFeatureButton(buttonName);
			const button = await makeFeatureButton(
				buttonName,
				effectivePlacement,
				label,
				icon as GetIconType<Name, Exclude<ButtonPlacement, "feature_menu">>,
				listener,
				isToggle,
				initialChecked
			);
			await placeButton(button, effectivePlacement);
			break;
		}
		case "feature_menu": {
			const featureMenuItem = getFeatureMenuItem(buttonName);
			if (featureMenuItem) removeFeatureItemFromMenu(buttonName);
			if (icon instanceof SVGSVGElement) await addFeatureItemToMenu(buttonName, label, icon, listener, isToggle, initialChecked);
			break;
		}
	}
	trackButton(buttonName, placement, fullscreenPlacement, label, icon, listener, isToggle, initialChecked);
}
export async function removeFeatureButton<Name extends AllButtonNames>(buttonName: Name, placement?: ButtonPlacement) {
	untrackButton(buttonName);
	const { [buttonName]: featureName } = buttonNameToSettingName;
	if (placement === undefined) {
		const {
			data: { options }
		} = await waitForSpecificMessage("options", "request_data", "content");
		const { [featureName]: featureConfig } = options;
		if (typeof featureConfig === "object" && featureConfig !== null) {
			if ("buttons" in featureConfig) {
				placement = featureConfig.buttons?.[buttonName as keyof typeof featureConfig.buttons]?.placement;
			} else if ("button" in featureConfig) {
				placement = featureConfig.button?.placement;
			}
		}
	}
	switch (placement) {
		case "below_player":
		case "player_controls_left":
		case "player_controls_right": {
			const buttons = document.querySelectorAll<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`);
			if (buttons.length === 0) return;
			buttons.forEach((button) => button.remove());
			removeTooltip(`yte-feature-${featureName as SingleButtonFeatureNames}-tooltip`);
			break;
		}
		case "feature_menu": {
			removeFeatureItemFromMenu(buttonName);
			break;
		}
	}
}
function getPlacementSelector(placement: ButtonPlacement): string | undefined {
	if (placement === "below_player") {
		return (
			isInTheaterMode() ?
				isNewYouTubeVideoLayout() ? "ytd-watch-grid"
				:	"ytd-watch-flexy"
			:	"div#primary > div#primary-inner > div#player"
		);
	}
	if (placement === "feature_menu") return "#yte-feature-menu";
	if (placement === "player_controls_left") return ".ytp-left-controls";
	if (placement === "player_controls_right") return ".ytp-right-controls";
	return undefined;
}
