import { getFeatureIds, getFeatureMenuItem } from "@/src/features/featureMenu/utils";
import { type GetIconType } from "@/src/icons";
import { type AllButtonNames, type ButtonPlacement, type MultiButtonNames, type SingleButtonFeatureNames } from "@/src/types";
import eventManager from "@/src/utils/EventManager";
import { createStyledElement, createTooltip, findKeyByValue } from "@/src/utils/utilities";

export type ListenerType<Toggle extends boolean> = Toggle extends true ? (checked?: boolean) => void : () => void;

function buttonClickListener<Placement extends ButtonPlacement, Name extends AllButtonNames, Toggle extends boolean>(
	button: HTMLButtonElement,
	icon: GetIconType<Name, Placement>,
	listener: ListenerType<Toggle>,
	isToggle: boolean
) {
	if (!isToggle) return listener();
	button.ariaChecked = button.ariaChecked ? (!JSON.parse(button.ariaChecked)).toString() : "false";
	if (typeof icon === "object" && "off" in icon && "on" in icon) {
		updateFeatureButtonIcon(button, JSON.parse(button.ariaChecked) ? icon.on : icon.off);
	} else if (icon instanceof SVGSVGElement) {
		updateFeatureButtonIcon(button, icon);
	}
	listener(JSON.parse(button.ariaChecked) as boolean);
}

export function makeFeatureButton<Name extends AllButtonNames, Placement extends ButtonPlacement, Toggle extends boolean>(
	buttonName: Name,
	placement: Placement,
	label: string,
	icon: GetIconType<Name, Placement>,
	listener: ListenerType<Toggle>,
	isToggle: boolean,
	initialChecked: boolean = false
) {
	if (placement === "feature_menu") throw new Error("Cannot make a feature button for the feature menu");
	const featureName = findKeyByValue(buttonName as MultiButtonNames) ?? (buttonName as SingleButtonFeatureNames);
	const buttonExists = document.querySelector(`button#${getFeatureButtonId(buttonName)}`) !== null;
	const button = createStyledElement({
		classlist: ["ytp-button"],
		elementId: `${getFeatureButtonId(buttonName)}`,
		elementType: "button",
		styles: {
			alignContent: "center",
			display: "flex",
			flexWrap: "wrap",
			height: "48px",
			justifyContent: "center",
			padding: "0px 4px",
			width: "48px",
			zIndex: "0"
		}
	});
	button.dataset.title = label;
	const { listener: tooltipListener, update } = createTooltip({
		direction: placement === "below_player" ? "down" : "up",
		element: button,
		featureName,
		id: `yte-feature-${buttonName}-tooltip`
	});
	if (buttonExists) {
		eventManager.removeEventListener(button, "click", featureName);
		eventManager.addEventListener(
			button,
			"click",
			() => {
				buttonClickListener<Placement, Name, Toggle>(button, icon, listener, isToggle);
				update();
			},
			featureName
		);
		eventManager.removeEventListener(button, "mouseover", featureName);
		eventManager.addEventListener(button, "mouseover", tooltipListener, featureName);
		return button;
	}

	const isIconToggle = typeof icon === "object" && "off" in icon && "on" in icon;
	if (isToggle) {
		button.ariaChecked = initialChecked ? "true" : "false";
		if (isIconToggle) button.append(icon.off);
	}
	if (!isIconToggle && icon instanceof SVGSVGElement) button.append(icon);

	eventManager.addEventListener(button, "mouseover", tooltipListener, featureName);
	eventManager.addEventListener(
		button,
		"click",
		() => {
			buttonClickListener<Placement, Name, Toggle>(button, icon, listener, isToggle);
			update();
		},
		featureName
	);
	return button;
}
export function updateFeatureButtonIcon(button: HTMLButtonElement, icon: SVGElement) {
	button.firstChild?.replaceWith(icon);
}
export function updateFeatureButtonTitle(buttonName: AllButtonNames, title: string) {
	const button = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`);
	if (!button) return;
	button.dataset.title = title;
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
			const timeDisplay = leftControls.querySelector<HTMLDivElement>(".ytp-time-display");
			if (!timeDisplay) return;
			timeDisplay.insertAdjacentElement("beforebegin", button);
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
export function checkIfFeatureButtonExists(buttonName: AllButtonNames, placement: ButtonPlacement): boolean {
	switch (placement) {
		case "below_player": {
			const buttonContainer = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
			if (!buttonContainer) return false;
			return buttonContainer.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`) !== null;
		}
		case "player_controls_left": {
			const leftControls = document.querySelector<HTMLDivElement>(".ytp-left-controls");
			if (!leftControls) return false;
			return leftControls.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`) !== null;
		}
		case "player_controls_right": {
			const rightControls = document.querySelector<HTMLDivElement>(".ytp-right-controls");
			if (!rightControls) return false;
			return rightControls.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`) !== null;
		}
		case "feature_menu": {
			const featureMenu = document.querySelector<HTMLDivElement>("#yte-feature-menu");
			if (!featureMenu) return false;
			return featureMenu.querySelector<HTMLDivElement>(`#${getFeatureIds(buttonName).featureMenuItemId}`) !== null;
		}
	}
}
export function getFeatureButtonId<ButtonName extends AllButtonNames>(buttonName: ButtonName) {
	return `yte-feature-${buttonName}-button` as const;
}
export function getFeatureButton(buttonName: AllButtonNames) {
	return getFeatureMenuItem(buttonName) ?? document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`);
}
export const buttonContainerId = "yte-button-container";
