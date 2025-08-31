import type { GetIconType } from "@/src/icons";
import type { AllButtonNames, ButtonPlacement, MultiButtonNames, SingleButtonFeatureNames } from "@/src/types";

import { addFeatureItemToMenu, removeFeatureItemFromMenu } from "@/src/features/featureMenu/utils";
import { findKeyByValue, removeTooltip, waitForSpecificMessage } from "@/src/utils/utilities";

import { getFeatureButtonId, type ListenerType, makeFeatureButton, placeButton } from "./utils";
export const featuresInControls = new Set<AllButtonNames>();

export async function addFeatureButton<Name extends AllButtonNames, Placement extends ButtonPlacement, Label extends string, Toggle extends boolean>(
	buttonName: Name,
	placement: Placement,
	label: Label,
	icon: GetIconType<Name, Placement>,
	listener: ListenerType<Toggle>,
	isToggle: boolean,
	initialChecked: boolean = false
) {
	switch (placement) {
		case "below_player":
		case "player_controls_left":
		case "player_controls_right": {
			// Add the feature name to the set of features in the controls
			featuresInControls.add(buttonName);
			const button = await makeFeatureButton(buttonName, placement, label, icon, listener, isToggle, initialChecked);
			placeButton(button, placement);
			break;
		}
		case "feature_menu": {
			if (icon instanceof SVGSVGElement) await addFeatureItemToMenu(buttonName, label, icon, listener, isToggle, initialChecked);
			break;
		}
	}
}
export async function removeFeatureButton<Name extends AllButtonNames>(buttonName: Name, placement?: ButtonPlacement) {
	const featureName = findKeyByValue(buttonName as MultiButtonNames) ?? (buttonName as SingleButtonFeatureNames);
	if (placement === undefined) {
		// Wait for the "options" message from the content script
		({
			data: {
				options: {
					button_placements: { [buttonName]: placement }
				}
			}
		} = await waitForSpecificMessage("options", "request_data", "content"));
	}
	switch (placement) {
		case "below_player":
		case "player_controls_left":
		case "player_controls_right": {
			// Remove the feature name from the set of features in the controls
			featuresInControls.delete(buttonName);
			const button = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`);
			if (!button) return;
			button.remove();
			removeTooltip(`yte-feature-${featureName}-tooltip`);
			break;
		}
		case "feature_menu": {
			removeFeatureItemFromMenu(buttonName);
			break;
		}
	}
}
