import { test as base, type BrowserContext, chromium, defineConfig, devices, firefox, type Page } from "@playwright/test";
import { createHash } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { cp, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { basename, join } from "path";
import { withExtension } from "playwright-webextext";
import { cwd } from "process";
import { gzipSync } from "zlib";

import { generateMissingFeatureTests } from "@/src/utils/_tests/generateMissingFeatureTests";

generateMissingFeatureTests();

const isCI = !!process.env.CI;
// Headless is the CI default. PLAYWRIGHT_HEADLESS=1 gives a headless run locally while, unlike CI=1, keeping the saved login profile.
const headless = isCI || !!process.env.PLAYWRIGHT_HEADLESS;
const workers = process.env.PLAYWRIGHT_WORKERS ? Number(process.env.PLAYWRIGHT_WORKERS) : 3;
const AUTH_PROFILE = join(cwd(), "playwright", ".auth-profile");
/**
 * PLAYWRIGHT_COVERAGE=1 records V8 coverage of the extension's own scripts on every test page (Chromium only) into
 * coverage/raw, one file per test attempt plus each script's source once; scripts/coverage-report.mjs turns those
 * into a report. Recording starts before the first navigation, so the start-up code counts too.
 */
const COVERAGE_DIR = process.env.PLAYWRIGHT_COVERAGE ? join(cwd(), "coverage", "raw") : null;
// Left out of every profile copy: caches are worthless in a throwaway copy, and the saved service worker registration
// is stale by definition. With it in place YouTube's service worker sat in front of every navigation and, under load,
// sometimes never issued the fetch, which showed up as document requests that were never sent for 30 s at a time.
const PROFILE_COPY_SKIP = new Set([
	"BrowserMetrics",
	"Cache",
	"Code Cache",
	"CrashpadMetrics-active.pma",
	"DawnGraphiteCache",
	"DawnWebGPUCache",
	"GPUCache",
	"GrShaderCache",
	"Service Worker",
	"ShaderCache"
]);

type CoverageEntry = Awaited<ReturnType<Page["coverage"]["stopJSCoverage"]>>[number];

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
		await cp(AUTH_PROFILE, userDataDir, { filter: (source) => !PROFILE_COPY_SKIP.has(basename(source)), recursive: true });
	}
	const context = await browserType.launchPersistentContext(userDataDir, {
		acceptDownloads: true,
		args: headless && browserName === "chromium" ? ["--headless=chrome"] : [],
		downloadsPath: join(cwd(), "playwright-downloads"),
		headless: false,
		// YouTube registers a service worker on the first load; see PROFILE_COPY_SKIP for what it did to navigations.
		serviceWorkers: "block"
	});
	await context.addInitScript(() => {
		localStorage.setItem("yt-remote-theme-name", "dark");
	});
	return { context, userDataDir };
}

