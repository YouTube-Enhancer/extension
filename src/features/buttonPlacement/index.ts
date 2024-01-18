import type { GetIconType } from "@/src/icons";
import type { ButtonPlacement, FeaturesThatHaveButtons } from "@/src/types";

import { waitForSpecificMessage } from "@/src/utils/utilities";

import { addFeatureItemToMenu, removeFeatureItemFromMenu } from "../featureMenu/utils";
import { type ListenerType, makeFeatureButton, placeButton } from "./utils";

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
			const button = makeFeatureButton(featureName, placement, label, icon, listener, isToggle);
			placeButton(button, placement);
			break;
		}
	}
}
export async function removeFeatureButton(featureName: FeaturesThatHaveButtons) {
	// Wait for the "options" message from the content script
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	if (!optionsData) return;
	const {
		data: { options }
	} = optionsData;
	// Extract the necessary properties from the options object
	const {
		button_placements: { [featureName]: buttonPlacement }
	} = options;
	switch (buttonPlacement) {
		case "feature_menu": {
			removeFeatureItemFromMenu(featureName);
			break;
		}
		case "below_player":
		case "player_controls_left":
		case "player_controls_right": {
			const button = document.querySelector<HTMLButtonElement>(`#yte-feature-${featureName}-button`);
			if (!button) return;
			button.remove();
			break;
		}
	}
}
