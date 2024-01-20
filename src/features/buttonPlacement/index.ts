import type { GetIconType } from "@/src/icons";
import type { ButtonPlacement, FeaturesThatHaveButtons } from "@/src/types";

import { addFeatureItemToMenu, removeFeatureItemFromMenu } from "@/src/features/featureMenu/utils";
import { removeTooltip, waitForSpecificMessage } from "@/src/utils/utilities";

import { type ListenerType, getFeatureButtonId, makeFeatureButton, placeButton } from "./utils";
export const featuresInControls = new Set<FeaturesThatHaveButtons>();

export async function addFeatureButton<
	Name extends FeaturesThatHaveButtons,
	Placement extends ButtonPlacement,
	Label extends string,
	Toggle extends boolean
>(featureName: Name, placement: Placement, label: Label, icon: GetIconType<Name, Placement>, listener: ListenerType<Toggle>, isToggle: boolean) {
	switch (placement) {
		case "feature_menu": {
			if (icon instanceof SVGSVGElement) await addFeatureItemToMenu(featureName, label, icon, listener, isToggle);
			break;
		}
		case "below_player":
		case "player_controls_left":
		case "player_controls_right": {
			// Add the feature name to the set of features in the controls
			featuresInControls.add(featureName);
			const button = makeFeatureButton(featureName, placement, label, icon, listener, isToggle);
			placeButton(button, placement);
			break;
		}
	}
}
export async function removeFeatureButton<Name extends FeaturesThatHaveButtons>(featureName: Name, placement?: ButtonPlacement) {
	if (placement === undefined) {
		// Wait for the "options" message from the content script
		const optionsData = await waitForSpecificMessage("options", "request_data", "content");
		if (!optionsData) return;
		({
			data: {
				options: {
					button_placements: { [featureName]: placement }
				}
			}
		} = optionsData);
	}
	switch (placement) {
		case "feature_menu": {
			removeFeatureItemFromMenu(featureName);
			break;
		}
		case "below_player":
		case "player_controls_left":
		case "player_controls_right": {
			// Remove the feature name from the set of features in the controls
			featuresInControls.delete(featureName);
			const button = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(featureName)}`);
			if (!button) return;
			button.remove();
			removeTooltip(`yte-feature-${featureName}-tooltip`);
			break;
		}
	}
}
