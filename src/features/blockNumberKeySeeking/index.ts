import { waitForSpecificMessage } from "@/src/utils/utilities";

const keydownHandler = (event: KeyboardEvent): void => {
	const target = event.target as HTMLElement | null;
	// Ignore typing in inputs / textareas / contenteditable
	if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
	// Top-row numbers 0–9
	if (/^[0-9]$/.test(event.key)) {
		event.stopImmediatePropagation();
		event.preventDefault();
	}
};

export async function disableBlockNumberKeySkip() {
	document.removeEventListener("keydown", keydownHandler, { capture: true });
}

export async function enableBlockNumberKeySkip() {
	const {
		data: {
			options: { enable_block_number_key_seeking: disableNumberKeySkip }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!disableNumberKeySkip) return;
	document.addEventListener("keydown", keydownHandler, { capture: true });
}
