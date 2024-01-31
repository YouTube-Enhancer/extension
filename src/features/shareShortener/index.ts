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
			// Add an event listener to the checkbox for attribute changes
			checkbox.addEventListener("DOMAttrModified", function (this: HTMLInputElement) {
				const shareUrlInput: HTMLInputElement | null = document.getElementById("share-url") as HTMLInputElement;
				if (shareUrlInput) {
					let cleanUrl: string = shareUrlInput.value.replace(regexp, "");
					if ((this as HTMLInputElement).checked && tsInput.textContent === "") {
						// Checkbox is checked and the timestamp input field is empty, append the timestamp to the URL
						const timestamp: string = tsInput.textContent || "";
						const timeParts: Array<number> = timestamp.split(":").map((num: string) => Number(num));
						const timeInSeconds: number = timeParts[0] * 60 + timeParts[1];
						cleanUrl += "&t=" + timeInSeconds;
					} else {
						// Checkbox is not checked or the timestamp input field is not empty, remove the timestamp from the URL
						cleanUrl = cleanUrl.replace(/&t=[^&]*/, "");
					}
					shareUrlInput.value = cleanUrl;
				}
			});

			// Add an event listener to the input field
			tsInput.addEventListener("input", function () {
				const shareUrlInput: HTMLInputElement | null = document.getElementById("share-url") as HTMLInputElement;
				if (shareUrlInput) {
					let cleanUrl: string = shareUrlInput.value.replace(regexp, "");
					shareUrlInput.value = cleanUrl;
				}
			});

			// Add an event listener for the Enter key (timestamp input)
			tsInput.addEventListener("keypress", function (event: KeyboardEvent) {
				if (event.key === "Enter") {
					setTimeout(function () {
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
