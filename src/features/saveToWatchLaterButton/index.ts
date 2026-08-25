import type { Nullable } from "@/src/types";

import eventManager from "@/src/events/EventManager";
import { createFeature } from "@/src/features/_registry/createFeature";
import { buildToastCommand, dispatchNativeCommand } from "@/src/utils/dom/nativeCommands";
import { readLockupData, waitForNativeButtonComponent, type YtButtonViewModelElement } from "@/src/utils/dom/nativeComponents";
import { waitForElement } from "@/src/utils/dom/wait";
import { browserColorLog } from "@/src/utils/logging";
import { getCurrentPageType, getCurrentVideoId } from "@/src/utils/url";

import { addLockupButtons, createRowButtonController, markLockupSaved, resetCardState } from "./buttons";
import { ACTIONS_ROW_SELECTOR, BUTTON_CLASS, IGNORED_MUTATION_ROOTS, LOCKUP_SELECTOR, WATCH_CONTAINER_SELECTOR } from "./constants";
import { metadata } from "./index.metadata";
import { inFlightSaves, performPlaylistEdit } from "./saveActions";
import "./index.css";

let videosObserver: Nullable<MutationObserver> = null;
let saveClickListener: Nullable<(event: Event) => void> = null;
// Teardown increments the generation. A setup that awaited across a teardown sees the change and aborts.
let setupGeneration = 0;
// Warn one time per session. Setup runs on every navigation. onDisable resets the flag.
let warnedUnavailable = false;

async function setupSaveToWatchLaterButtons() {
	const generation = setupGeneration;
	const isCurrent = () => generation === setupGeneration;

	if (!(await waitForNativeButtonComponent())) {
		if (!warnedUnavailable && isCurrent()) {
			warnedUnavailable = true;
			browserColorLog("yt-button-view-model is not registered. YouTube may have changed its components.", "warning");
			dispatchNativeCommand(
				buildToastCommand(window.i18nextInstance.t((translations) => translations.pages.content.features.saveToWatchLaterButton.extras.unavailable))
			);
		}
		return;
	}
	if (!isCurrent()) return;

	const pageType = await getCurrentPageType();
	if (!isCurrent()) return;

	const onWatchPage = pageType === "watch";
	const containerSelector = onWatchPage ? WATCH_CONTAINER_SELECTOR : `ytd-two-column-browse-results-renderer[page-subtype='${pageType}']`;
	const rowButtons = createRowButtonController(isCurrent);

	// YouTube can re-create a button host on a re-render, which silently drops listeners on the host.
	// Capture phase, so a stopPropagation in YouTube's own handlers cannot swallow the click.
	saveClickListener = (event) => {
		const host = (event.target as Nullable<HTMLElement>)?.closest?.(`.${BUTTON_CLASS}`) as Nullable<YtButtonViewModelElement>;
		if (!host) return;

		// The actions-row button toggles. The card buttons save and go away.
		const lockup = host.closest(LOCKUP_SELECTOR);
		if (!lockup) {
			const videoId = getCurrentVideoId();
			if (videoId) rowButtons.toggle(host, videoId);
			return;
		}

		const videoId = readLockupData(lockup)?.contentId;
		if (!videoId) return;
		performPlaylistEdit({
			host,
			isCurrent,
			onSuccess: () => {
				// Removal is a mutation, and the next observer pass would re-add the button.
				// Mark the video as saved first, so the passes skip it.
				markLockupSaved(lockup);
				host.remove();
			},
			removing: false,
			videoId
		});
	};
	document.addEventListener("click", saveClickListener, { capture: true });

	function addButtons(container: Element) {
		if (!isCurrent()) return;
		addLockupButtons(container);
		if (onWatchPage) void rowButtons.ensureButton();
	}

	// The container can hydrate after navigation. Wait for it instead of a one-shot query.
	const container = await waitForElement<Element>(containerSelector, 5000, "optional");
	if (!isCurrent() || !container) return;

	if (!videosObserver) {
		let passScheduled = false;
		videosObserver = new MutationObserver((records) => {
			const relevant = records.some((record) => {
				const target = record.target instanceof Element ? record.target : record.target.parentElement;
				return !target?.closest(IGNORED_MUTATION_ROOTS);
			});
			if (!relevant || passScheduled) return;
			passScheduled = true;
			requestAnimationFrame(() => {
				passScheduled = false;
				addButtons(container);
			});
		});
		videosObserver.observe(container, { childList: true, subtree: true });
	}

	addButtons(container);
}

function teardownMachinery() {
	setupGeneration++;

	if (videosObserver) {
		videosObserver.disconnect();
		videosObserver = null;
	}

	if (saveClickListener) {
		document.removeEventListener("click", saveClickListener, { capture: true });
		saveClickListener = null;
	}

	eventManager.removeEventListeners("saveToWatchLaterButton");
}

export default createFeature({
	...metadata,
	onDisable: () => {
		teardownMachinery();
		document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((saveButton) => {
			saveButton.remove();
		});
		resetCardState();
		inFlightSaves.clear();
		warnedUnavailable = false;
	},
	onEnable: async () => {
		await setupSaveToWatchLaterButtons();
	},
	onNavigate: async () => {
		teardownMachinery();
		// Keep the card buttons in place: YouTube destroys them with the old page, and a cached
		// page comes back with working buttons, with no flash. The dedupe selector stops duplicates.
		// The actions row is the exception. YouTube reuses it between watch pages, and the next
		// video needs a fresh membership check.
		document.querySelector(`${ACTIONS_ROW_SELECTOR} .${BUTTON_CLASS}`)?.remove();
		await setupSaveToWatchLaterButtons();
	}
});
