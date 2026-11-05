import type { Page } from "@playwright/test";

/** The canvas the on-screen display renders its text into. */
export const OSD_SELECTOR = "canvas#yte-osd";

/** Returns the last text captured from the OSD canvas, or null when none was captured. */
export async function getLastOSDText(page: Page): Promise<null | string> {
	return page.evaluate(() => {
		const win = window as unknown as { __capturedOSDTexts?: string[] };
		return win.__capturedOSDTexts && win.__capturedOSDTexts.length > 0
			? win.__capturedOSDTexts[win.__capturedOSDTexts.length - 1]
			: null;
	});
}

/**
 * True when the OSD canvas has at least one non-transparent pixel, i.e. the value is
 * actually painted. Returns null when the canvas or its 2d context is missing.
 */
export async function hasPaintedPixels(page: Page) {
	return page.evaluate((selector) => {
		const canvas = document.querySelector<HTMLCanvasElement>(selector);
		if (!canvas) return null;
		const context = canvas.getContext("2d");
		if (!context) return null;
		const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
		for (let index = 3; index < data.length; index += 4) {
			if (data[index] !== 0) return true;
		}
		return false;
	}, OSD_SELECTOR);
}

/** Position and painted-pixel count of the OSD canvas, or null when it is not attached. */
export async function readOnScreenDisplayState(
	page: Page
): Promise<null | { left: string; painted: number; right: string; top: string }> {
	return page.evaluate((selector) => {
		const canvas = document.querySelector<HTMLCanvasElement>(selector);
		if (!canvas) return null;
		const context = canvas.getContext("2d");
		if (!context) return null;
		const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
		let painted = 0;
		for (let index = 3; index < data.length; index += 4) {
			if (data[index] > 0) painted++;
		}
		const {
			style: { left, right, top }
		} = canvas;
		return { left, painted, right, top };
	}, OSD_SELECTOR);
}

/**
 * Captures every string drawn onto the on-screen display canvas until the page is reloaded.
 */
export async function setupOSDTextCapture(page: Page): Promise<void> {
	await page.evaluate((selector) => {
		const win = window as unknown as {
			__capturedOSDTexts: string[];
			__originalFillText?: (
				this: CanvasRenderingContext2D,
				text: string,
				...args: [number, number]
			) => void;
		};
		win.__capturedOSDTexts = [];

		// If already wrapped, do nothing more.
		if (win.__originalFillText) {
			return;
		}

		const { prototype } = CanvasRenderingContext2D;
		// oxlint-disable-next-line typescript/unbound-method
		win.__originalFillText = prototype.fillText;
		prototype.fillText = function (
			this: CanvasRenderingContext2D,
			text: string,
			...args: [number, number]
		) {
			if (this.canvas?.matches(selector)) {
				win.__capturedOSDTexts.push(String(text));
			}
			return win.__originalFillText?.apply(this, [text, ...args]);
		};
	}, OSD_SELECTOR);
}
