import type { ButtonPlacement, FullscreenPlacement, Nullable } from "@/src/types";

import { createStyledElement } from "@/src/utils/dom/elements";
import { waitForElement } from "@/src/utils/dom/wait";
import { isNewYouTubeVideoLayout } from "@/src/utils/url";

import { buttonContainerId, playerControlsSelectors } from "./constants";
import { isFullscreen, isInTheaterMode, placementTransition } from "./placementTransition";

// ─── Module-level state ───────────────────────────────────────────

const rightControlsContainerId = "yte-right-controls-container";
/** Cache of resolved placement containers, keyed by placement type. Invalidated on navigation. */
const containerCache = new Map<ButtonPlacement, HTMLElement>();

// ─── Exported functions ───────────────────────────────────────────

export function getCachedContainer(placement: ButtonPlacement): HTMLElement | undefined {
	return containerCache.get(placement);
}

export function getEffectivePlacement(
	placement: ButtonPlacement,
	fullscreenPlacement: FullscreenPlacement
): ButtonPlacement {
	return isFullscreen() && fullscreenPlacement !== "same" ? fullscreenPlacement : placement;
}

export async function getOrCreateButtonContainer(
	inTheaterMode: boolean
): Promise<Nullable<HTMLDivElement>> {
	let container = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
	if (container) {
		return container;
	}
	container = createStyledElement({
		elementId: buttonContainerId,
		elementType: "div",
		styles: { display: "flex", height: "48px", justifyContent: "center" }
	});
	if (inTheaterMode) {
		const isNewLayout = isNewYouTubeVideoLayout();
		const parent = isNewLayout
			? document.querySelector<HTMLElement>("ytd-watch-grid")
			: document.querySelector<HTMLElement>("ytd-watch-flexy");
		if (!parent) return null;
		const columns = parent.querySelector("#columns");
		if (columns) {
			parent.insertBefore(container, columns);
			return container;
		}
		parent.append(container);
		return container;
	}
	const player = await waitForElement<HTMLDivElement>(
		"div#primary > div#primary-inner > div#player"
	);
	if (!player) return null;
	player.insertAdjacentElement("afterend", container);
	return container;
}

export function getOrCreateRightControlsContainer(): Nullable<HTMLDivElement> {
	// Probe synchronously: a stripped page has no controls and must not burn the
	// full wait budget; live pages render controls late, and callers defer.
	const rightControls = document.querySelector<HTMLDivElement>(
		playerControlsSelectors.player_controls_right
	);
	if (!rightControls) return null;
	let container = rightControls.querySelector<HTMLDivElement>(`#${rightControlsContainerId}`);
	if (!container) {
		container = createStyledElement({
			elementId: rightControlsContainerId,
			elementType: "div",
			styles: { alignItems: "center", display: "flex" }
		});
		const leftSide = rightControls.querySelector<HTMLDivElement>(".ytp-right-controls-left");
		if (leftSide) leftSide.insertAdjacentElement("beforebegin", container);
		else rightControls.prepend(container);
	}
	return container;
}

export function getPlacementRoot(placement: ButtonPlacement) {
	// Synchronous probe: placement targets that have not rendered are handled by
	// the mutation-bus deferral in addButton, not by waiting inline.
	switch (placement) {
		case "below_player":
			return document.getElementById(buttonContainerId) as HTMLDivElement | null;
		case "feature_menu":
			return document.querySelector<HTMLDivElement>("#yte-feature-menu");
		case "player_controls_left":
			return document.querySelector<HTMLDivElement>(playerControlsSelectors.player_controls_left);
		case "player_controls_right":
			return document.querySelector<HTMLDivElement>(playerControlsSelectors.player_controls_right);
	}
}

export function getPlacementSelector(placement: ButtonPlacement): string | undefined {
	if (placement === "below_player") {
		return isInTheaterMode()
			? isNewYouTubeVideoLayout()
				? "ytd-watch-grid"
				: "ytd-watch-flexy"
			: "div#primary > div#primary-inner > div#player";
	}
	if (placement === "feature_menu") return "#yte-feature-menu";
	if (placement === "player_controls_left" || placement === "player_controls_right")
		return playerControlsSelectors[placement];
	return undefined;
}

export function invalidateContainerCache() {
	containerCache.clear();
}

export async function placeButton(
	button: HTMLButtonElement,
	placement: Exclude<ButtonPlacement, "feature_menu">
) {
	switch (placement) {
		case "below_player": {
			const inTheaterMode = isInTheaterMode();
			const container = await getOrCreateButtonContainer(inTheaterMode);
			if (!container) return;
			placementTransition.activate(container, () => {});
			const existingInContainer = container.querySelectorAll(`#${button.id}`);
			existingInContainer.forEach((b) => b.remove());
			container.append(button);
			break;
		}
		case "player_controls_left": {
			let leftControls = containerCache.get(placement) as HTMLDivElement | undefined;
			if (!leftControls) {
				leftControls = document.querySelector<HTMLDivElement>(".ytp-left-controls") ?? undefined;
				if (leftControls) containerCache.set(placement, leftControls);
			}
			if (!leftControls) return;
			const existingInContainer = leftControls.querySelectorAll(`#${button.id}`);
			existingInContainer.forEach((b) => b.remove());
			const timeDisplay = leftControls.querySelector<HTMLDivElement>(".ytp-time-display");
			// Live players can render the controls without a time display; never drop the
			// button silently, fall back to the start of the controls.
			if (timeDisplay) timeDisplay.insertAdjacentElement("beforebegin", button);
			else leftControls.prepend(button);
			break;
		}
		case "player_controls_right": {
			const container = getOrCreateRightControlsContainer();
			if (!container) return;
			containerCache.set(placement, container);
			const existingInContainer = container.querySelectorAll(`#${button.id}`);
			existingInContainer.forEach((b) => b.remove());
			container.append(button);
			break;
		}
	}
}

export function startPlacementTracking(onFullscreenChange: () => void) {
	if (!placementTransition.isActive()) {
		const container = document.querySelector<HTMLDivElement>(`#${buttonContainerId}`);
		if (container) {
			placementTransition.activate(container, onFullscreenChange);
		}
	}
}

export function stopPlacementTracking() {
	placementTransition.deactivate();
}
