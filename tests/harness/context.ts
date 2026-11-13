import type { BrowserContext, Page } from "@playwright/test";

import { chromium, firefox } from "@playwright/test";
import { existsSync } from "fs";
import { cp, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { basename, join } from "path";
import { withExtension } from "playwright-webextext";
import { cwd } from "process";

// PLAYWRIGHT_HEADLESS=1 runs headless locally while keeping the saved login profile.
const headless = !!process.env.PLAYWRIGHT_HEADLESS;
export const AUTH_PROFILE = join(cwd(), "playwright", ".auth-profile");
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

export async function createExtensionContext(
	browserName: string
): Promise<{ context: BrowserContext; userDataDir: string }> {
	const pathToExtension = getExtensionPath(browserName);
	const baseBrowser = browserName === "firefox" ? firefox : chromium;
	const browserType = withExtension(baseBrowser, pathToExtension);
	const userDataDir = await mkdtemp(join(tmpdir(), `pw-${browserName}-`));
	if (existsSync(AUTH_PROFILE)) {
		await cp(AUTH_PROFILE, userDataDir, {
			filter: (source) => !PROFILE_COPY_SKIP.has(basename(source)),
			recursive: true
		});
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

export async function getExtensionOrigin(context: BrowserContext): Promise<string> {
	// The background service worker (and any page the extension opened on install) carries the id, so no
	// YouTube load is needed to learn it; the load is only the fallback for a browser that offers neither.
	const isExtensionUrl = (url: string) =>
		url.startsWith("chrome-extension://") || url.startsWith("moz-extension://");
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
	const worker = await context
		.waitForEvent("serviceworker", { predicate: (w) => isExtensionUrl(w.url()), timeout: 10_000 })
		.catch(() => null);
	if (worker) return originOf(worker.url());

	const page = context.pages()[0] ?? (await context.newPage());

	await page.goto("https://www.youtube.com", { waitUntil: "domcontentloaded" });
	await page.waitForSelector('script[src*="/src/pages/embedded/index.js"]', {
		state: "attached",
		timeout: 15_000
	});

	const origin = await page.evaluate(() => {
		const script = document.querySelector('script[src*="/src/pages/embedded/index.js"]');
		return new URL(script!.getAttribute("src")!).origin;
	});

	return origin;
}

export async function getPrimaryPage(context: BrowserContext): Promise<Page> {
	let [page] = context.pages();
	if (!page) page = await context.newPage();
	// The extension's onInstalled handler opens its options page, whose React surface refetches on a
	// 75 ms interval through the service worker for the life of the context, a permanent contention
	// tax that starved the heaviest readiness gates. No spec needs this tab (the options fixture has
	// its own discovery path), so drop it; visibility is deliberately untouched here, since
	// fronting pages globally loads extra videos and breaks the visibility-sensitive specs.
	for (const other of context.pages()) {
		if (other !== page && other.url().startsWith("chrome-extension://"))
			await other.close().catch(() => {});
	}
	await Promise.all(
		context
			.pages()
			.filter((p) => p !== page && (!p.url() || p.url() === "about:blank"))
			.map((p) => p.close().catch(() => {}))
	);
	return page;
}

function getExtensionPath(browserName: string): string {
	return join(
		cwd(),
		`dist/${
			browserName === "chromium" ? "Chrome" : browserName === "firefox" ? "Firefox" : "Chrome"
		}`
	);
}
