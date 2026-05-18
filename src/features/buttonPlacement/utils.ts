import eventManager from "@/src/events/EventManager";
import { addFeatureItemToMenu, getFeatureIds, getFeatureMenuItem, removeFeatureItemFromMenu } from "@/src/features/featureMenu/utils";
import { type GetIconType, type ToggleIcon } from "@/src/icons";
import {
	type AllButtonNames,
	type ButtonPlacement,
	type FullscreenPlacement,
	type MultiButtonNames,
	type SingleButtonFeatureNames
} from "@/src/types";
import { getButtonColor } from "@/src/utils/deep-dark-theme";
import { createStyledElement } from "@/src/utils/dom/elements";
import { createTooltip } from "@/src/utils/dom/tooltip";
import { waitForElement } from "@/src/utils/dom/wait";
import { findKeyByValue } from "@/src/utils/feature";
import { isNewYouTubeVideoLayout } from "@/src/utils/url";

import { isFullscreen, startFullscreenObserver, stopFullscreenObserver } from "./fullscreen";
export type ListenerType<Toggle extends boolean> = Toggle extends true ? (checked?: boolean) => void : () => void;
export const buttonContainerId = "yte-button-container";

let theaterModeObserver: MutationObserver | null = null;

type TrackedButtonInfo = {
	currentEffectivePlacement: ButtonPlacement;
	fullscreenPlacement: FullscreenPlacement;
	icon: SVGSVGElement | ToggleIcon;
	initialChecked: boolean;
	isToggle: boolean;
	label: string;
	listener: ListenerType<boolean>;
	placement: ButtonPlacement;
};
const trackedButtons = new Map<AllButtonNames, TrackedButtonInfo>();
let fullscreenObserverActive = false;

export async function checkIfFeatureButtonExists(buttonName: AllButtonNames, placement: ButtonPlacement): Promise<boolean> {
	const root = await getPlacementRoot(placement);
	if (!root) return false;
	if (placement === "feature_menu") return root.querySelector(`#${getFeatureIds(buttonName).featureMenuItemId}`) !== null;
	return root.querySelectorAll(`#${getFeatureButtonId(buttonName)}`).length > 0;
}

export function getEffectivePlacement(placement: ButtonPlacement, fullscreenPlacement: FullscreenPlacement): ButtonPlacement {
	return isFullscreen() && fullscreenPlacement !== "same" ? fullscreenPlacement : placement;
}

