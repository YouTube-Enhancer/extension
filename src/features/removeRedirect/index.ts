import { cleanupRegistry } from "@/src/features/_registry/cleanupRegistry";
import { createFeature } from "@/src/features/_registry/createFeature";
import { type Nullable } from "@/src/types";
import { browserColorLog } from "@/src/utils/logging";

import { metadata } from "./index.metadata";

const REDIRECT_PREFIX = "https://www.youtube.com/redirect?";

let redirectObserver: Nullable<MutationObserver> = null;

export default createFeature({
	...metadata,
	onDisable: () => {
		browserColorLog(`Disabling removeRedirect`, "FgMagenta");
		disconnectObserver();
	},
	onEnable: () => {
		browserColorLog(`Enabling removeRedirect`, "FgMagenta");
		// Never leave a previous observer running: it would keep unwrapping links a later disable cannot stop.
		disconnectObserver();
		processDocument();
		redirectObserver = new MutationObserver((mutations: MutationRecord[]) => {
			for (const mutation of mutations) {
				if (mutation.type !== "childList") continue;
				mutation.addedNodes.forEach((node: Nullable<Node>) => {
					if (node) processNode(node);
				});
			}
		});
		redirectObserver.observe(document.body, {
			childList: true,
			subtree: true
		});
		cleanupRegistry.add("removeRedirect", disconnectObserver);
	}
});

function disconnectObserver(): void {
	if (!redirectObserver) return;
	redirectObserver.disconnect();
	redirectObserver = null;
}
function processDocument(): void {
	document.querySelectorAll("[href]").forEach((link) => {
		unwrapRedirect(link);
	});
}
function processNode(node: Node): void {
	if (!(node instanceof Element)) return;
	if (node.hasAttribute("href")) unwrapRedirect(node);
	node.querySelectorAll<HTMLElement>("[href]").forEach((link: HTMLElement) => unwrapRedirect(link));
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
