import type { Page } from "@playwright/test";

import type { Nullable } from "@/src/types";

/**
 * Injects a new DOM element matching one of the given selectors to simulate
 * content being added dynamically (e.g. by YouTube's frontend) after the
 * feature has already been enabled.
 *
 * Clones the first existing element matching a selector and re-appends it,
 * so the injected element is guaranteed to match the feature's CSS selector.
 * Iframes, video and audio elements are removed from the clone so that
 * re-inserting it cannot reconnect live streams, media or other stateful
 * embeds (which would otherwise cause YouTube to re-render and, e.g. for
 * live chat, reset the page type). Image sources are stripped to avoid
 * triggering network loads.
 *
 * Callers should assert the feature still applies afterwards, e.g. via
 * `expectElementsHidden` over the same selectors.
 *
 * @returns The selector that was injected, or `null` when no existing element matched.
 */
export async function injectDynamicContent(page: Page, selectors: readonly string[]): Promise<Nullable<string>> {
	return page.evaluate(
		({ selectors }) => {
			for (const selector of selectors) {
				const existing = document.querySelector<HTMLElement>(selector);
				if (!existing?.parentElement) continue;
				const clone = existing.cloneNode(true) as HTMLElement;
				clone.querySelectorAll("iframe, video, audio").forEach((el) => el.remove());
				clone.querySelectorAll("img, source").forEach((el) => {
					el.removeAttribute("src");
					el.removeAttribute("srcset");
				});
				existing.parentElement.appendChild(clone);
				return selector;
			}
			return null;
		},
		{ selectors }
	);
}
