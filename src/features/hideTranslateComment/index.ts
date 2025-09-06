import type { Nullable } from "@/src/types";

import {
	type EngagementPanelVisibility,
	observeCommentsPanelVisibilityChange,
	observeTranslateComment,
	translateButtonSelector
} from "@/src/features/hideTranslateComment/utils";
import { isNewYouTubeVideoLayout, modifyElementClassList, waitForAllElements, waitForSpecificMessage } from "@/src/utils/utilities";

import "./index.css";
export const commentsPanelSelector = "ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-comments-section']";
export const commentsHeaderSelector = "ytd-item-section-renderer.ytd-comments div#header div#leading-section";
let translateCommentObserver: Nullable<MutationObserver> = null;
let commentsPanelObserver: Nullable<MutationObserver> = null;
type ObserverType = "commentsPanel" | "translateComment";
export function cleanUpHideTranslateCommentObserver(observerType: ObserverType) {
	if (observerType === "translateComment") {
		translateCommentObserver?.disconnect();
		translateCommentObserver = null;
	} else {
		commentsPanelObserver?.disconnect();
		commentsPanelObserver = null;
	}
}
export async function disableHideTranslateComment() {
	cleanUpHideTranslateCommentObserver("commentsPanel");
	cleanUpHideTranslateCommentObserver("translateComment");
	const isNewVideLayout = isNewYouTubeVideoLayout();
	if (isNewVideLayout) {
		await waitForAllElements([commentsPanelSelector]);
		const commentsPanelElement = document.querySelector(commentsPanelSelector);
		if (
			commentsPanelElement &&
			(commentsPanelElement.getAttribute("visibility") as EngagementPanelVisibility) === "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"
		)
			toggleHideTranslateCommentButtonsVisibility(true);
	} else {
		await waitForAllElements([commentsHeaderSelector]);
		toggleHideTranslateCommentButtonsVisibility(true);
	}
}
export async function enableHideTranslateComment() {
	const {
		data: {
			options: { enable_hide_translate_comment }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_hide_translate_comment) return;
	const isNewVideLayout = isNewYouTubeVideoLayout();
	if (isNewVideLayout) {
		await waitForAllElements([commentsPanelSelector]);
		const commentsPanelElement = document.querySelector(commentsPanelSelector);
		if (
			commentsPanelElement &&
			(commentsPanelElement.getAttribute("visibility") as EngagementPanelVisibility) === "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"
		)
			toggleHideTranslateCommentButtonsVisibility(false);
		const observer = observeCommentsPanelVisibilityChange();
		if (observer) setHideTranslateCommentObserver("commentsPanel", observer);
	} else {
		await waitForAllElements([commentsHeaderSelector]);
		toggleHideTranslateCommentButtonsVisibility(false);
		const observer = observeTranslateComment();
		if (observer) setHideTranslateCommentObserver("translateComment", observer);
	}
}
export function setHideTranslateCommentObserver(observerType: ObserverType, observer: MutationObserver) {
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	observerType === "translateComment" ? (translateCommentObserver = observer) : (commentsPanelObserver = observer);
}

export function toggleHideTranslateCommentButtonsVisibility(visible: boolean) {
	const translateCommentButtons = document.querySelectorAll(translateButtonSelector);
	translateCommentButtons.forEach((button) =>
		modifyElementClassList(!visible ? "add" : "remove", { className: "yte-hide-translate-comment", element: button })
	);
}
