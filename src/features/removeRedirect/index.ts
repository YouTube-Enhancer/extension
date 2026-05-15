import { createFeature } from "@/src/features/_registry/createFeature";
import { type Nullable } from "@/src/types";
import { browserColorLog } from "@/src/utils/logging";

import { metadata } from "./index.metadata";

export default createFeature({
	...metadata,
	onDisable: () => void 0,
	onEnable: () => {
		browserColorLog(`Enabling removeRedirect`, "FgMagenta");
		const REDIRECT_PREFIX = "https://www.youtube.com/redirect?";
		const unwrapRedirect = (el: Element): void => {
			const href: Nullable<string> = el.getAttribute("href");
			if (!href || !href.startsWith(REDIRECT_PREFIX)) return;
			try {
				const url = new URL(href);
				const target = url.searchParams.get("q");
				if (target) el.setAttribute("href", target);
			} catch {
				/* ignore malformed urls */
			}
		};
		const processNode = (node: Node): void => {
			if (!(node instanceof Element)) return;
			if (node.hasAttribute("href")) unwrapRedirect(node);
			node.querySelectorAll<HTMLElement>("[href]").forEach((link: HTMLElement) => unwrapRedirect(link));
		};
		const initialLinks: NodeListOf<HTMLElement> = document.querySelectorAll(
			".yt-core-attributed-string__link, .yt-simple-endpoint.style-scope.yt-formatted-string"
		);
		initialLinks.forEach((link: HTMLElement) => unwrapRedirect(link));
		const observer = new MutationObserver((mutations: MutationRecord[]) => {
			for (const mutation of mutations) {
				if (mutation.type !== "childList") continue;
				mutation.addedNodes.forEach((node: Nullable<Node>) => {
					if (node) processNode(node);
				});
			}
		});
		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}
});
