import type { FeatureStateAPI } from "@/src/features/_registry/types";
import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createTooltip } from "@/src/utils/dom/tooltip";
import { waitForElement } from "@/src/utils/dom/wait";
import { isWatchPage } from "@/src/utils/url";

import { REVERSE_BUTTON_CONTAINER_ID, REVERSE_BUTTON_ID } from "./constants";
import { reversePlaylistPage, toggleReversal } from "./reversal";
import { createReverseIcon, FEATURE_NAME, getHeaderSelector, isPlaylistDataReady, poll } from "./utils";

type StateAPI = FeatureStateAPI<"playlistReverseButton">;

let reverseButton: Nullable<HTMLButtonElement> = null;
let reverseButtonContainer: Nullable<HTMLDivElement> = null;
let headerContainerElement: Nullable<HTMLElement> = null;
let tooltipUpdate: Nullable<() => void> = null;

/** Puts the button back when a re-render of its header took it away; an attached button is left alone. */
async function ensureButton(stateAPI: StateAPI, container?: HTMLElement | string): Promise<void> {
	if (reverseButtonContainer?.isConnected) return;
	await injectButton(stateAPI, container);
}

/**
 * Keeps checking the order for a while after setup, for the data YouTube may still hand over on top of the
 * feature's. `restore` is expected to change nothing when the order is already right, and the button is only looked
 * at again when it did change something. The checks end early once `isActive` says the setup they belong to is over.
 */
async function ensureReversalSticks(
	stateAPI: StateAPI,
	restore: () => boolean,
	inject: () => Promise<void>,
	isActive: () => boolean,
	maxTime = 3000
): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < maxTime) {
		await new Promise((resolve) => setTimeout(resolve, 500));
		if (!isActive()) return;
		const { isReversed } = stateAPI.getState();
		if (!isReversed) return;
		if (restore()) await inject();
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
	reverseButton.id = REVERSE_BUTTON_ID;
	reverseButton.className = REVERSE_BUTTON_ID;
	const tooltipText = window.i18nextInstance.t((tr) => tr.pages.content.features.playlistReverseButton.extras.toggle[isReversed ? "on" : "off"]);
	reverseButton.dataset.title = tooltipText;
	reverseButton.appendChild(createReverseIcon());

	reverseButtonContainer = document.createElement("div");
	reverseButtonContainer.id = REVERSE_BUTTON_CONTAINER_ID;
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
				toggleReversal(newReversed);
			} else {
				void reversePlaylistPage();
			}

			const label = window.i18nextInstance.t((tr) => tr.pages.content.features.playlistReverseButton.extras.toggle[newReversed ? "on" : "off"]);
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

export { ensureButton, ensureReversalSticks, injectButton, insertButtonInto, pollForDataReady, removeButton };
