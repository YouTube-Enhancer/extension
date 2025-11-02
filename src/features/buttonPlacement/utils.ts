import { featuresInControls } from "@/src/features/buttonPlacement";
import { getFeatureIds, getFeatureMenuItem } from "@/src/features/featureMenu/utils";
import { type GetIconType, type ToggleIcon } from "@/src/icons";
import { type AllButtonNames, type ButtonPlacement, type MultiButtonNames, type SingleButtonFeatureNames } from "@/src/types";
import eventManager from "@/src/utils/EventManager";
import { createStyledElement, createTooltip, findKeyByValue, getButtonColor } from "@/src/utils/utilities";

export type ListenerType<Toggle extends boolean> = Toggle extends true ? (checked?: boolean) => void : () => void;

export function checkIfFeatureButtonExists(buttonName: AllButtonNames, placement: ButtonPlacement): boolean {
	switch (placement) {
		case "below_player": {
			const buttonContainer = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
			if (!buttonContainer) return false;
			return buttonContainer.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`) !== null;
		}
		case "feature_menu": {
			const featureMenu = document.querySelector<HTMLDivElement>("#yte-feature-menu");
			if (!featureMenu) return false;
			return featureMenu.querySelector<HTMLDivElement>(`#${getFeatureIds(buttonName).featureMenuItemId}`) !== null;
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
	}
}

export function getFeatureButton(buttonName: AllButtonNames) {
	return getFeatureMenuItem(buttonName) ?? document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`);
}
export function getFeatureButtonId(buttonName: AllButtonNames) {
	return `yte-feature-${buttonName}-button` as const;
}
export async function makeFeatureButton<Name extends AllButtonNames, Placement extends ButtonPlacement, Toggle extends boolean>(
	buttonName: Name,
	placement: Placement,
	label: string,
	icon: GetIconType<Name, Placement>,
	listener: ListenerType<Toggle>,
	isToggle: boolean,
	initialChecked: boolean = false
) {
	const featureName = findKeyByValue(buttonName as MultiButtonNames) ?? (buttonName as SingleButtonFeatureNames);
	if (placement === "feature_menu") throw new Error("Cannot make a feature button for the feature menu");
	const buttonExists = document.querySelector(`button#${getFeatureButtonId(buttonName)}`) !== null;
	const button = createStyledElement({
		classlist: [
			"ytp-button",
			placement === "below_player" ? "yte-button-below-player"
			: placement === "player_controls_right" ? "yte-button-player-controls-right"
			: "yte-button-player-controls-left"
		],
		elementId: `${getFeatureButtonId(buttonName)}`,
		elementType: "button",
		styles: {
			alignItems: "center",
			display: "flex"
		}
	});
	button.dataset.title = label;
	const { listener: tooltipListener, update } = createTooltip({
		direction: placement === "below_player" ? "down" : "up",
		element: button,
		featureName,
		id: `yte-feature-${buttonName}-tooltip`
	});
	if (placement === "below_player") {
		icon = await modifyIconForLightTheme(icon, isToggle);
	} else {
		icon = await modifyIconForLightTheme(icon, isToggle, true);
	}
	if (buttonExists) {
		eventManager.removeEventListener(button, "click", featureName);
		eventManager.addEventListener(
			button,
			"click",
			() => {
				buttonClickListener<Placement, Name, Toggle>(button, icon, listener, isToggle).catch(console.error);
				update();
			},
			featureName
		);
		eventManager.removeEventListener(button, "mouseover", featureName);
		eventManager.addEventListener(button, "mouseover", tooltipListener, featureName);
		return button;
	}
	if (isToggle) {
		button.ariaChecked = initialChecked ? "true" : "false";
		if (typeof icon === "object" && "off" in icon && "on" in icon) {
			button.append(initialChecked ? icon.on : icon.off);
		} else if (icon instanceof SVGSVGElement) {
			button.append(icon);
		}
	} else {
		if (icon instanceof SVGSVGElement) {
			button.append(icon);
		}
	}

	eventManager.addEventListener(button, "mouseover", tooltipListener, featureName);
	eventManager.addEventListener(
		button,
		"click",
		() => {
			buttonClickListener<Placement, Name, Toggle>(button, icon, listener, isToggle).catch(console.error);
			update();
		},
		featureName
	);
	return button;
}
export async function modifyIconForLightTheme<T extends SVGSVGElement | ToggleIcon>(icon: T, isToggle = false, overrideColor?: boolean) {
	const color = overrideColor ? "#FFFFFF" : undefined;
	if (isToggle) {
		if (typeof icon === "object" && "off" in icon && "on" in icon) {
			await applyThemeToSvg(icon.on, color);
			await applyThemeToSvg(icon.off, color);
		} else if (icon instanceof SVGSVGElement) {
			await applyThemeToSvg(icon, color);
		}
	} else {
		if (icon instanceof SVGSVGElement) {
			await applyThemeToSvg(icon, color);
		}
	}
	return icon;
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
					height: "48px",
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
export function updateFeatureButtonIcon(button: HTMLButtonElement, icon: SVGElement) {
	if (button.firstChild) {
		button.firstChild.replaceWith(icon);
	}
}
export function updateFeatureButtonTitle(buttonName: AllButtonNames, title: string) {
	const button = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`);
	if (!button) return;
	button.dataset.title = title;
}
async function applyThemeToSvg(svg: SVGSVGElement, forceColor?: "#000000" | "#FFFFFF") {
	const color = forceColor ?? (await getButtonColor());
	// If the SVG itself has fill/stroke, override them
	if (svg.hasAttribute("fill") && svg.getAttribute("fill") !== "none") {
		svg.removeAttribute("fill");
		svg.setAttribute("fill", color);
	}
	if (svg.hasAttribute("stroke") && svg.getAttribute("stroke") !== "none") {
		svg.removeAttribute("stroke");
		svg.setAttribute("stroke", color);
	}
	// Same check for children
	for (const child of Array.from(svg.querySelectorAll("*"))) {
		if (child.hasAttribute("fill") && child.getAttribute("fill") !== "none") {
			child.removeAttribute("fill");
			child.setAttribute("fill", color);
		}
		if (child.hasAttribute("stroke") && child.getAttribute("stroke") !== "none") {
			child.removeAttribute("stroke");
			child.setAttribute("stroke", color);
		}
	}
}

async function buttonClickListener<Placement extends ButtonPlacement, Name extends AllButtonNames, Toggle extends boolean>(
	button: HTMLButtonElement,
	icon: GetIconType<Name, Placement>,
	listener: ListenerType<Toggle>,
	isToggle: boolean
) {
	if (!isToggle) return listener();
	button.ariaChecked = button.ariaChecked ? (!JSON.parse(button.ariaChecked)).toString() : "false";
	icon = await modifyIconForLightTheme(icon, isToggle);
	if (typeof icon === "object" && "off" in icon && "on" in icon) {
		updateFeatureButtonIcon(button, JSON.parse(button.ariaChecked) ? icon.on : icon.off);
	} else if (icon instanceof SVGSVGElement) {
		updateFeatureButtonIcon(button, icon);
	}
	listener(JSON.parse(button.ariaChecked) as boolean);
}
export const buttonContainerId = "yte-button-container";
export function updateButtonsIconColor() {
	for (const buttonName of featuresInControls) {
		const button = document.querySelector<HTMLButtonElement>(`#${buttonContainerId}  #${getFeatureButtonId(buttonName)}`);
		if (!button) continue;
		const icon = button.querySelector<SVGSVGElement>("svg");
		if (!icon) continue;
		void applyThemeToSvg(icon);
	}
}
