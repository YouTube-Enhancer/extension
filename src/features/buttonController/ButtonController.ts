import type { AllButtonNames, ButtonPlacement, FullscreenPlacement, SingleButtonFeatureNames } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { featureConfigManager } from "@/src/features/_registry/featureConfigManager";
import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { getFeatureIcon, type GetIconType, isToggleIcon, type ToggleIcon } from "@/src/icons";
import { getButtonColor } from "@/src/utils/deep-dark-theme";
import { createStyledElement } from "@/src/utils/dom/elements";
import { createTooltip, removeTooltip } from "@/src/utils/dom/tooltip";
import { waitForElement } from "@/src/utils/dom/wait";

import type { ListenerType } from "./types";

import { buttonContainerId } from "./constants";
import {
	getEffectivePlacement,
	getPlacementSelector,
	isFullscreen,
	placeButton,
	startPlacementTracking,
	stopPlacementTracking
} from "./containerTracking";
import {
	addFeatureItemToMenu,
	enableFeatureMenuButton,
	getFeatureIds,
	getFeatureMenuItem,
	removeFeatureItemFromMenu,
	setOnMenuItemClick
} from "./featureMenu";
import "./index.css";

// ─── Re-exports from sub-modules ──────────────────────────────────

export { buttonContainerId };
export { getEffectivePlacement, getPlacementRoot } from "./containerTracking";
export {
	addFeatureItemToMenu,
	featuresInMenu,
	getFeatureIds,
	getFeatureMenuItem,
	getFeatureMenuItemIcon,
	getFeatureMenuItemLabel,
	removeFeatureItemFromMenu
} from "./featureMenu";
export {
	enableFeatureMenu,
	enableFeatureMenuButton,
	getFeatureButtonId,
	setupFeatureMenuEventListeners,
	updateFeatureMenuTitle
} from "./featureMenu";
export type { ListenerType } from "./types";

// ─── Module-level state ───────────────────────────────────────────

type TrackedButtonInfo = {
	checked: boolean;
	currentEffectivePlacement: ButtonPlacement;
	fullscreenPlacement: FullscreenPlacement;
	icon: SVGSVGElement | ToggleIcon;
	isToggle: boolean;
	label: string;
	listener: ListenerType<boolean>;
	placement: ButtonPlacement;
};
const trackedButtons = new Map<AllButtonNames, TrackedButtonInfo>();

// ─── Wire up callback seam ────────────────────────────────────────

setOnMenuItemClick((buttonName, checked) => {
	const info = trackedButtons.get(buttonName);
	if (info) info.checked = checked;
});

// ─── Exported functions ───────────────────────────────────────────

