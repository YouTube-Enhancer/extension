import { modifyElementsClassList } from "@/src/utils/utilities";

const artificialIntelligenceSummarySelector = "#expandable-metadata [has-video-summary]";

export async function hideArtificialIntelligenceSummary() {
	modifyElementsClassList("add", "yte-hide-ai-summary", document.querySelectorAll(artificialIntelligenceSummarySelector));
}
export async function observeArtificialIntelligenceSummary() {
	const observer = new MutationObserver(async (mutations) => {
		const containsArtificialIntelligenceSummary = mutations.some(
			(mutation) => mutation.target instanceof Element && mutation.target.matches(artificialIntelligenceSummarySelector)
		);
		if (containsArtificialIntelligenceSummary) {
			await hideArtificialIntelligenceSummary();
		}
	});
	observer.observe(document.body, { childList: true, subtree: true });
	return observer;
}
export async function showArtificialIntelligenceSummary() {
	modifyElementsClassList("remove", "yte-hide-ai-summary", document.querySelectorAll(artificialIntelligenceSummarySelector));
}
