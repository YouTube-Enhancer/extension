import type { Nullable } from "@/src/types";

import {
	getVideoHref,
	handleTimestampElementsHover,
	observeTimestampElements,
	timestampElementSelector,
	timestampsWithListeners
} from "@/src/features/timestampPeek/utils";
import { commentsHeaderSelector, commentsPanelSelector, type EngagementPanelVisibility } from "@/src/utils/constants";
import eventManager from "@/src/utils/EventManager";
import {
	isNewYouTubeVideoLayout,
	isWatchPage,
	observeCommentsPanelVisibilityChange,
	waitForAllElements,
	waitForSpecificMessage
} from "@/src/utils/utilities";

import "./index.css";
let timestampElementObserver: Nullable<MutationObserver> = null;
let commentsPanelObserver: Nullable<MutationObserver> = null;
type ObserverType = "commentsPanel" | "timestampElement";
function setTimestampPeekObserver(observerType: ObserverType, observer: MutationObserver) {
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	observerType === "timestampElement" ?
		(timestampElementObserver?.disconnect(), (timestampElementObserver = observer))
	:	(commentsPanelObserver?.disconnect(), (commentsPanelObserver = observer));
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	observerType === "timestampElement" ? (timestampElementObserver = observer) : (commentsPanelObserver = observer);
}
function cleanUpTimestampPeekObserver(observerType: ObserverType) {
	timestampsWithListeners.clear();
	if (observerType === "timestampElement") {
		timestampElementObserver?.disconnect();
		timestampElementObserver = null;
	} else {
		commentsPanelObserver?.disconnect();
		commentsPanelObserver = null;
	}
}

export async function enableTimestampPeek() {
	const {
		data: {
			options: { enable_timestamp_peek }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_timestamp_peek) return;
	if (!isWatchPage()) return;
	await waitForAllElements(["div#player", "div#player-wide-container", "div#video-container", "div#player-container"]);
	const isNewVideoLayout = isNewYouTubeVideoLayout();
	const timestampLinkHref = getVideoHref();
	if (!timestampLinkHref) return;
	if (isNewVideoLayout) {
		await waitForAllElements([commentsPanelSelector]);
		const commentsPanelElement = document.querySelector(commentsPanelSelector);
		if (
			commentsPanelElement &&
			(commentsPanelElement.getAttribute("visibility") as EngagementPanelVisibility) === "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"
		) {
			await waitForAllElements([`${timestampElementSelector}[href^='${timestampLinkHref}']`]);
			eventManager.removeEventListeners("timestampPeek");
			cleanUpTimestampPeekObserver("timestampElement");
			handleTimestampElementsHover();
		}
		const observer = observeCommentsPanelVisibilityChange({
			ENGAGEMENT_PANEL_VISIBILITY_EXPANDED: () => {
				eventManager.removeEventListeners("timestampPeek");
				cleanUpTimestampPeekObserver("timestampElement");
				handleTimestampElementsHover();
				const observer = observeTimestampElements();
				if (observer) setTimestampPeekObserver("timestampElement", observer);
			},
			ENGAGEMENT_PANEL_VISIBILITY_HIDDEN: () => {
				eventManager.removeEventListeners("timestampPeek");
				cleanUpTimestampPeekObserver("timestampElement");
			}
		});
		if (observer) setTimestampPeekObserver("commentsPanel", observer);
	} else {
		await waitForAllElements([commentsHeaderSelector]);
		eventManager.removeEventListeners("timestampPeek");
		cleanUpTimestampPeekObserver("timestampElement");
		await waitForAllElements([`${timestampElementSelector}[href^='${timestampLinkHref}']`]);
		handleTimestampElementsHover();
		const observer = observeTimestampElements();
		if (observer) setTimestampPeekObserver("timestampElement", observer);
	}
}
export function disableTimestampPeek() {
	cleanUpTimestampPeekObserver("timestampElement");
	cleanUpTimestampPeekObserver("commentsPanel");
	eventManager.removeEventListeners("timestampPeek");
}