export async function addButton<Name extends AllButtonNames, Placement extends ButtonPlacement, Label extends string, Toggle extends boolean>(
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
	await enableFeatureMenuButton();
	if (selector) {
		const element = await waitForElement(selector);
		if (!element) return;
	}
	switch (effectivePlacement) {
		case "below_player":
		case "player_controls_left":
		case "player_controls_right": {
			const featureButton = getFeatureButton(buttonName);
			if (featureButton) removeButton(buttonName);
			const button = makeFeatureButton(
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

export async function checkIfFeatureButtonExists(buttonName: AllButtonNames, placement: ButtonPlacement): Promise<boolean> {
	const { getPlacementRoot } = await import("./containerTracking");
	const root = await getPlacementRoot(placement);
	if (!root) return false;
	if (placement === "feature_menu") return root.querySelector(`#${getFeatureIds(buttonName).featureMenuItemId}`) !== null;
	return root.querySelectorAll(`#${getFeatureButtonIdForButton(buttonName)}`).length > 0;
}

export function getFeatureButton(buttonName: AllButtonNames) {
	return getFeatureMenuItem(buttonName) ?? document.querySelector<HTMLButtonElement>(`#${getFeatureButtonIdForButton(buttonName)}`);
}

export function getTrackedButtonFullscreenPlacement(buttonName: AllButtonNames): FullscreenPlacement | undefined {
	return trackedButtons.get(buttonName)?.fullscreenPlacement;
}

export function modifyIconForLightTheme<T extends SVGSVGElement | ToggleIcon>(icon: T, overrideColor?: boolean) {
	const color = overrideColor ? "#FFFFFF" : undefined;
	const target: SVGSVGElement | ToggleIcon = icon;
	if (isToggleIcon(target)) {
		applyThemeToSvg(target.on, color);
		applyThemeToSvg(target.off, color);
	} else {
		applyThemeToSvg(target, color);
	}
	return icon;
}

export function removeButton(buttonName: AllButtonNames, placement?: ButtonPlacement): void;
export function removeButton<Name extends AllButtonNames>(buttonName: Name, placement?: ButtonPlacement) {
	const featureName = metadataRegistry.getButtonFeature(buttonName);
	if (!featureName) return;
	untrackButton(buttonName);
	if (placement === undefined) {
		const featureConfig = featureConfigManager.getLast(featureName);
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
			const buttons = document.querySelectorAll<HTMLButtonElement>(`#${getFeatureButtonIdForButton(buttonName)}`);
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

export function updateButtonsIconColor() {
	const container = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
	if (!container) return;
	const buttons = container.querySelectorAll<HTMLButtonElement>("button");
	for (const button of buttons) {
		const icon = button?.querySelector<SVGSVGElement>("svg");
		if (icon) void applyThemeToSvg(icon);
	}
}

export function updateFeatureButtonChecked(buttonName: AllButtonNames, checked: boolean) {
	const button = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonIdForButton(buttonName)}`);
	if (button) setChecked(button, checked);
	const menuItem = getFeatureMenuItem(buttonName);
	if (menuItem) {
		menuItem.setAttribute("aria-checked", String(checked));
		menuItem.classList.toggle("ytp-menuitem-checked", checked);
	}
	updateTrackedButtonChecked(buttonName, checked);
}

export function updateFeatureButtonIcon(button: HTMLButtonElement, icon: SVGElement) {
	button.replaceChildren(icon);
}

export function updateFeatureButtonTitle(buttonName: AllButtonNames, title: string) {
	const button = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonIdForButton(buttonName)}`);
	if (button) {
		button.dataset.title = title;
		updateTrackedButtonLabel(buttonName, title);
		const tooltip = document.getElementById(`yte-feature-${buttonName}-tooltip`);
		if (tooltip) tooltip.textContent = title;
	}
}

export function updateTrackedButtonConfig(buttonName: AllButtonNames, fullscreenPlacement: FullscreenPlacement) {
	const info = trackedButtons.get(buttonName);
	if (info) {
		info.fullscreenPlacement = fullscreenPlacement;
	}
}

// ─── Private helpers ──────────────────────────────────────────────

function appendIcon(button: HTMLButtonElement, icon: SVGSVGElement | ToggleIcon, checked?: boolean) {
	button.replaceChildren(
		isToggleIcon(icon) ?
			checked ? icon.on
			:	icon.off
		:	icon
	);
}

function applyThemeToSvg(svg: SVGSVGElement, forceColor?: "#000000" | "#FFFFFF") {
	const color = forceColor ?? getButtonColor();
	if (svg.hasAttribute("fill") && svg.getAttribute("fill") !== "none") svg.setAttribute("fill", color);
	if (svg.hasAttribute("stroke") && svg.getAttribute("stroke") !== "none") svg.setAttribute("stroke", color);
	const elements = svg.querySelectorAll("[fill]:not([fill='none']), [stroke]:not([stroke='none'])");
	for (const el of elements) {
		if (el.hasAttribute("fill")) el.setAttribute("fill", color);
		if (el.hasAttribute("stroke")) el.setAttribute("stroke", color);
	}
}

function buttonClickListener<Placement extends ButtonPlacement, Name extends AllButtonNames, Toggle extends boolean>(
	buttonName: Name,
	button: HTMLButtonElement,
	icon: GetIconType<Name, Placement>,
	listener: ListenerType<Toggle>,
	isToggle: boolean
) {
	if (!isToggle) return listener();
	const newState = !getChecked(button);
	setChecked(button, newState);
	updateTrackedButtonChecked(buttonName, newState);
	const currentIcon: SVGSVGElement | ToggleIcon = icon;
	updateFeatureButtonIcon(
		button,
		isToggleIcon(currentIcon) ?
			newState ? currentIcon.on
			:	currentIcon.off
		:	currentIcon
	);
	listener(newState);
}

function getChecked(button: HTMLButtonElement) {
	return button.getAttribute("aria-checked") === "true";
}

function getFeatureButtonIdForButton(buttonName: AllButtonNames) {
	return `yte-feature-${buttonName}-button` as const;
}

async function handleFullscreenChange() {
	const inFullscreen = isFullscreen();
	for (const [buttonName, info] of trackedButtons) {
		const effectivePlacement = inFullscreen && info.fullscreenPlacement !== "same" ? info.fullscreenPlacement : info.placement;
		if (effectivePlacement === info.currentEffectivePlacement) continue;

		if (info.currentEffectivePlacement !== "feature_menu") {
			const oldButton = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonIdForButton(buttonName)}`);
			if (oldButton) {
				oldButton.remove();
				const tooltip = document.getElementById(`yte-feature-${buttonName}-tooltip`);
				if (tooltip) tooltip.remove();
			}
		} else {
			removeFeatureItemFromMenu(buttonName);
		}

		if (effectivePlacement !== "feature_menu") {
			const placementIcon = getFeatureIcon(buttonName, effectivePlacement);
			const button = makeFeatureButton(buttonName, effectivePlacement, info.label, placementIcon, info.listener, info.isToggle, info.checked);
			await placeButton(button, effectivePlacement);
		} else {
			const menuIcon = getFeatureIcon(buttonName, "feature_menu");
			if (menuIcon instanceof SVGSVGElement) {
				await addFeatureItemToMenu(buttonName, info.label, menuIcon, info.listener, info.isToggle, info.checked);
			}
		}

		info.currentEffectivePlacement = effectivePlacement;
	}
}

function makeFeatureButton<Name extends AllButtonNames, Placement extends ButtonPlacement, Toggle extends boolean>(
	buttonName: Name,
	placement: Placement,
	label: string,
	icon: GetIconType<Name, Placement>,
	listener: ListenerType<Toggle>,
	isToggle: boolean,
	initialChecked = false
) {
	if (placement === "feature_menu") throw new Error("Cannot make a feature button for the feature menu");
	const featureName = metadataRegistry.getButtonFeature(buttonName);
	if (!featureName) throw new Error(`No feature found for button "${buttonName}"`);
	const existingButtons = document.querySelectorAll<HTMLButtonElement>(`#${getFeatureButtonIdForButton(buttonName)}`);
	if (existingButtons.length > 0) {
		existingButtons.forEach((btn) => btn.remove());
	}
	const button = createStyledElement({
		classlist: [
			"ytp-button",
			placement === "below_player" ? "yte-button-below-player"
			: placement === "player_controls_right" ? "yte-button-player-controls-right"
			: "yte-button-player-controls-left"
		],
		elementId: getFeatureButtonIdForButton(buttonName),
		elementType: "button"
	});
	button.dataset.title = label;
	const { listener: tooltipListener, update } = createTooltip({
		direction: placement === "below_player" ? "down" : "up",
		element: button,
		featureName,
		id: `yte-feature-${buttonName}-tooltip`
	});
	icon = modifyIconForLightTheme(icon, placement !== "below_player");
	if (isToggle) {
		setChecked(button, initialChecked);
		appendIcon(button, icon, initialChecked);
	} else {
		appendIcon(button, icon);
	}
	eventManager.removeEventListener(button, "mouseover", featureName);
	eventManager.addEventListener(button, "mouseover", tooltipListener, featureName);
	eventManager.removeEventListener(button, "click", featureName);
	eventManager.addEventListener(
		button,
		"click",
		() => {
			buttonClickListener<Placement, Name, Toggle>(buttonName, button, icon, listener, isToggle);
			update();
		},
		featureName
	);
	return button;
}

function setChecked(button: HTMLButtonElement, value: boolean) {
	button.setAttribute("aria-checked", String(value));
}

function trackButton(
	buttonName: AllButtonNames,
	placement: ButtonPlacement,
	fullscreenPlacement: FullscreenPlacement,
	label: string,
	icon: SVGSVGElement | ToggleIcon,
	listener: ListenerType<boolean>,
	isToggle: boolean,
	initialChecked: boolean
) {
	const effectivePlacement = getEffectivePlacement(placement, fullscreenPlacement);
	trackedButtons.set(buttonName, {
		checked: initialChecked,
		currentEffectivePlacement: effectivePlacement,
		fullscreenPlacement,
		icon,
		isToggle,
		label,
		listener,
		placement
	});
	startPlacementTracking(() => {
		void handleFullscreenChange();
	});
}

function untrackButton(buttonName: AllButtonNames) {
	trackedButtons.delete(buttonName);
	if (trackedButtons.size === 0) {
		stopPlacementTracking();
	}
}

function updateTrackedButtonChecked(buttonName: AllButtonNames, checked: boolean) {
	const info = trackedButtons.get(buttonName);
	if (info) info.checked = checked;
}

function updateTrackedButtonLabel(buttonName: AllButtonNames, label: string) {
	const info = trackedButtons.get(buttonName);
	if (info) info.label = label;
}
