import { toggleElementVisibility } from "@/src/utils/utilities";

const artificialIntelligenceSummarySelector = "#expandable-metadata [has-video-summary]";

export async function hideArtificialIntelligenceSummary() {
	await toggleElementVisibility(artificialIntelligenceSummarySelector, hideElement);
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
	await toggleElementVisibility(artificialIntelligenceSummarySelector, showElement);
}
function hideElement(element: HTMLElement) {
	element.classList.add("yte-hide-playables");
}
function showElement(element: HTMLElement) {
	element.classList.remove("yte-hide-playables");
}
