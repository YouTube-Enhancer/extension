import type { Nullable } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";

import { metadata } from "./index.metadata";

const keydownHandler = (event: KeyboardEvent): void => {
	const target = event.target as Nullable<HTMLElement>;
	// Ignore typing in inputs / textareas / contenteditable
	if (
		target &&
		(target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
	)
		return;
	// Top-row numbers 0–9
	if (/^[0-9]$/.test(event.key)) {
		event.stopImmediatePropagation();
		event.preventDefault();
	}
};
export default createFeature({
	...metadata,
	// Cleanup is owned by the disposer registered in onEnable: it runs after onDisable even when
	// onDisable throws, and it also runs on the light teardown path where onDisable is skipped.
	onDisable: () => {},
	onEnable: () => {
		document.addEventListener("keydown", keydownHandler, { capture: true });
		registry.on(metadata.id, "events", () =>
			document.removeEventListener("keydown", keydownHandler, { capture: true })
		);
	}
});
