import type { FeatureStateAPI } from "@/src/features/_registry/types";

import eventManager from "@/src/events/EventManager";
import { createTooltip } from "@/src/utils/dom/tooltip";
import { waitForElement } from "@/src/utils/dom/wait";
import { isWatchPage } from "@/src/utils/url";

import { applyPlaylistPageReversal, applyReversal } from "./reversal";
import { createReverseIcon, FEATURE_NAME, getHeaderSelector, isCurrentlyReversed, isPlaylistDataReady, poll } from "./utils";

type StateAPI = FeatureStateAPI<"playlistReverseButton">;

let reverseButton: HTMLButtonElement | null = null;
let reverseButtonContainer: HTMLDivElement | null = null;
let headerContainerElement: HTMLElement | null = null;
let tooltipUpdate: (() => void) | null = null;

async function ensureReversalSticks(stateAPI: StateAPI, reversal: () => boolean, inject: () => Promise<void>, maxTime = 3000): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < maxTime) {
		await new Promise((resolve) => setTimeout(resolve, 500));
		const { isReversed } = stateAPI.getState();
		if (!isReversed) return;
		if (isCurrentlyReversed()) continue;
		reversal();
		await inject();
	}
}

async function injectButton(stateAPI: StateAPI, container?: HTMLElement | string) {
	const resolvedContainer =
		typeof container === "string" || container === undefined ?
			await waitForElement<HTMLElement>(container ?? getHeaderSelector(), 5000, "optional")
		:	container;
	if (!resolvedContainer) return;

	removeButton();
	headerContainerElement = resolvedContainer;

	const { isReversed } = stateAPI.getState();
	reverseButton = document.createElement("button");
	reverseButton.id = "yte-playlist-reverse-button";
	reverseButton.className = "yte-playlist-reverse-button";
	const tooltipText = window.i18nextInstance.t((tr) => tr.pages.content.features.playlistReverseButton.toggle[isReversed ? "on" : "off"]);
	reverseButton.dataset.title = tooltipText;
	reverseButton.appendChild(createReverseIcon());

	reverseButtonContainer = document.createElement("div");
	reverseButtonContainer.id = "yte-button-container";
	reverseButtonContainer.appendChild(reverseButton);

	insertButtonInto(headerContainerElement);

	const {
		listener: tooltipListener,
		remove: removeTooltipFn,
		update: updateTooltip
	} = createTooltip({
		direction: "down",
		element: reverseButton,
		featureName: FEATURE_NAME,
		id: `yte-feature-${FEATURE_NAME}-tooltip`
	});
	tooltipUpdate = updateTooltip;
	eventManager.addEventListener(reverseButton, "mouseenter", tooltipListener, FEATURE_NAME);

	eventManager.addEventListener(
		reverseButton,
		"click",
		(event) => {
			event.stopPropagation();
			const { isReversed: currentReversed } = stateAPI.getState();
			const newReversed = !currentReversed;
			stateAPI.setState((prev) => ({ ...prev, isReversed: newReversed }));

			if (isWatchPage()) {
				applyReversal();
			} else {
				applyPlaylistPageReversal();
			}

			const label = window.i18nextInstance.t((tr) => tr.pages.content.features.playlistReverseButton.toggle[newReversed ? "on" : "off"]);
			reverseButton!.dataset.title = label;
			tooltipUpdate?.();
			removeTooltipFn();

			requestAnimationFrame(() => {
				if (reverseButtonContainer && !reverseButtonContainer.isConnected && headerContainerElement) {
					insertButtonInto(headerContainerElement);
				}
			});
		},
		FEATURE_NAME
	);
}

function insertButtonInto(container: HTMLElement) {
	const menu = container.querySelector("#playlist-action-menu");
	if (menu) {
		menu.insertAdjacentElement("afterend", reverseButtonContainer!);
	} else {
		container.appendChild(reverseButtonContainer!);
	}
}

function pollForDataReady(timeout = 3000): Promise<boolean> {
	return poll(isPlaylistDataReady, Boolean, 100, timeout).then((r) => r ?? false);
}

function removeButton() {
	reverseButton = null;
	tooltipUpdate = null;
	headerContainerElement = null;
	if (reverseButtonContainer) {
		reverseButtonContainer.remove();
		reverseButtonContainer = null;
	}
}

export { ensureReversalSticks, injectButton, insertButtonInto, pollForDataReady, removeButton };
