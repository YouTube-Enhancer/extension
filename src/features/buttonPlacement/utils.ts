import { type GetIconType } from "@/src/icons";
import { type ButtonPlacement, type FeaturesThatHaveButtons } from "@/src/types";
import eventManager from "@/src/utils/EventManager";
import { createStyledElement, createTooltip } from "@/src/utils/utilities";

import { getFeatureIds } from "../featureMenu/utils";
// TODO: fix icon type for toggle buttons

export type ListenerType<Toggle extends boolean> = Toggle extends true ? (checked?: boolean) => void : () => void;

function buttonClickListener<Placement extends ButtonPlacement, Name extends FeaturesThatHaveButtons, Toggle extends boolean>(
	button: HTMLButtonElement,
	icon: GetIconType<Name, Placement>,
	listener: ListenerType<Toggle>,
	isToggle: boolean
) {
	if (isToggle) {
		button.ariaChecked = button.ariaChecked ? (!JSON.parse(button.ariaChecked)).toString() : "false";
		// TODO: add language strings for toggle features and update the tooltip text
		if (typeof icon === "object" && "off" in icon && "on" in icon) {
			updateFeatureButtonIcon(button, JSON.parse(button.ariaChecked) ? icon.on : icon.off);
		} else if (typeof icon === "object" && icon instanceof SVGSVGElement) {
			updateFeatureButtonIcon(button, icon);
		}
		listener(JSON.parse(button.ariaChecked) as boolean);
	} else {
		listener();
	}
}

export function makeFeatureButton<Name extends FeaturesThatHaveButtons, Placement extends ButtonPlacement, Toggle extends boolean>(
	featureName: Name,
	placement: Placement,
	label: string,
	icon: GetIconType<Name, Placement>,
	listener: ListenerType<Toggle>,
	isToggle: boolean
) {
	if (placement === "feature_menu") throw new Error("Cannot make a feature button for the feature menu");
	const buttonExists = document.querySelector(`button#${getFeatureButtonId(featureName)}`) !== null;
	// TODO: fix right controls button making control buttons overflow
	const button = createStyledElement({
		classlist: ["ytp-button"],
		elementId: `${getFeatureButtonId(featureName)}`,
		elementType: "button",
		styles: {
			alignContent: "center",
			display: "flex",
			flexWrap: "wrap",
			height: "48px",
			justifyContent: "center",
			padding: "0px 4px",
			width: "48px"
		}
	});
	const { listener: tooltipListener } = createTooltip({
		direction: placement === "below_player" ? "up" : "up",
		element: button,
		featureName,
		id: `yte-feature-${featureName}-tooltip`,
		text: label
	});
	if (buttonExists) {
		eventManager.removeEventListener(button, "click", featureName);
		eventManager.addEventListener(button, "click", () => buttonClickListener<Placement, Name, Toggle>(button, icon, listener, isToggle), featureName);
		eventManager.removeEventListener(button, "mouseover", featureName);
		eventManager.addEventListener(button, "mouseover", tooltipListener, featureName);
		return button;
	}

	button.dataset.title = label;
	if (isToggle) {
		button.ariaChecked = "false";
		if (typeof icon === "object" && "off" in icon && "on" in icon) {
			button.append(icon.off);
		} else if (typeof icon === "object" && icon instanceof SVGSVGElement) {
			button.append(icon);
		}
	}

	eventManager.addEventListener(button, "mouseover", tooltipListener, featureName);
	eventManager.addEventListener(button, "click", () => buttonClickListener<Placement, Name, Toggle>(button, icon, listener, isToggle), featureName);
	return button;
}
function updateFeatureButtonIcon(button: HTMLButtonElement, icon: SVGElement) {
	if (button.firstChild) {
		button.firstChild.remove();
		button.append(icon);
	}
}
export function placeButton(button: HTMLButtonElement, placement: Exclude<ButtonPlacement, "feature_menu">) {
	switch (placement) {
		case "below_player": {
			const player = document.querySelector<HTMLDivElement>("div#primary > div#primary-inner > div#player");
			if (!player) return;
			const buttonContainerExists = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`) !== null;
			const buttonContainer = createStyledElement({
				elementId: buttonContainerId,
				elementType: "div",
				styles: {
					display: "flex",
					justifyContent: "center"
				}
			});
			buttonContainer.append(button);
			if (buttonContainerExists) return;
			player.insertAdjacentElement("afterend", buttonContainer);
			break;
		}
		case "player_controls_left": {
			const leftControls = document.querySelector<HTMLDivElement>(".ytp-left-controls");
			if (!leftControls) return;
			leftControls.append(button);
			break;
		}
		case "player_controls_right": {
			const rightControls = document.querySelector<HTMLDivElement>(".ytp-right-controls");
			if (!rightControls) return;
			rightControls.prepend(button);
			break;
		}
	}
}
export function checkIfFeatureButtonExists(featureName: FeaturesThatHaveButtons, placement: ButtonPlacement): boolean {
	switch (placement) {
		case "below_player": {
			const buttonContainer = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
			if (!buttonContainer) return false;
			return buttonContainer.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(featureName)}`) !== null;
		}
		case "player_controls_left": {
			const leftControls = document.querySelector<HTMLDivElement>(".ytp-left-controls");
			if (!leftControls) return false;
			return leftControls.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(featureName)}`) !== null;
		}
		case "player_controls_right": {
			const rightControls = document.querySelector<HTMLDivElement>(".ytp-right-controls");
			if (!rightControls) return false;
			return rightControls.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(featureName)}`) !== null;
		}
		case "feature_menu": {
			const featureMenu = document.querySelector<HTMLDivElement>("#yte-feature-menu");
			if (!featureMenu) return false;
			return featureMenu.querySelector<HTMLDivElement>(`#${getFeatureIds(featureName).featureMenuItemId}`) !== null;
		}
	}
}
export function getFeatureButtonId(featureName: FeaturesThatHaveButtons) {
	return `yte-feature-${featureName}-button` as const;
}
export const buttonContainerId = "yte-button-container";
