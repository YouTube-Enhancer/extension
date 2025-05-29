const playablesSelector = "ytd-rich-section-renderer:has(a[href='/playables'])";

type ElementVisibilityAction = (element: HTMLElement) => void;
export function hidePlayables() {
	toggleElementVisibility(playablesSelector, hideElement);
}
export function observePlayables() {
	const observer = new MutationObserver((mutations) => {
		const containsPlayables = mutations.some((mutation) => mutation.target instanceof Element && mutation.target.matches(playablesSelector));
		if (containsPlayables) {
			hidePlayables();
		}
	});
	observer.observe(document.body, { childList: true, subtree: true });
	return observer;
}
export function showPlayables() {
	toggleElementVisibility(playablesSelector, showElement);
}
function hideElement(element: HTMLElement) {
	element.classList.add("yte-hide-playables");
}
function showElement(element: HTMLElement) {
	element.classList.remove("yte-hide-playables");
}
function toggleElementVisibility(selector: string, action: ElementVisibilityAction) {
	const elements = document.querySelectorAll<HTMLDivElement>(selector);
	if (elements.length === 0) return;
	elements.forEach((element) => action(element));
}
