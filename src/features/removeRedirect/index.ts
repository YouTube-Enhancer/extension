import type { Nullable } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { addFeatureDisposer } from "@/src/features/_registry/featureLifecycleManager";
import { subscribe } from "@/src/utils/dom/observers/domMutationBus";
import { browserColorLog } from "@/src/utils/logging";

import { metadata } from "./index.metadata";

const REDIRECT_PREFIX = "https://www.youtube.com/redirect?";

let unsubscribeBus: Nullable<() => void> = null;

export default createFeature({
	...metadata,
	onDisable: () => {
		browserColorLog(`Disabling removeRedirect`, "FgMagenta");
		unsubscribeBus?.();
		unsubscribeBus = null;
	},
	onEnable: () => {
		browserColorLog(`Enabling removeRedirect`, "FgMagenta");
		unsubscribeBus?.();
		processDocument();
		unsubscribeBus = subscribe("[href]", (elements) => {
			for (const el of elements) {
				unwrapRedirect(el);
			}
		});
		addFeatureDisposer("removeRedirect", () => {
			unsubscribeBus?.();
			unsubscribeBus = null;
		});
	}
});

function processDocument(): void {
	document.querySelectorAll("[href]").forEach((link) => {
		unwrapRedirect(link);
	});
}

function unwrapRedirect(el: Element): void {
	const href: Nullable<string> = el.getAttribute("href");
	if (!href || !href.startsWith(REDIRECT_PREFIX)) return;
	try {
		const url = new URL(href);
		const target = url.searchParams.get("q");
		if (target) el.setAttribute("href", target);
	} catch {
		/* ignore malformed urls */
	}
}