export function getFeatureButton(buttonName: AllButtonNames) {
	return getFeatureMenuItem(buttonName) ?? document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`);
}

export function getFeatureButtonId(buttonName: AllButtonNames) {
	return `yte-feature-${buttonName}-button` as const;
}

export function isInTheaterMode(): boolean {
	const inTheaterMode =
		document.querySelector<HTMLButtonElement>(isNewYouTubeVideoLayout() ? "ytd-watch-grid" : "ytd-watch-flexy")?.hasAttribute("theater") ?? false;
	return inTheaterMode;
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
	const existingButtons = document.querySelectorAll<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`);
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
export async function placeButton(button: HTMLButtonElement, placement: Exclude<ButtonPlacement, "feature_menu">) {
	switch (placement) {
		case "below_player": {
			const inTheaterMode = isInTheaterMode();
			const container = await getOrCreateButtonContainer(inTheaterMode);
			if (!container) return;
			await startTheaterModeObserver();
			const existingInContainer = container.querySelectorAll(`#${button.id}`);
			existingInContainer.forEach((b) => b.remove());
			container.append(button);
			break;
		}
		case "player_controls_left": {
			const leftControls = await waitForElement<HTMLDivElement>(".ytp-left-controls");
			if (!leftControls) return;
			const existingInContainer = leftControls.querySelectorAll(`#${button.id}`);
			existingInContainer.forEach((b) => b.remove());
			const timeDisplay = leftControls.querySelector<HTMLDivElement>(".ytp-time-display");
			if (timeDisplay) timeDisplay.insertAdjacentElement("beforebegin", button);
			break;
		}
		case "player_controls_right": {
			const rightControls = await waitForElement<HTMLDivElement>(".ytp-right-controls");
			if (!rightControls) return;
			const containerId = "yte-right-controls-container";
			let container = rightControls.querySelector<HTMLDivElement>(`#${containerId}`);
			if (!container) {
				container = createStyledElement({
					elementId: containerId,
					elementType: "div",
					styles: { alignItems: "center", display: "flex" }
				});
				const leftSide = rightControls.querySelector<HTMLDivElement>(".ytp-right-controls-left");
				if (leftSide) leftSide.insertAdjacentElement("beforebegin", container);
				else rightControls.prepend(container);
			}
			const existingInContainer = container.querySelectorAll(`#${button.id}`);
			existingInContainer.forEach((b) => b.remove());
			container.append(button);
			break;
		}
	}
}
export function trackButton(
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
		currentEffectivePlacement: effectivePlacement,
		fullscreenPlacement,
		icon,
		initialChecked,
		isToggle,
		label,
		listener,
		placement
	});
	if (!fullscreenObserverActive) {
		fullscreenObserverActive = true;
		startFullscreenObserver(() => {
			void handleFullscreenChange();
		});
	}
}
export function untrackButton(buttonName: AllButtonNames) {
	trackedButtons.delete(buttonName);
	if (trackedButtons.size === 0 && fullscreenObserverActive) {
		fullscreenObserverActive = false;
		stopFullscreenObserver();
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
	if (button) {
		button.dataset.title = title;
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
	listener(newState);
}
function ensureContainerPosition() {
	const container = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
	if (!container) return;
	const inTheaterMode = isInTheaterMode();
	const { parentElement: currentParent } = container;
	if (!currentParent) return;
	const isNewLayout = isNewYouTubeVideoLayout();
	const expectedParent =
		inTheaterMode ?
			isNewLayout ? document.querySelector("ytd-watch-grid")
			:	document.querySelector("ytd-watch-flexy")
		:	document.querySelector("div#primary > div#primary-inner");
	if (currentParent === expectedParent) return;
	if (inTheaterMode) {
		const parent = expectedParent as HTMLElement;
		const columns = parent?.querySelector("#columns");
		if (columns) parent.insertBefore(container, columns);
	} else {
		const player = expectedParent?.querySelector("#player");
		if (player) player.insertAdjacentElement("afterend", container);
	}
}
function getChecked(button: HTMLButtonElement) {
	return button.getAttribute("aria-checked") === "true";
}

async function getOrCreateButtonContainer(inTheaterMode: boolean): Promise<HTMLDivElement | null> {
	let container = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
	if (container) return container;
	container = createStyledElement({
		elementId: buttonContainerId,
		elementType: "div",
		styles: { display: "flex", height: "48px", justifyContent: "center" }
	});
	if (inTheaterMode) {
		const isNewLayout = isNewYouTubeVideoLayout();
		const parent = isNewLayout ? document.querySelector<HTMLElement>("ytd-watch-grid") : document.querySelector<HTMLElement>("ytd-watch-flexy");
		if (!parent) return null;
		const columns = parent.querySelector("#columns");
		if (columns) {
			parent.insertBefore(container, columns);
			return container;
		}
		parent.append(container);
		return container;
	}
	const player = await waitForElement<HTMLDivElement>("div#primary > div#primary-inner > div#player");
	if (!player) return null;
	player.insertAdjacentElement("afterend", container);
	return container;
}
async function getPlacementRoot(placement: ButtonPlacement) {
	switch (placement) {
		case "below_player":
			return await waitForElement<HTMLDivElement>(`#${buttonContainerId}`);
		case "feature_menu":
			return await waitForElement<HTMLDivElement>("#yte-feature-menu");
		case "player_controls_left":
			return await waitForElement<HTMLDivElement>(".ytp-left-controls");
		case "player_controls_right":
			return await waitForElement<HTMLDivElement>(".ytp-right-controls");
	}
}

async function handleFullscreenChange() {
	const inFullscreen = isFullscreen();
	for (const [buttonName, info] of trackedButtons) {
		const effectivePlacement = inFullscreen && info.fullscreenPlacement !== "same" ? info.fullscreenPlacement : info.placement;
		if (effectivePlacement === info.currentEffectivePlacement) continue;

		if (info.currentEffectivePlacement !== "feature_menu") {
			const oldButton = document.querySelector<HTMLButtonElement>(`#${getFeatureButtonId(buttonName)}`);
			if (oldButton) {
				oldButton.remove();
				const tooltip = document.getElementById(`yte-feature-${buttonName}-tooltip`);
				if (tooltip) tooltip.remove();
			}
		} else {
			removeFeatureItemFromMenu(buttonName);
		}

		if (effectivePlacement !== "feature_menu") {
			const button = await makeFeatureButton(
				buttonName,
				effectivePlacement,
				info.label,
				info.icon,
				info.listener,
				info.isToggle,
				info.initialChecked
			);
			await placeButton(button, effectivePlacement);
		} else {
			if (info.icon instanceof SVGSVGElement) {
				await addFeatureItemToMenu(buttonName, info.label, info.icon, info.listener, info.isToggle, info.initialChecked);
			}
		}

		info.currentEffectivePlacement = effectivePlacement;
	}
}

function setChecked(button: HTMLButtonElement, value: boolean) {
	button.setAttribute("aria-checked", String(value));
}

let theaterNavigationHandler: (() => void) | null = null;

export function stopTheaterModeObserver() {
	if (theaterNavigationHandler) {
		document.removeEventListener("yt-navigate-start", theaterNavigationHandler);
		theaterNavigationHandler = null;
	}
	theaterModeObserver?.disconnect();
	theaterModeObserver = null;
}

async function startTheaterModeObserver() {
	if (theaterModeObserver) return;
	const sizeButton = await waitForElement<HTMLButtonElement>("button.ytp-size-button");
	if (!sizeButton) return;
	theaterModeObserver = new MutationObserver(() => {
		ensureContainerPosition();
	});
	theaterModeObserver.observe(sizeButton, { attributeFilter: ["class"], attributes: true, childList: true, subtree: true });
	theaterNavigationHandler = () => stopTheaterModeObserver();
	document.addEventListener("yt-navigate-start", theaterNavigationHandler);
}
