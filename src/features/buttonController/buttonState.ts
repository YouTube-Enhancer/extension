import type { ToggleIcon } from "@/src/icons";
import type { AllButtonNames, ButtonPlacement, FullscreenPlacement } from "@/src/types";

import type { ListenerType } from "./types";

// ─── Module-level state ───────────────────────────────────────────

export type TrackedButtonInfo = {
	checked: boolean;
	currentEffectivePlacement: ButtonPlacement;
	fullscreenPlacement: FullscreenPlacement;
	icon: SVGSVGElement | ToggleIcon;
	isToggle: boolean;
	label: string;
	labelResolver?: () => string;
	listener: ListenerType<boolean>;
	placement: ButtonPlacement;
};

export const trackedButtons = new Map<AllButtonNames, TrackedButtonInfo>();

// ─── State accessors ──────────────────────────────────────────────

export function getTrackedButtonChecked(buttonName: AllButtonNames): boolean | undefined {
	return trackedButtons.get(buttonName)?.checked;
}

export function getTrackedButtonFullscreenPlacement(buttonName: AllButtonNames): FullscreenPlacement | undefined {
	return trackedButtons.get(buttonName)?.fullscreenPlacement;
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
		fullscreenPlacement,
		icon,
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

export function updateTrackedButtonConfig(buttonName: AllButtonNames, fullscreenPlacement: FullscreenPlacement) {
	const info = trackedButtons.get(buttonName);
	if (info) {
		info.fullscreenPlacement = fullscreenPlacement;
	}
}

export function updateTrackedButtonLabel(buttonName: AllButtonNames, label: string) {
	const info = trackedButtons.get(buttonName);
	if (info) info.label = label;
}

export function updateTrackedButtonLabelResolver(buttonName: AllButtonNames, labelResolver: () => string) {
	const info = trackedButtons.get(buttonName);
	if (info) info.labelResolver = labelResolver;
}
