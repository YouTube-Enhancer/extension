import { waitForSpecificMessage } from "@/src/utils/utilities";

export default async function removeRedirect() {
	const optionsData = await waitForSpecificMessage("options", "request_data", "content");
	const {
		data: {
			options: { enable_redirect_remover: removeRedirectEnabled }
		}
	} = optionsData;
	if (!removeRedirectEnabled) return;
	const regex = /https\:\/\/www\.youtube\.com\/redirect\?.+/gm;
	
	const links: NodeListOf<HTMLElement> = document.querySelectorAll('.yt-core-attributed-string__link');
	links.forEach((link: HTMLElement) => {
	const href: string | null = link.getAttribute('href');
	if(href && href.match(regex)) {
			const urlParams: URLSearchParams = new URLSearchParams(href);
			link.setAttribute('href', urlParams.get('q') || '');
	}
	});

	const callback: MutationCallback = (mutationsList: MutationRecord[]) => {
		for (let mutation of mutationsList) {
			if (mutation.type === "childList") {
				mutation.addedNodes.forEach((node: Node | null) => {
					if (node instanceof Element && node.hasAttribute("href")) {
						const href: string | null = node.getAttribute("href");
						if (href !== null && href.match(regex)) {
							const urlParams: URLSearchParams = new URLSearchParams(href);
							node.setAttribute("href", urlParams.get("q") || "");
						}
					}
				});
			}
		}
	};

	const observer: MutationObserver = new MutationObserver(callback);
	observer.observe(document.body, { attributes: false, childList: true, subtree: true });
}
