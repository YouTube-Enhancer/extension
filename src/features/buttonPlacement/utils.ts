import { getFeatureIds, getFeatureMenuItem } from "@/src/features/featureMenu/utils";
import { type GetIconType, type ToggleIcon } from "@/src/icons";
import { type AllButtonNames, type ButtonPlacement, type MultiButtonNames, type SingleButtonFeatureNames } from "@/src/types";
import eventManager from "@/src/utils/EventManager";
import { createStyledElement, createTooltip, findKeyByValue, getButtonColor } from "@/src/utils/utilities";

export type ListenerType<Toggle extends boolean> = Toggle extends true ? (checked?: boolean) => void : () => void;
export const buttonContainerId = "yte-button-container";

export function checkIfFeatureButtonExists(buttonName: AllButtonNames, placement: ButtonPlacement): boolean {
	const root = getPlacementRoot(placement);
	if (!root) return false;
	if (placement === "feature_menu") return root.querySelector(`#${getFeatureIds(buttonName).featureMenuItemId}`) !== null;
	return root.querySelector(`#${getFeatureButtonId(buttonName)}`) !== null;
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
	initialChecked = false
) {
	if (placement === "feature_menu") throw new Error("Cannot make a feature button for the feature menu");
	const featureName = findKeyByValue(buttonName as MultiButtonNames) ?? (buttonName as SingleButtonFeatureNames);
	const existingButton = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`);
	const button =
		existingButton ??
		createStyledElement({
			classlist: [
				"ytp-button",
				placement === "below_player" ? "yte-button-below-player"
				: placement === "player_controls_right" ? "yte-button-player-controls-right"
				: "yte-button-player-controls-left"
			],
			elementId: getFeatureButtonId(buttonName),
			elementType: "button"
		});
	button.dataset.title = label;
	const { listener: tooltipListener, update } = createTooltip({
		direction: placement === "below_player" ? "down" : "up",
		element: button,
		featureName,
		id: `yte-feature-${buttonName}-tooltip`
	});
	icon = await modifyIconForLightTheme(icon, isToggle, placement !== "below_player");
	if (isToggle) {
		setChecked(button, initialChecked);
		appendIcon(button, icon as ToggleIcon, initialChecked);
	} else {
		appendIcon(button, icon as SVGSVGElement);
	}
	eventManager.removeEventListener(button, "mouseover", featureName);
	eventManager.addEventListener(button, "mouseover", tooltipListener, featureName);
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
	return button;
}
export async function modifyIconForLightTheme<T extends SVGSVGElement | ToggleIcon>(icon: T, isToggle = false, overrideColor?: boolean) {
	const color = overrideColor ? "#FFFFFF" : undefined;
	if (isToggle && typeof icon === "object" && "off" in icon && "on" in icon) {
		await applyThemeToSvg(icon.on, color);
		await applyThemeToSvg(icon.off, color);
	} else if (icon instanceof SVGSVGElement) {
		await applyThemeToSvg(icon, color);
	}
	return icon;
}
export function placeButton(button: HTMLButtonElement, placement: Exclude<ButtonPlacement, "feature_menu">) {
	switch (placement) {
		case "below_player": {
			const player = document.querySelector<HTMLDivElement>("div#primary > div#primary-inner > div#player");
			if (!player) return;
			let container = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
			if (!container) {
				container = createStyledElement({
					elementId: buttonContainerId,
					elementType: "div",
					styles: { display: "flex", height: "48px", justifyContent: "center" }
				});
				player.insertAdjacentElement("afterend", container);
			}
			container.append(button);
			break;
		}
		case "player_controls_left": {
			const leftControls = document.querySelector<HTMLDivElement>(".ytp-left-controls");
			const timeDisplay = leftControls?.querySelector<HTMLDivElement>(".ytp-time-display");
			if (timeDisplay) timeDisplay.insertAdjacentElement("beforebegin", button);
			break;
		}
		case "player_controls_right": {
			const rightControls = document.querySelector<HTMLDivElement>(".ytp-right-controls");
			if (rightControls) rightControls.prepend(button);
			break;
		}
	}
}

export function updateButtonsIconColor() {
	const container = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
	if (!container) return;
	const buttons = container.querySelectorAll<HTMLButtonElement>("button");
	for (const button of buttons) {
		const icon = button?.querySelector<SVGSVGElement>("svg");
		if (icon) void applyThemeToSvg(icon);
	}
}

export function updateFeatureButtonIcon(button: HTMLButtonElement, icon: SVGElement) {
	button.replaceChildren(icon);
}
export function updateFeatureButtonTitle(buttonName: AllButtonNames, title: string) {
	const button = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`);
	if (button) button.dataset.title = title;
}

function appendIcon(button: HTMLButtonElement, icon: SVGSVGElement | ToggleIcon, checked?: boolean) {
	button.replaceChildren();
	if (typeof icon === "object" && "on" in icon && "off" in icon) {
		button.append(checked ? icon.on : icon.off);
	} else if (icon instanceof SVGSVGElement) {
		button.append(icon);
	}
}

async function applyThemeToSvg(svg: SVGSVGElement, forceColor?: "#000000" | "#FFFFFF") {
	const color = forceColor ?? (await getButtonColor());
	// If the SVG itself has fill/stroke, override them
	if (svg.hasAttribute("fill") && svg.getAttribute("fill") !== "none") svg.setAttribute("fill", color);
	if (svg.hasAttribute("stroke") && svg.getAttribute("stroke") !== "none") svg.setAttribute("stroke", color);
	const elements = svg.querySelectorAll("[fill]:not([fill='none']), [stroke]:not([stroke='none'])");
	for (const el of elements) {
		if (el.hasAttribute("fill")) el.setAttribute("fill", color);
		if (el.hasAttribute("stroke")) el.setAttribute("stroke", color);
	}
}
function buttonClickListener<Placement extends ButtonPlacement, Name extends AllButtonNames, Toggle extends boolean>(
	button: HTMLButtonElement,
	icon: GetIconType<Name, Placement>,
	listener: ListenerType<Toggle>,
	isToggle: boolean
) {
	if (!isToggle) return listener();
	const newState = !getChecked(button);
	setChecked(button, newState);
	if (typeof icon === "object" && "off" in icon && "on" in icon) updateFeatureButtonIcon(button, newState ? icon.on : icon.off);
	else if (icon instanceof SVGSVGElement) updateFeatureButtonIcon(button, icon);
	listener(newState as any);
}

function getChecked(button: HTMLButtonElement) {
	return button.getAttribute("aria-checked") === "true";
}

function getPlacementRoot(placement: ButtonPlacement): HTMLElement | null {
	switch (placement) {
		case "below_player":
			return document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
		case "feature_menu":
			return document.querySelector<HTMLDivElement>("#yte-feature-menu");
		case "player_controls_left":
			return document.querySelector<HTMLDivElement>(".ytp-left-controls");
		case "player_controls_right":
			return document.querySelector<HTMLDivElement>(".ytp-right-controls");
	}
}

function setChecked(button: HTMLButtonElement, value: boolean) {
	button.setAttribute("aria-checked", String(value));
}
