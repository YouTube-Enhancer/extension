// Button building and placement: the card buttons and the actions-row toggle.

import type { Nullable } from "@/src/types";

import { buildToastCommand, dispatchNativeCommand } from "@/src/utils/dom/nativeCommands";
import {
	type ButtonViewModelVariant,
	createNativeButton,
	findButtonVariantInData,
	readLockupData,
	readScopeClasses,
	type YtButtonViewModelElement
} from "@/src/utils/dom/nativeComponents";
import { browserColorLog } from "@/src/utils/logging";
import { getCurrentVideoId } from "@/src/utils/url";
import { isVideoInPlaylist } from "@/src/utils/youtube";

import {
	ACTIONS_ROW_SELECTOR,
	BUTTON_CLASS,
	LOCKUP_MENU_WRAPPER_SELECTOR,
	LOCKUP_SELECTOR,
	SAVED_ICON,
	SEARCH_MENU_SLOT_SELECTOR,
	SEARCH_ROW_SELECTOR,
	SEARCH_ROW_THUMBNAIL_SELECTOR,
	UNSAVED_ICON
} from "./constants";
import { performPlaylistEdit } from "./saveActions";

// YouTube's renderer elements expose their props on a data property.
interface PolymerDataElement extends Element {
	data?: unknown;
}

// The search rows sit in a narrow action menu, so the button gets a filled shape to read as a button, not an icon.
const SEARCH_ROW_VARIANT = { type: "BUTTON_VIEW_MODEL_TYPE_TONAL" };

/**
 * Rows to skip on later passes: confirmed non-videos such as mixes and playlists, and videos already saved. A row
 * with no readable id is not added, since the id can hydrate on a later pass.
 */
let skippedRows = new WeakSet<Element>();
let warnedSelectorDrift = false;

export function addLockupButtons(container: Element) {
	const videos = container.querySelectorAll(`${LOCKUP_SELECTOR}:not(:has(.${BUTTON_CLASS}))`);
	for (const video of videos) {
		if (skippedRows.has(video)) continue;
		const data = readLockupData(video);
		if (!data) continue;
		if (!isSaveableVideoData(data)) {
			skippedRows.add(video);
			continue;
		}

		const menuWrapper = video.querySelector(LOCKUP_MENU_WRAPPER_SELECTOR);
		const nativeMenuButton = menuWrapper?.querySelector("button-view-model");
		if (!menuWrapper || !nativeMenuButton) {
			warnSelectorDriftOnce();
			continue;
		}

		const host = createSaveButton({ variant: findButtonVariantInData(data.metadata) });
		menuWrapper.insertBefore(host, nativeMenuButton);
	}
}

/**
 * The lockups are a view-model component, but a search row is still a legacy Polymer renderer: the id comes from its
 * data, and the menu slot is keyed on ids instead of classes.
 */
export function addSearchRowButtons(container: Element) {
	const rows = container.querySelectorAll(`${SEARCH_ROW_SELECTOR}:not(:has(.${BUTTON_CLASS}))`);
	for (const row of rows) {
		if (skippedRows.has(row) || !readSearchRowVideoId(row)) continue;

		const menuSlot = row.querySelector(SEARCH_MENU_SLOT_SELECTOR);
		if (!menuSlot) {
			warnSelectorDriftOnce();
			continue;
		}
		menuSlot.appendChild(createSaveButton({ variant: SEARCH_ROW_VARIANT }));
	}
}

