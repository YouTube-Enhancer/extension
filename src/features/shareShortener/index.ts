import { browserColorLog, waitForSpecificMessage } from "@/src/utils/utilities";

let observer: MutationObserver | null = null;
export async function enableShareShortener() {
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: { enable_share_shortener }
		}
	} = optionsData;
	if (!enable_share_shortener) return;

	const regexp: RegExp = new RegExp("(\\?|&)(si|feature|pp)=[^&]*", "g");

	function attachEventListener(): void {
		const checkbox = document.querySelector<HTMLElement>(".style-scope.tp-yt-paper-checkbox");
		const tsInput = document.querySelector<HTMLElement>(".style-scope.tp-yt-paper-input .input-element input");
		const allElements = Array.from(document.querySelectorAll("*"));
		allElements.forEach((e) => {
			const href: null | string = e.getAttribute("href");
			if (href && href.match(/^\/watch\?v\=.+$/gm)) {
				e.setAttribute("href", href.replace(regexp, ""));
			}
		});

		if (checkbox && tsInput) {
			checkbox.addEventListener("DOMAttrModified", function (this: HTMLInputElement) {
				const shareUrlInput = document.querySelector<HTMLInputElement>("#share-url");
				if (shareUrlInput) {
					setTimeout(() => {
						shareUrlInput.value = shareUrlInput.value.replace(regexp, "");
					}, 0);
				}
			});

			tsInput.addEventListener("keypress", function (event: KeyboardEvent) {
				if (event.key === "Enter") {
					setTimeout(() => {
						const shareUrlInput = document.querySelector<HTMLInputElement>("#share-url");
						if (shareUrlInput) {
							const cleanUrl: string = shareUrlInput.value.replace(regexp, "");
							shareUrlInput.value = cleanUrl;
						}
					}, 0);
				}
			});
		}
	}

	function monitorUrl(mutationsList: MutationRecord[]): void {
		for (const mutation of mutationsList) {
			if (mutation.target !== document.getElementById("share-url")) {
				const shareUrlInput = document.querySelector<HTMLInputElement>("#share-url");
				if (shareUrlInput) {
					const cleanUrl: string = shareUrlInput.value.replace(regexp, "");
					shareUrlInput.value = cleanUrl;
				}
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
