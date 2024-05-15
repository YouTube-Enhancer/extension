import { modifyElementClassList } from "@/src/utils/utilities";
export const translateButtonSelector = "ytd-tri-state-button-view-model.translate-button";

export function observeTranslateComment() {
	const observer = new MutationObserver((mutationList) => {
		mutationList.forEach((mutation) => {
			const translateButtons = Array.from(mutation.addedNodes).some(
				(addedNode) =>
					addedNode instanceof Element &&
					addedNode.matches("ytd-comment-thread-renderer") &&
					addedNode.querySelector(translateButtonSelector) !== null
			);
			if (mutation.type !== "childList" || !mutation.addedNodes.length || !translateButtons) return;
			mutation.addedNodes.forEach((addedNode) => {
				modifyElementClassList("add", {
					className: "yte-hide-translate-comment",
					element: (addedNode as Element).querySelector(translateButtonSelector)
				});
			});
		});
	});
	const commentsSection = document.querySelector("ytd-item-section-renderer.ytd-comments div#contents");
	if (!commentsSection) return null;
	observer.observe(commentsSection, { childList: true, subtree: true });
	return observer;
}
