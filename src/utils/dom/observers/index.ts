import { getCommentsPanelSelector } from "@/src/utils/dom/selectors";
export const engagementPanelVisibility = ["ENGAGEMENT_PANEL_VISIBILITY_HIDDEN", "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"] as const;
export type EngagementPanelVisibility = (typeof engagementPanelVisibility)[number];
// Legacy unused code not sure if it can be removed :(
export function observeCommentsPanelVisibilityChange(cb: { [K in EngagementPanelVisibility]: () => void }): MutationObserver {
	const observer = new MutationObserver((mutationList) => {
		mutationList.forEach((mutation) => {
			if (mutation.attributeName === "visibility") {
				const target = mutation.target as HTMLElement;
				if (!target) return;
				const visibility = target.getAttribute("visibility");
				if (!visibility) return;
				if (!engagementPanelVisibility.includes(visibility)) return;
				const castVisibility = visibility as EngagementPanelVisibility;
				cb[castVisibility]();
			}
		});
	});
	const commentsPanel = document.querySelector(getCommentsPanelSelector()) as Element;
	observer.observe(commentsPanel, { attributeFilter: ["visibility"] });
	return observer;
}
