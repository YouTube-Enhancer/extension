import { toggleElementVisibility } from "@/src/utils/utilities";

const playablesSelector = "ytd-rich-section-renderer:has(a[href='/playables'])";
export async function hidePlayables() {
	await toggleElementVisibility(playablesSelector, hideElement);
}
export function observePlayables() {
	const observer = new MutationObserver(async (mutations) => {
		const containsPlayables = mutations.some((mutation) => mutation.target instanceof Element && mutation.target.matches(playablesSelector));
		if (containsPlayables) {
			await hidePlayables();
		}
	});
	observer.observe(document.body, { childList: true, subtree: true });
	return observer;
}
export async function showPlayables() {
	await toggleElementVisibility(playablesSelector, showElement);
}
function hideElement(element: HTMLElement) {
	element.classList.add("yte-hide-playables");
}
function showElement(element: HTMLElement) {
	element.classList.remove("yte-hide-playables");
}
