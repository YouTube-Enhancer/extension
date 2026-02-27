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

export function disableBlockNumberKeySkip() {
	document.removeEventListener("keydown", keydownHandler, { capture: true });
}

export async function enableBlockNumberKeySkip() {
	const {
		data: {
			options: {
				blockNumberKeySeeking: { enabled }
			}
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!enabled) return;
	document.addEventListener("keydown", keydownHandler, { capture: true });
}
