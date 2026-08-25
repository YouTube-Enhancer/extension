import type { Nullable } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { buildPlaylistEditCommand, buildToastCommand, dispatchNativeCommand } from "@/src/utils/dom/nativeCommands";
import {
	type ButtonViewModelVariant,
	createNativeButton,
	findButtonVariantInData,
	isNativeButtonComponentAvailable,
	readLockupData,
	readScopeClasses,
	setNativeButtonBusy,
	type YtButtonViewModelElement
} from "@/src/utils/dom/nativeComponents";
import { createTooltip } from "@/src/utils/dom/tooltip";
import { browserColorLog } from "@/src/utils/logging";
import { getCurrentPageType, getCurrentVideoId } from "@/src/utils/url";
import { getInnertubeClient, isVideoInPlaylist } from "@/src/utils/youtube";

import { metadata } from "./index.metadata";
import "./index.css";

const BUTTON_CLASS = "yte-save-to-watch-later-button";
const LOCKUP_SELECTOR = "yt-lockup-view-model";
// This class also appears in index.css. Keep both in sync.
const LOCKUP_MENU_WRAPPER_SELECTOR = "div.ytLockupMetadataViewModelMenuButton";
const ACTIONS_ROW_SELECTOR = "ytd-watch-metadata ytd-menu-renderer";
// Mutations inside these subtrees can never contain a lockup or the actions row.
const IGNORED_MUTATION_ROOTS = "#player, ytd-comments";

let videosObserver: Nullable<MutationObserver> = null;
let saveClickListener: Nullable<(event: Event) => void> = null;
// Teardown increments the generation. A setup that awaited across a teardown sees the change and aborts.
let setupGeneration = 0;
// Setup runs on every navigation.
let warnedUnavailable = false;
// Lockups to skip on later passes: not saveable, or already saved.
const skippedLockups = new WeakSet<Element>();

function createSaveButton({ scopeClasses = "", variant }: { scopeClasses?: string; variant: Partial<ButtonViewModelVariant> }) {
	const saveLabel = window.i18nextInstance.t((translations) => translations.pages.content.features.saveToWatchLaterButton.extras.saveVideo);
	return createNativeButton({
		accessibilityText: saveLabel,
		className: scopeClasses ? `${BUTTON_CLASS} ${scopeClasses}` : BUTTON_CLASS,
		icon: "WATCH_LATER",
		tooltip: saveLabel,
		variant
	});
}

// Only plain videos can go to Watch Later. Mixes, playlists, and albums cannot.
function isSaveableVideoData(data: ReturnType<typeof readLockupData>): boolean {
	if (!data) return false;
	if (data.contentType) return data.contentType === "LOCKUP_CONTENT_TYPE_VIDEO";
	// YouTube video ids have exactly 11 characters.
	return typeof data.contentId === "string" && /^[\w-]{11}$/.test(data.contentId);
}

