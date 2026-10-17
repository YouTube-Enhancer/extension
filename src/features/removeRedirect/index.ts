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
		// Narrow AND deep. The jank a bare `[href]` subscription caused during sidebar
		// churn was its delivery volume — every thumbnail link matched and was processed —
		// not the descendant scan itself. Restricting to real redirect links keeps
		// deliveries at ~zero while thumbnail renderers stream in, and deep still catches
		// the links YouTube nests inside added subtrees (SPA descriptions, dynamically
		// inserted sections) that shallow matching missed outright.
		unsubscribeBus = subscribeToDomMutations(
			'a[href*="/redirect?"]',
			(elements) => {
				for (const el of elements) {
					unwrapRedirect(el);
				}
			},
			{ deep: true }
		);
		registry.on("removeRedirect", "bus", () => {
			unsubscribeBus?.();
			unsubscribeBus = null;
		});
	}
});

function processDocument(): void {
	document.querySelectorAll('a[href*="/redirect?"]').forEach((link) => {
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
