import { toggleElementVisibility } from "@/src/utils/utilities";

const artificialIntelligenceSummarySelector = "#expandable-metadata [has-video-summary]";

export function hideArtificialIntelligenceSummary() {
	toggleElementVisibility(artificialIntelligenceSummarySelector, hideElement);
}
export function observeArtificialIntelligenceSummary() {
	const observer = new MutationObserver((mutations) => {
		const containsArtificialIntelligenceSummary = mutations.some(
			(mutation) => mutation.target instanceof Element && mutation.target.matches(artificialIntelligenceSummarySelector)
		);
		if (containsArtificialIntelligenceSummary) {
			hideArtificialIntelligenceSummary();
		}
	});
	observer.observe(document.body, { childList: true, subtree: true });
	return observer;
}
export function showArtificialIntelligenceSummary() {
	toggleElementVisibility(artificialIntelligenceSummarySelector, showElement);
}
function hideElement(element: HTMLElement) {
	element.classList.add("yte-hide-playables");
}
function showElement(element: HTMLElement) {
	element.classList.remove("yte-hide-playables");
}