async function setupSaveToWatchLaterButtons() {
	if (!isNativeButtonComponentAvailable()) {
		if (!warnedUnavailable) {
			warnedUnavailable = true;
			browserColorLog("yt-button-view-model is not registered. YouTube may have changed its components.", "warning");
			dispatchNativeCommand(
				buildToastCommand(window.i18nextInstance.t((translations) => translations.pages.content.features.saveToWatchLaterButton.extras.unavailable))
			);
		}
		return;
	}

	const generation = setupGeneration;
	const pageType = await getCurrentPageType();

	if (generation !== setupGeneration) return;

	const onWatchPage = pageType === "watch";
	const containerSelector = onWatchPage ? "ytd-watch-flexy" : `ytd-two-column-browse-results-renderer[page-subtype='${pageType}']`;

	// A save writes to this cache, so the next pass skips the button.
	let membershipCheck: Nullable<{ inWatchLater: Promise<boolean>; videoId: string }> = null;

	// YouTube can re-create a button host on a re-render, which silently drops listeners on the host.
	// Capture phase, so a stopPropagation in YouTube's own handlers cannot swallow the click.
	const inFlightSaves = new Set<string>();
	saveClickListener = (event) => {
		const host = (event.target as Nullable<HTMLElement>)?.closest?.(`.${BUTTON_CLASS}`) as Nullable<YtButtonViewModelElement>;
		if (!host) return;
		const lockup = host.closest(LOCKUP_SELECTOR);
		const videoId = lockup ? (readLockupData(lockup)?.contentId ?? null) : getCurrentVideoId();
		if (!videoId || inFlightSaves.has(videoId)) return;

		// Removal is a mutation, and the next observer pass would re-add the button.
		// Mark the video as saved first, so the passes skip it.
		const removeButtonForGood = () => {
			if (lockup) skippedLockups.add(lockup);
			else membershipCheck = { inWatchLater: Promise.resolve(true), videoId };
			host.remove();
		};

		// Try first with YouTube's pipeline, it also shows its own toast
		if (dispatchNativeCommand(buildPlaylistEditCommand({ playlistId: "WL", videoId }))) {
			removeButtonForGood();
			return;
		}

		inFlightSaves.add(videoId);
		setNativeButtonBusy(host, true);
		void (async () => {
			try {
				const youtube = await getInnertubeClient();
				await youtube.playlist.addVideos("WL", [videoId]);
				removeButtonForGood();
			} catch (error) {
				setNativeButtonBusy(host, false);
				const { listener } = createTooltip({
					element: host,
					featureName: "saveToWatchLaterButton",
					id: "yte-feature-saveToWatchLaterButton-tooltip",
					text: `${window.i18nextInstance.t((translations) => translations.pages.content.features.saveToWatchLaterButton.extras.failedToSaveVideo)}: ${
						error instanceof Error ? error.message : String(error)
					}`
				});
				listener();
			} finally {
				inFlightSaves.delete(videoId);
			}
		})();
	};
	document.addEventListener("click", saveClickListener, { capture: true });

	// Never latch a permanent done flag. A hydration re-render after an SPA navigation can
	// remove the inserted button. Each observer pass retries until the button is in place.
	let actionsRowPending = false;
	async function addActionsRowButton() {
		if (actionsRowPending || document.querySelector(`${ACTIONS_ROW_SELECTOR} .${BUTTON_CLASS}`)) return;
		const videoId = getCurrentVideoId();
		if (!videoId) return;

		actionsRowPending = true;
		try {
			if (membershipCheck?.videoId !== videoId) {
				// When the check is not possible, show the button.
				membershipCheck = { inWatchLater: isVideoInPlaylist(videoId, "WL").catch(() => false), videoId };
			}
			const inWatchLater = await membershipCheck.inWatchLater;
			if (inWatchLater || generation !== setupGeneration) return;

			// Query after the await. A hydration re-render can replace the row elements.
			const menuRenderer = document.querySelector(ACTIONS_ROW_SELECTOR);
			const sibling = menuRenderer?.querySelector<YtButtonViewModelElement>("yt-button-view-model");
			if (!sibling?.parentElement || menuRenderer?.querySelector(`.${BUTTON_CLASS}`)) return;

			const host = createSaveButton({
				scopeClasses: readScopeClasses(sibling),
				// The renderer data overrides the tonal default.
				variant: { type: "BUTTON_VIEW_MODEL_TYPE_TONAL", ...findButtonVariantInData((menuRenderer as { data?: unknown }).data) }
			});
			sibling.parentElement.insertBefore(host, sibling);
		} finally {
			actionsRowPending = false;
		}
	}

	function addLockupButtons(container: Element) {
		const videos = container.querySelectorAll(`${LOCKUP_SELECTOR}:not(:has(.${BUTTON_CLASS}))`);
		for (const video of videos) {
			if (skippedLockups.has(video)) continue;
			const data = readLockupData(video);
			if (!isSaveableVideoData(data)) {
				skippedLockups.add(video);
				continue;
			}

			const menuWrapper = video.querySelector(LOCKUP_MENU_WRAPPER_SELECTOR);
			const nativeMenuButton = menuWrapper?.querySelector("button-view-model");
			if (!menuWrapper || !nativeMenuButton) continue;

			const host = createSaveButton({ variant: findButtonVariantInData(data?.metadata) });
			menuWrapper.insertBefore(host, nativeMenuButton);
		}
	}

	// Attach the observer before the first pass, with no await gap, so two concurrent
	// setup runs cannot attach two observers.
	const container = document.querySelector(containerSelector);

	function addButtons() {
		if (generation !== setupGeneration || !container) return;
		addLockupButtons(container);
		if (onWatchPage) void addActionsRowButton();
	}

	if (container && !videosObserver) {
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
				addButtons();
			});
		});
		videosObserver.observe(container, { childList: true, subtree: true });
	}

	addButtons();
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
}

export default createFeature({
	...metadata,
	onDisable: () => {
		teardownMachinery();
		document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((saveButton) => {
			saveButton.remove();
		});
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
