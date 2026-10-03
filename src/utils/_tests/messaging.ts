import type { Page } from "@playwright/test";

import { MESSAGE_ORIGIN } from "@/src/utils/messaging";

/**
 * Sends a message from the extension side (simulating the content script response).
 * Uses window.postMessage with the project's origin protocol.
 */
export async function sendExtensionMessage(
	page: Page,
	message: Record<string, unknown>
): Promise<void> {
	await safeEvaluate(
		page,
		(msg) => {
			window.postMessage({ ...msg, source: "extension" }, "*");
		},
		{ ...message, origin: MESSAGE_ORIGIN }
	);
	await page.waitForTimeout(50);
}

/**
 * Sends a message from the YouTube/embedded-script side (simulating the page sending to the content script).
 * Uses window.postMessage with the project's origin protocol.
 */
export async function sendYouTubeMessage(
	page: Page,
	message: Record<string, unknown>
): Promise<void> {
	await safeEvaluate(
		page,
		(msg) => {
			window.postMessage({ ...msg, source: "content" }, "*");
		},
		{ ...message, origin: MESSAGE_ORIGIN }
	);

	await page.waitForTimeout(20);
}

async function safeEvaluate<T>(
	page: Page,
	fn: (msg: Record<string, unknown>) => T,
	message: Record<string, unknown>,
	retries = 3
): Promise<T> {
	for (let attempt = 0; attempt < retries; attempt++) {
		try {
			return await page.evaluate(fn, message);
		} catch (e) {
			if (attempt === retries - 1) throw e;
			await page.waitForTimeout(500);
		}
	}
	throw new Error("safeEvaluate: unexpected exit");
}
