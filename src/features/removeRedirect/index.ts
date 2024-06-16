import { type Nullable } from "@/src/types";
import { browserColorLog, waitForSpecificMessage } from "@/src/utils/utilities";

export default async function enableRemoveRedirect() {
	const {
		data: {
			options: { enable_redirect_remover: removeRedirectEnabled }
		}
	} = await waitForSpecificMessage("options", "request_data", "content");
	if (!removeRedirectEnabled) return;
	browserColorLog(`Enabling removeRedirect`, "FgMagenta");
	const regex = /https\:\/\/www\.youtube\.com\/redirect\?.+/gm;

	const links: NodeListOf<HTMLElement> = document.querySelectorAll(
		".yt-core-attributed-string__link, .yt-simple-endpoint.style-scope.yt-formatted-string"
	);
	links.forEach((link: HTMLElement) => {
		const href: Nullable<string> = link.getAttribute("href");
		if (!href || !href.match(regex)) return;
		const urlParams: URLSearchParams = new URLSearchParams(href);
		link.setAttribute("href", urlParams.get("q") || "");
	});

	const callback: MutationCallback = (mutationsList: MutationRecord[]) => {
		for (const mutation of mutationsList) {
			if (mutation.type !== "childList") return;
			mutation.addedNodes.forEach((node: Nullable<Node>) => {
				if (!(node instanceof Element) || !("href" in node)) return;
				const href: Nullable<string> = node.getAttribute("href");
				if (!href || !href.match(regex)) return;
				const urlParams = new URLSearchParams(href);
				node.setAttribute("href", urlParams.get("q") || "");
			});
		}
	};

	const observer: MutationObserver = new MutationObserver(callback);
	observer.observe(document.body, { attributes: false, childList: true, subtree: true });
}
