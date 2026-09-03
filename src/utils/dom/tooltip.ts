import type { AllButtonNames, SingleButtonNames } from "@/src/types";

import eventManager, { type FeatureName } from "@/src/events/EventManager";
import { isModernYouTubeVideoLayout } from "@/src/utils/url";
/**
 * Creates a tooltip element and adds it to the element or a parent element.
 *
 * @param {direction: "down" | "left" | "right" | "up"} The direction of the tooltip.
 * @param {element: HTMLElement} The element that the tooltip is attached to.
 * @param {featureName: FeatureName} The feature name of the tooltip.
 * @param {id: `yte-feature-${AllButtonNames | Exclude<FeatureName, SingleButtonNames>}-tooltip} The id of the tooltip element.
 * @param {text: string} The text content of the tooltip element.
 * @returns {tooltip: HTMLElement} The created tooltip element.
 */
export function createTooltip({
	direction = "up",
	element,
	featureName,
	id,
	text
}: {
	direction?: "down" | "left" | "right" | "up";
	element: HTMLElement;
	featureName: FeatureName;
	id: `yte-feature-${AllButtonNames | Exclude<FeatureName, SingleButtonNames>}-tooltip`;
	text?: string;
}) {
	function makeTooltip() {
		const isMiniPlayer = document.documentElement.classList.contains("yte-mini-player-active");

		const tooltip = createTooltipElement({
			id,
			styles: {
				visibility: "hidden",
				zIndex: isMiniPlayer ? "2147483647" : "99999"
			},
			text: text ?? element.dataset.title ?? ""
		});

		const mouseLeaveListener = () => tooltip.remove();
		eventManager.addEventListener(element, "mouseleave", mouseLeaveListener, featureName);

		return tooltip;
	}

	return {
		listener: () => {
			document.getElementById(id)?.remove();
			const tooltip = makeTooltip();
			const isMini = document.documentElement.classList.contains("yte-mini-player-active");
			const playerContainer = document.querySelector<HTMLDivElement>("#movie_player");
			// Buttons that live outside the player (below it, in the playlist panel, ...) need the tooltip on the
			// body, otherwise it is positioned against the player box it is not in.
			const isButtonOutsidePlayer = !playerContainer?.contains(element);
			if (isMini || isButtonOutsidePlayer) {
				document.body.appendChild(tooltip);
			} else {
				if (playerContainer?.offsetParent) playerContainer.appendChild(tooltip);
				else document.body.appendChild(tooltip);
			}
			positionTooltip({ direction, element, tooltip });
		},
		remove: () => document.getElementById(id)?.remove(),
		update: () => {
			const tooltip = document.getElementById(id);
			if (!tooltip) return;
			tooltip.textContent = element.dataset.title ?? "";
			positionTooltip({ direction, element, tooltip });
		}
	};
}
/**
 * Removes the tooltip element with the given id.
 *
 * @param {id} the id of the tooltip element to remove.
 * @returns {void}
 */
export function removeTooltip(id: `yte-feature-${FeatureName}-tooltip`) {
	const tooltip = document.getElementById(id);
	if (!tooltip) return;
	tooltip.remove();
}
function createTooltipElement<T extends Record<string, unknown>>({ id, styles, text }: { id: string; styles: T; text: string }) {
	const tooltip = document.createElement("div");
	tooltip.id = id;
	tooltip.className = "yte-button-tooltip ytp-tooltip ytp-bottom";
	tooltip.textContent = text;
	Object.assign(tooltip.style, styles);
	return tooltip;
}
function positionTooltip(params: { direction: "down" | "left" | "right" | "up"; element: HTMLElement; tooltip: HTMLElement }) {
	const { direction, element, tooltip } = params;
	const rect = element.getBoundingClientRect();
	const tooltipRect = tooltip.getBoundingClientRect();
	const isModern = isModernYouTubeVideoLayout();
	const gap = isModern ? 8 : 6;
	const viewportPadding = 8;
	const maxLeft = window.innerWidth - tooltipRect.width - viewportPadding;
	const maxTop = window.innerHeight - tooltipRect.height - viewportPadding;

	const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

	let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
	let top = rect.top - tooltipRect.height - gap;

	if (direction === "down") {
		top = rect.bottom + gap;
		if (top > maxTop) top = rect.top - tooltipRect.height - gap;
	}

	if (direction === "left") {
		left = rect.left - tooltipRect.width - gap;
		top = rect.top + rect.height / 2 - tooltipRect.height / 2;
	}

	if (direction === "right") {
		left = rect.right + gap;
		top = rect.top + rect.height / 2 - tooltipRect.height / 2;
	}

	if (direction === "up" && top < viewportPadding) top = rect.bottom + gap;

	Object.assign(tooltip.style, {
		left: `${clamp(left, viewportPadding, Math.max(viewportPadding, maxLeft))}px`,
		top: `${clamp(top, viewportPadding, Math.max(viewportPadding, maxTop))}px`,
		transform: "none",
		visibility: "visible"
	});
}