export function createRowButtonController(isCurrent: () => boolean) {
	// The membership answer for the current video, fetched one time.
	let membershipCheck: Nullable<{ inWatchLater: Promise<boolean>; videoId: string }> = null;
	// The resolved toggle state, per video id.
	const rowSaved = new Map<string, boolean>();
	let pending = false;

	function buildButton(saved: boolean): Nullable<{ host: YtButtonViewModelElement; sibling: YtButtonViewModelElement }> {
		const menuRenderer = document.querySelector<PolymerDataElement>(ACTIONS_ROW_SELECTOR);
		const sibling = menuRenderer?.querySelector<YtButtonViewModelElement>(`yt-button-view-model:not(.${BUTTON_CLASS})`);
		if (!sibling?.parentElement) return null;
		const host = createSaveButton({
			saved,
			scopeClasses: readScopeClasses(sibling),
			// The renderer data overrides the tonal default.
			variant: { type: "BUTTON_VIEW_MODEL_TYPE_TONAL", ...findButtonVariantInData(menuRenderer?.data) }
		});
		return { host, sibling };
	}

	function swapButton(saved: boolean) {
		const current = document.querySelector(`${ACTIONS_ROW_SELECTOR} .${BUTTON_CLASS}`);
		const built = buildButton(saved);
		if (current && built) current.replaceWith(built.host);
	}

	return {
		/**
		 * Never latches a permanent done flag: a hydration re-render after an SPA navigation can remove the inserted
		 * button, so each observer pass retries until the button is in place.
		 */
		async ensureButton() {
			if (pending || document.querySelector(`${ACTIONS_ROW_SELECTOR} .${BUTTON_CLASS}`)) return;
			const videoId = getCurrentVideoId();
			if (!videoId) return;

			pending = true;
			try {
				// Insert immediately in the last known state. The membership check corrects it later.
				const built = buildButton(rowSaved.get(videoId) ?? false);
				if (!built) return;
				built.sibling.parentElement?.insertBefore(built.host, built.sibling);

				if (rowSaved.has(videoId)) return;
				if (membershipCheck?.videoId !== videoId) {
					// When the check is not possible, keep the unsaved state.
					membershipCheck = { inWatchLater: isVideoInPlaylist(videoId, "WL").catch(() => false), videoId };
				}
				const inWatchLater = await membershipCheck.inWatchLater;
				// A click can settle the state while the check awaited. The click wins.
				if (!isCurrent() || rowSaved.has(videoId)) return;
				rowSaved.set(videoId, inWatchLater);
				if (inWatchLater) swapButton(true);
			} finally {
				pending = false;
			}
		},

		toggle(host: YtButtonViewModelElement, videoId: string) {
			const saved = rowSaved.get(videoId) ?? false;
			performPlaylistEdit({
				host,
				isCurrent,
				onSuccess: () => {
					if (!isCurrent()) return;
					rowSaved.set(videoId, !saved);
					swapButton(!saved);
					// YouTube's pipeline shows a toast for a save, but not for a removal.
					if (saved) {
						dispatchNativeCommand(
							buildToastCommand(
								window.i18nextInstance.t((translations) => translations.pages.content.features.saveToWatchLaterButton.extras.removedVideo)
							)
						);
					}
				},
				removing: saved,
				videoId
			});
		}
	};
}

export function createSaveButton({
	saved = false,
	scopeClasses = "",
	variant
}: {
	saved?: boolean;
	scopeClasses?: string;
	variant: Partial<ButtonViewModelVariant>;
}) {
	const label = window.i18nextInstance.t((translations) =>
		saved ?
			translations.pages.content.features.saveToWatchLaterButton.extras.removeVideo
		:	translations.pages.content.features.saveToWatchLaterButton.extras.saveVideo
	);
	return createNativeButton({
		accessibilityText: label,
		className: scopeClasses ? `${BUTTON_CLASS} ${scopeClasses}` : BUTTON_CLASS,
		icon: saved ? SAVED_ICON : UNSAVED_ICON,
		tooltip: label,
		variant
	});
}

export function markRowSaved(row: Element) {
	skippedRows.add(row);
}

/**
 * The lockups are a view-model component, but a search row is still a legacy Polymer renderer: no id attribute, and
 * a menu slot keyed on ids instead of classes.
 */
export function readSearchRowVideoId(row: Element) {
	// A search row is a video by definition, so the id only has to be a non-empty string.
	const { videoId } = ((row as PolymerDataElement).data ?? {}) as { videoId?: unknown };
	if (typeof videoId === "string" && videoId) return videoId;
	// Fall back to the thumbnail link, which every search row has.
	const href = row.querySelector<HTMLAnchorElement>(SEARCH_ROW_THUMBNAIL_SELECTOR)?.getAttribute("href");
	return new URLSearchParams(href?.split("?")[1] ?? "").get("v");
}

export function resetRowState() {
	skippedRows = new WeakSet<Element>();
	warnedSelectorDrift = false;
}

// Only plain videos can go to Watch Later. Mixes, playlists, and albums cannot.
function isSaveableVideoData(data: NonNullable<ReturnType<typeof readLockupData>>): boolean {
	if (data.contentType) return data.contentType === "LOCKUP_CONTENT_TYPE_VIDEO";
	// YouTube video ids have exactly 11 characters.
	return typeof data.contentId === "string" && /^[\w-]{11}$/.test(data.contentId);
}

function warnSelectorDriftOnce() {
	if (warnedSelectorDrift) return;
	warnedSelectorDrift = true;
	browserColorLog("A saveable video has no place to put the Watch Later button. YouTube may have changed its layout.", "warning");
}
