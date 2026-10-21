import type { BrowserContext, Page } from "@playwright/test";

import { expect, optionsTest as test } from "playwright.config";

import { localeText } from "@/src/utils/_tests/locale";
import { setCheckbox } from "@/src/utils/_tests/options";

// The popup is the shared Settings surface under its own entry bundle: these cases exist to put
// that bundle on the coverage record and to prove the popup entry boots the surface on its own,
// not only through the options tab.

/** The popup entry lives on the extension origin; the fixture page may still be on about:blank. */
async function extensionOrigin(context: BrowserContext): Promise<string> {
	// chrome-extension is a non-special scheme, so URL.origin is the useless string "null";
	// the origin is the scheme-plus-host prefix instead.
	const originOf = (url: string) => url.split("/").slice(0, 3).join("/");
	const fromPage = context
		.pages()
		.find((candidate) => candidate.url().startsWith("chrome-extension://"));
	if (fromPage) return originOf(fromPage.url());
	const worker =
		context.serviceWorkers()[0] ??
		(await context.waitForEvent("serviceworker", { timeout: 15000 }).catch(() => null));
	if (worker) return originOf(worker.url());
	throw new Error("no extension page or service worker available to resolve the extension origin");
}

async function readFeatureEnabled(page: Page, feature: string) {
	return page.evaluate(async (featureId) => {
		const stored = await chrome.storage.local.get<Record<string, { enabled?: boolean }>>(featureId);
		return stored[featureId]?.enabled;
	}, feature);
}

test.describe("popup page", () => {
	test("the popup entry renders the settings surface", async ({ context, page }) => {
		const origin = await extensionOrigin(context);
		const pageErrors: string[] = [];
		page.on("pageerror", (error) => pageErrors.push(String(error)));
		await page.goto(`${origin}/src/pages/popup/index.html`);
		await expect(page).toHaveURL(/\/src\/pages\/popup\/index\.html/);
		const scrollWheelLabel = localeText("settings.sections.scrollWheelVolumeControl.enable.label");
		await expect(page.getByLabel(scrollWheelLabel, { exact: true })).toBeAttached({
			timeout: 30000
		});
		await expect.poll(() => pageErrors, { timeout: 2000 }).toEqual([]);
	});
	test("a toggle in the popup writes through to storage", async ({ context, page }) => {
		const origin = await extensionOrigin(context);
		await page.goto(`${origin}/src/pages/popup/index.html`);
		const scrollWheelLabel = localeText("settings.sections.scrollWheelVolumeControl.enable.label");
		await expect(page.getByLabel(scrollWheelLabel, { exact: true })).not.toBeChecked();
		await setCheckbox(page, scrollWheelLabel, true);
		await expect
			.poll(() => readFeatureEnabled(page, "scrollWheelVolumeControl"), {
				timeout: 10000
			})
			.toBe(true);
	});
});
