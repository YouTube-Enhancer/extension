import {
	cleanUpHideTranslateCommentObserver,
	commentsPanelSelector,
	setHideTranslateCommentObserver,
	toggleHideTranslateCommentButtonsVisibility
} from "@/src/features/hideTranslateComment";
import { isNewYouTubeVideoLayout, modifyElementClassList } from "@/src/utils/utilities";
export const translateButtonSelector = "ytd-tri-state-button-view-model.translate-button";
export const engagementPanelVisibility = ["ENGAGEMENT_PANEL_VISIBILITY_HIDDEN", "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"] as const;
export type EngagementPanelVisibility = (typeof engagementPanelVisibility)[number];
export function observeTranslateComment(): MutationObserver {
	const observer = new MutationObserver((mutationList) => {
		mutationList
			.filter(
				(mutation) =>
					mutation.type !== "childList" ||
					!mutation.addedNodes.length ||
					Array.from(mutation.addedNodes).some(
						(addedNode) =>
							addedNode instanceof Element &&
							addedNode.matches("ytd-comment-thread-renderer") &&
							addedNode.querySelector(translateButtonSelector) !== null
					)
			)
			.forEach((mutation) => {
				mutation.addedNodes.forEach((addedNode) => {
					modifyElementClassList("add", {
						className: "yte-hide-translate-comment",
						element: (addedNode as Element).querySelector(translateButtonSelector)
					});
				});
			});
	});
	const commentsSection = document.querySelector(
		isNewYouTubeVideoLayout() ?
			"ytd-comments ytd-item-section-renderer#sections.ytd-comments div#contents"
		:	"ytd-comments.ytd-watch-flexy ytd-item-section-renderer#sections.ytd-comments div#contents"
	) as Element;
	observer.observe(commentsSection, { childList: true, subtree: true });
	return observer;
}

export function observeCommentsPanelVisibilityChange(): MutationObserver {
	const observer = new MutationObserver((mutationList) => {
		mutationList.forEach((mutation) => {
			if (mutation.attributeName === "visibility") {
				const target = mutation.target as HTMLElement;
				if (!target) return;
				const visibility = target.getAttribute("visibility");
				if (!visibility) return;
				if (!engagementPanelVisibility.includes(visibility)) return;
				const castVisibility = visibility as EngagementPanelVisibility;
				if (castVisibility === "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED") {
					toggleHideTranslateCommentButtonsVisibility(false);
					const observer = observeTranslateComment();
					if (observer) setHideTranslateCommentObserver("translateComment", observer);
				} else {
					cleanUpHideTranslateCommentObserver("translateComment");
					toggleHideTranslateCommentButtonsVisibility(false);
				}
			}
		});
	});
	const commentsPanel = document.querySelector(commentsPanelSelector) as Element;
	observer.observe(commentsPanel, { attributeFilter: ["visibility"] });
	return observer;
}
