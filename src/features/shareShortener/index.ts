import type { Nullable } from "@/src/types";
import { browserColorLog, waitForSpecificMessage } from "@/src/utils/utilities";
const regexp: RegExp = new RegExp("(\\?|&)(si|feature|pp)=[^&]*", "g");
let intervalId: Nullable<NodeJS.Timeout> = null;
let input: Nullable<HTMLInputElement>;
let inputObserver: Nullable<MutationObserver> = null;
export function disableShareShortener() {
	browserColorLog(`Disabling share shortener`, "FgMagenta");
	if (inputObserver) {
		inputObserver.disconnect();
		inputObserver = null;
	}
	if (intervalId) {
		clearInterval(intervalId);
		intervalId = null;
	}
}

export async function enableShareShortener() {
	const {
		data: {
			options: { enable_share_shortener }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enable_share_shortener) return;
	cleanSearchPage(window.location.href);
	observeShareURLInput();
}

function cleanAndUpdateUrl() {
	if (intervalId) {
		clearInterval(intervalId);
		intervalId = null;
		input = null;
	}
	intervalId = setInterval(() => {
		if (!input) {
			input = document.querySelector<HTMLInputElement>("#share-url");
		}
		if (input) {
			if (!input.value.match(regexp)) return;
			input.value = cleanUrl(input.value);
		}
	}, 50);
}

function cleanSearchPage(url: string) {
	if (!url.match(/https?:\/\/(?:www\.)?youtube\.com\/results\?search\_query\=.+/gm)) return;
	const allElements = Array.from(document.querySelectorAll("*"));
	allElements.forEach((e) => {
		const href: null | string = e.getAttribute("href");
		if (href && href.match(/^\/watch\?v\=.+$/gm)) {
			e.setAttribute("href", href.replace(regexp, ""));
		}
	});
}

function cleanUrl(url: string): string {
	return url.replace(regexp, "");
}

function observeShareURLInput() {
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
