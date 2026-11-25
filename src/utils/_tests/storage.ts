import type { Page } from "@playwright/test";

import type { configuration } from "@/src/types";

import { MESSAGE_ORIGIN } from "@/src/utils/messaging";

/** Reads the extension's stored configuration through the window.postMessage bridge (the "options" request). */
export async function readStoredOptions(page: Page): Promise<configuration> {
	return page.evaluate((origin) => {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error("Timed out waiting for options response"));
			}, 5_000);
			const handler = (event: MessageEvent) => {
				if (event.source !== window) return;
				const msg = event.data as {
					action?: string;
					data?: { options?: unknown };
					origin?: string;
					type?: string;
				};
				if (msg?.origin !== origin) return;
				if (msg.type === "options" && msg.action === "data_response") {
					clearTimeout(timeout);
					window.removeEventListener("message", handler);
					resolve(msg.data?.options as configuration);
				}
			};
			window.addEventListener("message", handler);
			window.postMessage(
				{
					action: "request_data",
					data: undefined,
					origin,
					sequence: 0,
					source: "content",
					type: "options"
				},
				"*"
			);
		});
	}, MESSAGE_ORIGIN);
}

/** Reads the extension's stored feature state through the window.postMessage bridge (the "state" request). */
export async function readStoredState(page: Page): Promise<Record<string, unknown>> {
	return page.evaluate((origin) => {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error("Timed out waiting for state response"));
			}, 5_000);

			const handler = (event: MessageEvent) => {
				if (event.source !== window) return;
				const msg = event.data as {
					action?: string;
					data?: Record<string, unknown>;
					origin?: string;
					type?: string;
				};
				if (msg?.origin !== origin) return;
				if (msg.type === "state" && msg.action === "data_response") {
					clearTimeout(timeout);
					window.removeEventListener("message", handler);
					resolve(msg.data ?? {});
				}
			};

			window.addEventListener("message", handler);

			window.postMessage(
				{
					action: "request_data",
					data: undefined,
					origin,
					sequence: 0,
					source: "content",
					type: "state"
				},
				"*"
			);
		});
	}, MESSAGE_ORIGIN);
}
