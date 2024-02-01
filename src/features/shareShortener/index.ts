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

	const regexp: RegExp = new RegExp("(\\?|&)(si|feature)=[^&]*", "g");

	function attachEventListener(): void {
		const checkbox: HTMLElement | null = document.querySelector(".style-scope.tp-yt-paper-checkbox");
		const tsInput: HTMLElement | null = document.querySelector(".style-scope.tp-yt-paper-input .input-element input");

		if (checkbox && tsInput) {
			checkbox.addEventListener("DOMAttrModified", function (this: HTMLInputElement) {
				const shareUrlInput: HTMLInputElement | null = document.getElementById("share-url") as HTMLInputElement;
				if (shareUrlInput) {
					setTimeout(() => {
						shareUrlInput.value = shareUrlInput.value.replace(regexp, "");;
					}, 0);
				}
			});

			tsInput.addEventListener("keypress", function (event: KeyboardEvent) {
				if (event.key === "Enter") {
					setTimeout(() => {
						const shareUrlInput: HTMLInputElement | null = document.getElementById("share-url") as HTMLInputElement;
						if (shareUrlInput) {
							let cleanUrl: string = shareUrlInput.value.replace(regexp, "");
							shareUrlInput.value = cleanUrl;
						}
					}, 0);
				}
			});
		}
	}

	function monitorUrl(mutationsList: MutationRecord[], observer: MutationObserver): void {
		for (let mutation of mutationsList) {
			if (mutation.target !== document.getElementById("share-url")) {
				const shareUrlInput: HTMLInputElement | null = document.getElementById("share-url") as HTMLInputElement;
				if (shareUrlInput) {
					let cleanUrl: string = shareUrlInput.value.replace(regexp, "");
					shareUrlInput.value = cleanUrl;
				}
			}
		}
	}

	observer = new MutationObserver(function (mutationsList: MutationRecord[]) {
		attachEventListener();
		if (observer) {
			monitorUrl(mutationsList, observer);
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
