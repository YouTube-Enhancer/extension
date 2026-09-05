import type { Nullable } from "@/src/types";

const regexp: RegExp = new RegExp("(\\?|&)(si|feature|pp)=[^&]*", "g");
let intervalId: Nullable<NodeJS.Timeout> = null;
let inputObserver: Nullable<MutationObserver> = null;
export function cleanSearchPage(url: string) {
	if (!url.match(/https?:\/\/(?:www\.)?youtube\.com\/results\?search\_query\=.+/gm)) return;
	const allElements = Array.from(document.querySelectorAll("*"));
	allElements.forEach((e) => {
		const href: Nullable<string> = e.getAttribute("href");
		if (href && href.match(/^\/watch\?v\=.+$/gm)) {
			e.setAttribute("href", href.replace(regexp, ""));
		}
	});
}

export function observeShareURLInput() {
	const observer = new MutationObserver(() => {
		const shareInput = document.querySelector<HTMLInputElement>("#share-url");
		if (shareInput && shareInput.value.match(regexp)) {
			shareInput.value = cleanUrl(shareInput.value);
			observer.disconnect();
			cleanAndUpdateUrl();
		}
	});

	observer.observe(document.body, { childList: true, subtree: true });
}

export function removeObserver() {
	if (inputObserver) {
		inputObserver.disconnect();
		inputObserver = null;
	}
	if (intervalId) {
		clearInterval(intervalId);
		intervalId = null;
	}
}

function cleanAndUpdateUrl() {
	if (intervalId) {
		clearInterval(intervalId);
		intervalId = null;
	}
	/**
	 * Every share dialog brings its own #share-url input, and YouTube leaves closed dialogs in the DOM, so the inputs
	 * are looked up on each tick. A cached input would keep cleaning the dialog the user already closed and leave the
	 * tracking params of every later dialog untouched.
	 */
	intervalId = setInterval(() => {
		for (const shareInput of document.querySelectorAll<HTMLInputElement>("#share-url")) {
			if (!shareInput.value.match(regexp)) continue;
			shareInput.value = cleanUrl(shareInput.value);
		}
	}, 50);
}
function cleanUrl(url: string): string {
	return url.replace(regexp, "");
}
