import type { Nullable } from "@/src/types";

import { waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";
const FULLERSCREEN_ATTR = "deprecate-fullerscreen-ui";
let cachedFullscreenElements: Nullable<NodeListOf<Element>> = null;
export function disableRestoreFullscreenScrolling() {
	cachedFullscreenElements?.forEach((el) => el.setAttribute(FULLERSCREEN_ATTR, ""));
}
export async function enableRestoreFullscreenScrolling() {
	const {
		data: {
			options: { enable_restore_fullscreen_scrolling }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_restore_fullscreen_scrolling) return;
	await waitForAllElements([`[${FULLERSCREEN_ATTR}]`]);
	const elements = document.querySelectorAll(`[${FULLERSCREEN_ATTR}]`);
	cachedFullscreenElements = elements;
	elements.forEach((el) => el.removeAttribute(FULLERSCREEN_ATTR));
}
