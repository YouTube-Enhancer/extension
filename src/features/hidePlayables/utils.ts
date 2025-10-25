import { modifyElementsClassList } from "@/src/utils/utilities";

const playablesSelector = "ytd-rich-section-renderer:has(a[href='/playables'])";
export async function hidePlayables() {
	modifyElementsClassList("add", "yte-hide-playables", document.querySelectorAll(playablesSelector));
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
	modifyElementsClassList("remove", "yte-hide-playables", document.querySelectorAll(playablesSelector));
}
