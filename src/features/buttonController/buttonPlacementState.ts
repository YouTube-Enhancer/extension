import type { ToggleIcon } from "@/src/icons";
import type { AllButtonNames, ButtonPlacement, FullscreenPlacement } from "@/src/types";

import type { ListenerType } from "./types";

/**
 * Module-owned placement state: tracked feature buttons and placement container nodes.
 * Placement outcomes and name-based accessors read from here; callers must not keep
 * a second map of "what landed".
 */

export type TrackedButtonInfo = {
	checked: boolean;
	currentEffectivePlacement: ButtonPlacement;
	currentPlacement?: ButtonPlacement;
	enabled: boolean;
	fullscreenPlacement: FullscreenPlacement;
	icon: SVGSVGElement | ToggleIcon;
	initialized: boolean;
	isToggle: boolean;
	label: string;
	labelResolver?: () => string;
	listener: ListenerType<boolean>;
	placement: ButtonPlacement;
};

export const buttonContainerId = "yte-button-container";

/** Tracked feature buttons, keyed by button name. */
export const trackedButtons = new Map<AllButtonNames, TrackedButtonInfo>();

/** Cache of resolved placement containers, keyed by placement type. Invalidated on navigation. */
export const containerNodes = new Map<ButtonPlacement, HTMLElement>();

export function clearContainerNodes(): void {
	containerNodes.clear();
}

export function getCachedContainer(placement: ButtonPlacement): HTMLElement | undefined {
	return containerNodes.get(placement);
}

export function getTrackedButtonChecked(buttonName: AllButtonNames): boolean | undefined {
	return trackedButtons.get(buttonName)?.checked;
}

export function getTrackedButtonEnabled(buttonName: AllButtonNames): boolean {
	return trackedButtons.get(buttonName)?.enabled ?? false;
}

export function getTrackedButtonFullscreenPlacement(
	buttonName: AllButtonNames
): FullscreenPlacement | undefined {
	return trackedButtons.get(buttonName)?.fullscreenPlacement;
}

export function getTrackedButtonInitialized(buttonName: AllButtonNames): boolean {
	return trackedButtons.get(buttonName)?.initialized ?? false;
}

export function getTrackedButtonPlacement(buttonName: AllButtonNames): ButtonPlacement | undefined {
	return trackedButtons.get(buttonName)?.currentPlacement;
}

/**
 * Landed = initialized + enabled in tracked state. Prefer a live DOM check
 * (or the placement module's outcomes) when presence is required; this flag alone
 * can go stale if the player re-renders between placements.
 */
export function isTrackedButtonLanded(buttonName: AllButtonNames): boolean {
	return getTrackedButtonInitialized(buttonName) && getTrackedButtonEnabled(buttonName);
}

export function setCachedContainer(placement: ButtonPlacement, node: HTMLElement): void {
	containerNodes.set(placement, node);
}

export function setTrackedButtonEnabled(buttonName: AllButtonNames, enabled: boolean) {
	const info = trackedButtons.get(buttonName);
	if (info) info.enabled = enabled;
}

export function setTrackedButtonInitialized(buttonName: AllButtonNames, initialized: boolean) {
	const info = trackedButtons.get(buttonName);
	if (info) info.initialized = initialized;
}

export function setTrackedButtonPlacement(buttonName: AllButtonNames, placement: ButtonPlacement) {
	const info = trackedButtons.get(buttonName);
	if (info) info.currentPlacement = placement;
}

export function trackButton(
	buttonName: AllButtonNames,
	placement: ButtonPlacement,
	fullscreenPlacement: FullscreenPlacement,
	label: string,
	icon: SVGSVGElement | ToggleIcon,
	listener: ListenerType<boolean>,
	isToggle: boolean,
	initialChecked: boolean,
	effectivePlacement: ButtonPlacement,
	labelResolver?: () => string
) {
	trackedButtons.set(buttonName, {
		checked: initialChecked,
		currentEffectivePlacement: effectivePlacement,
		enabled: false,
		fullscreenPlacement,
		icon,
		initialized: false,
		isToggle,
		label,
		labelResolver,
		listener,
		placement
	});
}

export function untrackButton(buttonName: AllButtonNames) {
	trackedButtons.delete(buttonName);
}

export function updateTrackedButtonChecked(buttonName: AllButtonNames, checked: boolean) {
	const info = trackedButtons.get(buttonName);
	if (info) info.checked = checked;
}

export function updateTrackedButtonConfig(
	buttonName: AllButtonNames,
	fullscreenPlacement: FullscreenPlacement
) {
	const info = trackedButtons.get(buttonName);
	if (info) {
		info.fullscreenPlacement = fullscreenPlacement;
	}
}

export function updateTrackedButtonLabel(buttonName: AllButtonNames, label: string) {
	const info = trackedButtons.get(buttonName);
	if (info) info.label = label;
}

export function updateTrackedButtonLabelResolver(
	buttonName: AllButtonNames,
	labelResolver: () => string
) {
	const info = trackedButtons.get(buttonName);
	if (info) info.labelResolver = labelResolver;
}
