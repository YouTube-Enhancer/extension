import { type Nullable } from "@/src/types";
import { browserColorLog, waitForSpecificMessage } from "@/src/utils/utilities";
let observer: Nullable<MutationObserver> = null;
const regexp: RegExp = new RegExp("(\\?|&)(si|feature|pp)=[^&]*", "g");
function cleanUrl(url: string): string {
	return url.replace(regexp, "");
}
function cleanAndUpdateUrl(): void {
	setTimeout(() => {
		const input = document.querySelector<HTMLInputElement>("#share-url");
		if (input) {
			input.value = cleanUrl(input.value);
		}
	}, 0);
}
function handleKeyPress(event: KeyboardEvent) {
	if (event.key === "Enter") {
		cleanAndUpdateUrl();
	}
}
export async function enableShareShortener() {
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: { enable_share_shortener }
		}
	} = optionsData;
	if (!enable_share_shortener) return;

	function attachEventListener(): void {
		const checkbox = document.querySelector<HTMLElement>(".style-scope.tp-yt-paper-checkbox");
		const tsInput = document.querySelector<HTMLElement>(".style-scope.tp-yt-paper-input .input-element input");
		const allElements = Array.from(document.querySelectorAll("*"));
		allElements.forEach((e) => {
			const href: null | string = e.getAttribute("href");
			if (href && href.match(/^\/watch\?v\=.+$/gm)) {
				e.setAttribute("href", cleanUrl(href));
			}
		});

		if (checkbox && tsInput) {
			checkbox.removeEventListener("DOMAttrModified", cleanAndUpdateUrl);
			tsInput.removeEventListener("keypress", handleKeyPress);
			checkbox.addEventListener("DOMAttrModified", cleanAndUpdateUrl);
			tsInput.addEventListener("keypress", handleKeyPress);
		}
	}

	function monitorUrl(mutationsList: MutationRecord[]): void {
		for (const mutation of mutationsList) {
			if (mutation.target !== document.getElementById("share-url")) {
				cleanAndUpdateUrl();
			}
		}
	}

	observer = new MutationObserver(function (mutationsList: MutationRecord[]) {
		attachEventListener();
		if (observer) {
			monitorUrl(mutationsList);
		}
	});

	observer.observe(document, { childList: true, subtree: true });
}

export function disableShareShortener() {
	browserColorLog(`Disabling share shortener`, "FgMagenta");
	if (observer) {
		observer.disconnect();
		observer = null;
	}
}
