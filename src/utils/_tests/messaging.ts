import type { Page } from "@playwright/test";

export async function sendExtensionMessage(page: Page, message: Record<string, unknown>): Promise<void> {
	await safeEvaluate(
		page,
		(msg) => {
			const provider = document.getElementById("yte-message-from-extension");
			if (!provider) throw new Error(`Must be used inside a YouTube page`);
			provider.textContent = JSON.stringify(msg);
			document.dispatchEvent(new CustomEvent("yte-message-from-extension"));
		},
		message
	);
	await page.waitForTimeout(50);
}
export async function sendYouTubeMessage(page: Page, message: Record<string, unknown>): Promise<void> {
	await safeEvaluate(
		page,
		(msg) => {
			const provider = document.getElementById("yte-message-from-youtube");
			if (!provider) throw new Error(`Must be used inside a YouTube page`);

			provider.textContent = JSON.stringify(msg);
			document.dispatchEvent(new CustomEvent("yte-message-from-youtube"));
		},
		message
	);

	await page.waitForTimeout(20);
}
async function safeEvaluate<T>(page: Page, fn: (msg: Record<string, unknown>) => T, message: Record<string, unknown>, retries = 3): Promise<T> {
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
