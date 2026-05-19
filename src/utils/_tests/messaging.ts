import type { Page } from "@playwright/test";

export async function sendExtensionMessage(page: Page, message: Record<string, unknown>): Promise<void> {
	await page.evaluate((msg) => {
		const provider = document.getElementById("yte-message-from-extension");
		if (!provider) return;
		provider.textContent = JSON.stringify(msg);
		document.dispatchEvent(new CustomEvent("yte-message-from-extension"));
	}, message);
	await page.waitForTimeout(50);
}
export async function sendYouTubeMessage(page: Page, message: Record<string, unknown>): Promise<void> {
	await page.evaluate((msg) => {
		const provider = document.getElementById("yte-message-from-youtube");
		if (!provider) return;

		provider.textContent = JSON.stringify(msg);
		document.dispatchEvent(new CustomEvent("yte-message-from-youtube"));
	}, message);

	await page.waitForTimeout(50);
}
