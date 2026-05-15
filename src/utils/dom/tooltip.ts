import type { AllButtonNames, SingleButtonNames } from "@/src/types";

import eventManager, { type FeatureName } from "@/src/events/EventManager";
import { conditionalStyles } from "@/src/utils/style";
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
		const isModern = isModernYouTubeVideoLayout();
		const isMiniPlayer = document.documentElement.classList.contains("yte-mini-player-active");

		const styles = getTooltipPositionStyles({
			direction,
			element,
			isMiniPlayer,
			isModern
		});

		const tooltip = createTooltipElement({
			id,
			styles,
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
			const isButtonBelowPlayer = element?.parentElement?.id === "yte-button-container";
			const playerContainer = document.querySelector<HTMLDivElement>("#movie_player");
			if (isMini || isButtonBelowPlayer) {
				document.body.appendChild(tooltip);
			} else {
				if (playerContainer?.offsetParent) playerContainer.appendChild(tooltip);
				else document.body.appendChild(tooltip);
			}
		},
		remove: () => document.getElementById(id)?.remove(),
		update: () => {
			const tooltip = document.getElementById(id);
			if (!tooltip) return;
			tooltip.textContent = element.dataset.title ?? "";
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
function getTooltipPositionStyles(params: {
	direction: "down" | "left" | "right" | "up";
	element: HTMLElement;
	isMiniPlayer: boolean;
	isModern: boolean;
}) {
	const { direction, element, isMiniPlayer, isModern } = params;
	const rect = element.getBoundingClientRect();

	return {
		...conditionalStyles({
			condition: direction === "down" || direction === "up",
			left: `${rect.left + rect.width / 2}px`
		}),
		...conditionalStyles({
			condition: direction === "up",
			top: `${rect.top - (isModern ? 6 : 1)}px`
		}),
		...conditionalStyles({
			condition: direction === "down",
			top: `${rect.bottom + rect.height}px`
		}),
		...conditionalStyles({
			condition: direction === "left",
			left: `${rect.left - rect.width}px`,
			top: `${rect.bottom}px`
		}),
		...conditionalStyles({
			condition: direction === "right",
			left: `${rect.right + rect.width}px`,
			top: `${rect.bottom}px`
		}),
		zIndex: isMiniPlayer ? "2147483647" : "99999"
	};
}
