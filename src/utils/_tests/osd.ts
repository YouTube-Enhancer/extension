import type { Page } from "@playwright/test";

/** The canvas the on-screen display renders its text into. */
export const OSD_SELECTOR = "canvas#yte-osd";

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
): Promise<null | { left: string; painted: number; top: string }> {
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
			style: { left, top }
		} = canvas;
		return { left, painted, top };
	}, OSD_SELECTOR);
}
