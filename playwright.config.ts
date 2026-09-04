import { test as base, type BrowserContext, chromium, defineConfig, devices, firefox, type Page } from "@playwright/test";
import { existsSync } from "fs";
import { cp, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { withExtension } from "playwright-webextext";
import { cwd } from "process";

import { generateMissingFeatureTests } from "@/src/utils/_tests/generateMissingFeatureTests";

generateMissingFeatureTests();

const isCI = !!process.env.CI;
// Headless is the CI default. PLAYWRIGHT_HEADLESS=1 gives a headless run locally while, unlike CI=1, keeping the saved login profile.
const headless = isCI || !!process.env.PLAYWRIGHT_HEADLESS;
const workers = process.env.PLAYWRIGHT_WORKERS ? Number(process.env.PLAYWRIGHT_WORKERS) : 3;
const AUTH_PROFILE = join(cwd(), "playwright", ".auth-profile");

type Fixtures = {
	context: BrowserContext;
	page: Page;
};

type OptionsFixtures = Fixtures & {
	extensionId: string;
};

async function createExtensionContext(browserName: string): Promise<{ context: BrowserContext; userDataDir: string }> {
	const pathToExtension = getExtensionPath(browserName);
	const baseBrowser = browserName === "firefox" ? firefox : chromium;
	const browserType = withExtension(baseBrowser, pathToExtension);
	const userDataDir = await mkdtemp(join(tmpdir(), `pw-${browserName}-`));
	if (!isCI && existsSync(AUTH_PROFILE)) {
		await cp(AUTH_PROFILE, userDataDir, { recursive: true });
	}
	const context = await browserType.launchPersistentContext(userDataDir, {
		acceptDownloads: true,
		args: headless && browserName === "chromium" ? ["--headless=chrome"] : [],
		downloadsPath: join(cwd(), "playwright-downloads"),
		headless: false
	});
	await context.addInitScript(() => {
		localStorage.setItem("yt-remote-theme-name", "dark");
	});
	return { context, userDataDir };
}

async function getExtensionOrigin(context: BrowserContext): Promise<string> {
	const page = context.pages()[0] ?? (await context.newPage());

	await page.goto("https://www.youtube.com", { waitUntil: "domcontentloaded" });
	await page.waitForSelector('script[src*="/src/pages/embedded/index.js"]', { state: "attached", timeout: 15_000 });

	const origin = await page.evaluate(() => {
		const script = document.querySelector('script[src*="/src/pages/embedded/index.js"]');
		return new URL(script!.getAttribute("src")!).origin;
	});

	return origin;
}

function getExtensionPath(browserName: string): string {
	return join(
		cwd(),
		`dist/${
			browserName === "chromium" ? "Chrome"
			: browserName === "firefox" ? "Firefox"
			: "Chrome"
		}`
	);
}

async function getPrimaryPage(context: BrowserContext): Promise<Page> {
	let [page] = context.pages();
	if (!page) page = await context.newPage();
	await Promise.all(
		context
			.pages()
			.filter((p) => p !== page && (!p.url() || p.url() === "about:blank"))
			.map((p) => p.close().catch(() => {}))
	);
	return page;
}

export const test = base.extend<Fixtures>({
	context: async ({ browserName }, use) => {
		const { context, userDataDir } = await createExtensionContext(browserName);
		try {
			await use(context);
		} finally {
			await context.close();
			await rm(userDataDir, { force: true, recursive: true });
		}
	},
	page: async ({ context }, use) => {
		const page = await getPrimaryPage(context);
		await use(page);
	}
});
export const optionsTest = base.extend<OptionsFixtures>({
	context: async ({ browserName }, use) => {
		const { context, userDataDir } = await createExtensionContext(browserName);
		try {
			await use(context);
		} finally {
			await context.close();
			await rm(userDataDir, { force: true, recursive: true });
		}
	},

	page: async ({ context }, use) => {
		const origin = await getExtensionOrigin(context);

		// Check if extension already has an options page tab open (from onInstalled handler)
		const existingOptionsPage = context.pages().find((p) => {
			const url = p.url();
			return url && url.startsWith(origin) && url.includes("/src/pages/options/index.html");
		});

		if (existingOptionsPage) {
			await existingOptionsPage.waitForLoadState("domcontentloaded");
			await use(existingOptionsPage);
			return;
		}

		const page = await context.newPage();
		await page.goto(`${origin}/src/pages/options/index.html`, { waitUntil: "domcontentloaded" });
		await use(page);
	}
});
export const { describe, expect } = test;
export default defineConfig({
	forbidOnly: isCI,
	fullyParallel: true,
	globalTimeout: isCI ? 4_800_000 : undefined,
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
	reporter: isCI ? [["dot"], ["github"], ["html", { open: "never" }]] : [["html", { host: "0.0.0.0", open: "on-failure", port: 9323 }]],
	retries: isCI ? 2 : 1,
	testDir: ".",
	timeout: 120_000,
	use: {
		actionTimeout: 15_000,
		navigationTimeout: 30_000,
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
	workers
});
