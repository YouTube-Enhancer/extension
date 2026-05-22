// TODO: update tests to test all button placements
import { test as base, type BrowserContext, chromium, defineConfig, devices, firefox, type Page } from "@playwright/test";
import { join } from "path";
import { withExtension } from "playwright-webextext";
import { cwd } from "process";

import { generateMissingFeatureTests } from "@/src/utils/_tests/generateMissingFeatureTests";

generateMissingFeatureTests();

export const test = base.extend<{
	context: BrowserContext;
	page: Page;
}>({
	context: async ({ browserName }, use) => {
		const pathToExtension = join(
			cwd(),
			`dist/${
				browserName === "chromium" ? "Chrome"
				: browserName === "firefox" ? "Firefox"
				: "Chrome"
			}`
		);
		const baseBrowser = browserName === "firefox" ? firefox : chromium;
		const browserType = withExtension(baseBrowser, pathToExtension);
		const context = await browserType.launchPersistentContext("", {
			acceptDownloads: true,
			downloadsPath: join(cwd(), "playwright-downloads"),
			headless: false
		});
		await use(context);
		await context.close();
	},
	page: async ({ context }, use) => {
		let [page] = context.pages();
		if (!page) page = await context.newPage();
		for (const p of context.pages()) {
			if (p !== page) await p.close().catch(() => {});
		}
		await use(page);
	}
});
export const optionsTest = base.extend<{
	context: BrowserContext;
	extensionId: string;
	page: Page;
}>({
	context: async ({ browserName }, use) => {
		const pathToExtension = join(
			cwd(),
			`dist/${
				browserName === "chromium" ? "Chrome"
				: browserName === "firefox" ? "Firefox"
				: "Chrome"
			}`
		);
		const baseBrowser = browserName === "firefox" ? firefox : chromium;
		const browserType = withExtension(baseBrowser, pathToExtension);
		const context = await browserType.launchPersistentContext("", {
			acceptDownloads: true,
			downloadsPath: join(cwd(), "playwright-downloads"),
			headless: false
		});
		await use(context);
		await context.close();
	},
	extensionId: async ({ browserName, context }, use) => {
		switch (browserName) {
			case "chromium": {
				let [background] = context.serviceWorkers();
				if (!background) background = await context.waitForEvent("serviceworker");
				const [, , extensionId] = background.url().split("/");
				await use(extensionId);
				break;
			}
			case "firefox": {
				const extensionId = "{c49b13b1-5dee-4345-925e-0c793377e3fa}";
				await use(extensionId);
				break;
			}
			case "webkit":
				return;
		}
	},
	page: async ({ browserName, context, extensionId }, use) => {
		const extensionProtocol = browserName === "firefox" ? "moz-extension" : "chrome-extension";
		const page = await context.newPage();
		await page.goto(`${extensionProtocol}://${extensionId}/src/pages/options/index.html`);
		await page.waitForLoadState();
		await use(page);
	}
});
export const { describe, expect } = test;

export default defineConfig({
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Run tests in files in parallel */
	fullyParallel: true,
	globalTimeout: process.env.CI ? 60 * 1000 * 30 : undefined,
	/* Configure projects for major browsers */
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				permissions: ["clipboard-read", "clipboard-write"]
			}
		},
		{
			name: "firefox",
			use: {
				...devices["Desktop Firefox"]
			}
		}
	],
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: process.env.CI ? "dot" : [["html", { host: "0.0.0.0", open: "on-failure", port: 9323 }]],
	retries: process.env.CI ? 2 : 1,
	testDir: ".",
	timeout: process.env.CI ? 30 * 1000 : 60 * 1000 * 1,
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		screenshot: {
			fullPage: true,
			mode: "only-on-failure",
			omitBackground: true
		},
		trace: {
			attachments: true,
			mode: "retain-on-failure",
			screenshots: true,
			snapshots: true
		},
		video: {
			mode: "retain-on-failure",
			size: {
				height: 720,
				width: 1280
			}
		},
		viewport: {
			height: 720,
			width: 1280
		}
	},
	/* Opt out of parallel tests on CI. */
	workers: process.env.CI ? 1 : 3
});
