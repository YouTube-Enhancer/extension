import { createFeature } from "@/src/features/_registry/createFeature";

import { metadata } from "./index.metadata";

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
export default createFeature({
	...metadata,
	dependencies: { includePages: ["watch", "live"] },
	onDisable: () => document.removeEventListener("keydown", keydownHandler, { capture: true }),
	onEnable: () => document.addEventListener("keydown", keydownHandler, { capture: true })
});
