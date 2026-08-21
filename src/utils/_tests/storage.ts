import type { Page } from "@playwright/test";

export async function readStoredState(page: Page): Promise<Record<string, unknown>> {
	return page.evaluate(() => {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error("Timed out waiting for state response"));
			}, 5_000);

			const handler = () => {
				const el = document.getElementById("yte-message-from-extension");
				if (!el?.textContent) return;
				try {
					const msg = JSON.parse(el.textContent) as Record<string, unknown>;
					if (msg.type === "state" && msg.action === "data_response") {
						clearTimeout(timeout);
						document.removeEventListener("yte-message-from-extension", handler);
						resolve((msg.data as Record<string, unknown>) ?? {});
					}
				} catch {
					/* ignore */
				}
			};

			document.addEventListener("yte-message-from-extension", handler);

			const requestEl = document.getElementById("yte-message-from-youtube");
			if (!requestEl) {
				clearTimeout(timeout);
				document.removeEventListener("yte-message-from-extension", handler);
				reject(new Error("Not on a YouTube page"));
				return;
			}
			requestEl.textContent = JSON.stringify({
				action: "request_data",
				source: "content",
				type: "state"
			});
			document.dispatchEvent(new CustomEvent("yte-message-from-youtube"));
		});
	});
}
