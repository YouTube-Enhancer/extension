import type { Nullable } from "@/src/types";

import { createFeature } from "@/src/features/_registry/createFeature";
import { registry } from "@/src/features/_registry/featureRegistry";
import { subscribeToDomMutations } from "@/src/utils/dom/observers/domMutationBus";
import { browserColorLog } from "@/src/utils/logging";

import { metadata } from "./index.metadata";

const REDIRECT_PREFIX = "https://www.youtube.com/redirect?";

let unsubscribeBus: Nullable<() => void> = null;

export default createFeature({
	...metadata,
	onDisable: () => {
		browserColorLog(`Disabling removeRedirect`, "FgMagenta");
	},
	onEnable: () => {
		browserColorLog(`Enabling removeRedirect`, "FgMagenta");
		unsubscribeBus?.();
		processDocument();
		// Shallow on purpose: the added node itself is matched against [href], with no
		// descendant scan. YouTube adds the redirect links as top-level nodes, and the
		// O(subtree) querySelectorAll that a `deep` subscription would run on every
		// added node is what made sidebar thumbnail loading jank the page.
		unsubscribeBus = subscribeToDomMutations("[href]", (elements) => {
			for (const el of elements) {
				unwrapRedirect(el);
			}
		});
		registry.on("removeRedirect", "bus", () => {
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