async function getExtensionOrigin(context: BrowserContext): Promise<string> {
	// The background service worker (and any page the extension opened on install) carries the id, so no
	// YouTube load is needed to learn it; the load is only the fallback for a browser that offers neither.
	const isExtensionUrl = (url: string) => url.startsWith("chrome-extension://") || url.startsWith("moz-extension://");
	const known =
		context
			.pages()
			.find((p) => isExtensionUrl(p.url()))
			?.url() ??
		context
			.serviceWorkers()
			.find((w) => isExtensionUrl(w.url()))
			?.url();
	// Node's URL reports an opaque ("null") origin for extension schemes, so the origin is assembled by hand.
	const originOf = (url: string) => {
		const { host, protocol } = new URL(url);
		return `${protocol}//${host}`;
	};
	if (known) return originOf(known);
	const worker = await context.waitForEvent("serviceworker", { predicate: (w) => isExtensionUrl(w.url()), timeout: 10_000 }).catch(() => null);
	if (worker) return originOf(worker.url());

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
const bufferedCoverage = new WeakMap<Page, CoverageEntry[]>();

/**
 * V8 only reports scripts that are still alive, so a document that was navigated away from takes its counts
 * with it. The counters are read and restarted before every full page load the harness makes, and the reads are
 * kept with the page until the test ends.
 */
async function flushCoverage(page: Page): Promise<void> {
	if (!COVERAGE_DIR) return;
	const entries = await page.coverage.stopJSCoverage().catch(() => []);
	const kept = bufferedCoverage.get(page) ?? [];
	kept.push(...entries.filter((entry) => entry.url.startsWith("chrome-extension://")));
	bufferedCoverage.set(page, kept);
	await page.coverage.startJSCoverage({ resetOnNavigation: false }).catch(() => {});
}

/**
 * Pages a test opens itself (context.newPage, the second tab of the pauseBackgroundPlayers cases) are recorded like
 * the primary page. Their coverage is written when the test closes them, or with the context for the ones it leaves open.
 */
function recordExtraPages(context: BrowserContext, label: string): () => Promise<void> {
	if (!COVERAGE_DIR) return async () => {};
	const open = new Set<Page>();
	let count = 0;
	const originalNewPage = context.newPage.bind(context);
	(context as { newPage: BrowserContext["newPage"] }).newPage = async () => {
		const page = await originalNewPage();
		const pageLabel = `${label}-p${++count}`;
		await startCoverage(page);
		recordNavigations(page);
		open.add(page);
		const originalClose = page.close.bind(page);
		(page as { close: Page["close"] }).close = async (options) => {
			open.delete(page);
			await saveCoverage(page, pageLabel).catch(() => {});
			return originalClose(options);
		};
		return page;
	};
	return async () => {
		for (const page of open) {
			await page.close().catch(() => {});
		}
	};
}

function recordNavigations(page: Page): void {
	if (!COVERAGE_DIR) return;
	const navigating = page as unknown as { goto: Page["goto"]; reload: Page["reload"] };
	const originalGoto = page.goto.bind(page);
	const originalReload = page.reload.bind(page);
	navigating.goto = async (url, options) => {
		await flushCoverage(page);
		return originalGoto(url, options);
	};
	navigating.reload = async (options) => {
		await flushCoverage(page);
		return originalReload(options);
	};
}

async function saveCoverage(page: Page, label: string): Promise<void> {
	if (!COVERAGE_DIR) return;
	await flushCoverage(page);
	const own = bufferedCoverage.get(page) ?? [];
	bufferedCoverage.delete(page);
	if (own.length === 0) return;
	const sourcesDir = join(COVERAGE_DIR, "sources");
	mkdirSync(sourcesDir, { recursive: true });
	const stripped = own.map(({ functions, source, url }) => {
		const sourceHash = createHash("sha1")
			.update(source ?? "")
			.digest("hex");
		const sourcePath = join(sourcesDir, `${sourceHash}.js`);
		if (!existsSync(sourcePath)) writeFileSync(sourcePath, source ?? "");
		return { functions, sourceHash, url };
	});
	writeFileSync(join(COVERAGE_DIR, `${label}.json.gz`), gzipSync(JSON.stringify(stripped)));
}

async function startCoverage(page: Page): Promise<void> {
	if (!COVERAGE_DIR) return;
	await page.coverage.startJSCoverage({ resetOnNavigation: false }).catch(() => {});
}

export const test = base.extend<Fixtures>({
	context: async ({ browserName }, use, testInfo) => {
		const { context, userDataDir } = await createExtensionContext(browserName);
		const closeExtraPages = recordExtraPages(context, `${testInfo.testId}-${testInfo.retry}`);
		try {
			await use(context);
		} finally {
			await closeExtraPages();
			await context.close();
			await rm(userDataDir, { force: true, recursive: true });
		}
	},
	page: async ({ context }, use, testInfo) => {
		const page = await getPrimaryPage(context);
		await startCoverage(page);
		recordNavigations(page);
		await use(page);
		await saveCoverage(page, `${testInfo.testId}-${testInfo.retry}`);
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

	page: async ({ context }, use, testInfo) => {
		const origin = await getExtensionOrigin(context);

		// Check if extension already has an options page tab open (from onInstalled handler)
		const existingOptionsPage = context.pages().find((p) => {
			const url = p.url();
			return url && url.startsWith(origin) && url.includes("/src/pages/options/index.html");
		});

		if (existingOptionsPage) {
			await existingOptionsPage.waitForLoadState("domcontentloaded");
			await startCoverage(existingOptionsPage);
			recordNavigations(existingOptionsPage);
			// The page rendered before recording began; a reload under coverage puts its start-up on the record.
			if (COVERAGE_DIR) await existingOptionsPage.reload({ waitUntil: "domcontentloaded" });
			await use(existingOptionsPage);
			await saveCoverage(existingOptionsPage, `${testInfo.testId}-${testInfo.retry}`);
			return;
		}

		const page = await context.newPage();
		await startCoverage(page);
		recordNavigations(page);
		await page.goto(`${origin}/src/pages/options/index.html`, { waitUntil: "domcontentloaded" });
		await use(page);
		await saveCoverage(page, `${testInfo.testId}-${testInfo.retry}`);
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
