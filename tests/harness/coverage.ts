import type { BrowserContext, Page } from "@playwright/test";

import { createHash } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { cwd } from "process";
import { gzipSync } from "zlib";

/**
 * PLAYWRIGHT_COVERAGE=1 records V8 coverage of the extension's own scripts on every test page (Chromium only) into
 * coverage/raw, one file per test attempt plus each script's source once; scripts/coverage-report.mjs turns those
 * into a report. Recording starts before the first navigation, so the start-up code counts too.
 */
export const COVERAGE_DIR = process.env.PLAYWRIGHT_COVERAGE ? join(cwd(), "coverage", "raw") : null;

type CoverageEntry = Awaited<ReturnType<Page["coverage"]["stopJSCoverage"]>>[number];

/**
 * Best-effort service worker coverage. page.coverage cannot see the worker, so a raw CDP session
 * runs the same Profiler precise-coverage protocol the page fixture uses, with Debugger.scriptParsed
 * plus getScriptSource supplying the source text monocart needs to map the bundle. Failures at any
 * step leave the report without the SW's share rather than failing a test.
 */
export function attachWorkerCoverage(context: BrowserContext, label: string): () => Promise<void> {
	if (!COVERAGE_DIR) return async () => {};
	const browser = context.browser();
	if (!browser) return async () => {};
	const scripts = new Map<string, { source: string; url: string }>();
	let bridge: null | {
		detach: () => Promise<void>;
		send: (method: string, params: object) => Promise<unknown>;
	} = null;
	void (async () => {
		try {
			const [existing] = context.serviceWorkers();
			const worker =
				existing ??
				(await context.waitForEvent("serviceworker", { timeout: 60_000 }).catch(() => null));
			if (!worker) return;
			const browserCdp = await browser.newBrowserCDPSession();
			const { targetInfos } = (await browserCdp.send("Target.getTargets")) as {
				targetInfos: { targetId: string; type: string; url: string }[];
			};
			const swTarget = targetInfos.find(
				(target) => target.type === "service_worker" && target.url.startsWith("chrome-extension://")
			);
			if (!swTarget) {
				await browserCdp.detach().catch(() => {});
				return;
			}
			// Non-flatten is the session shape Target.sendMessageToTarget addresses; flattened
			// sessions would need sessionId-routed sends Playwright's CDPSession cannot express.
			const { sessionId } = await browserCdp.send("Target.attachToTarget", {
				flatten: false,
				targetId: swTarget.targetId
			});
			let nextId = 1;
			const pending = new Map<number, (result: unknown) => void>();
			browserCdp.on("Target.receivedMessageFromTarget", (event: { message: string }) => {
				const { error, id, method, params, result } = JSON.parse(event.message) as {
					error?: unknown;
					id?: number;
					method?: string;
					params?: { scriptId: string; url: string };
					result?: unknown;
				};
				if (id !== undefined) {
					const resolve = pending.get(id);
					if (resolve) resolve(error ? undefined : result);
					pending.delete(id);
				}
				if (
					method === "Debugger.scriptParsed" &&
					params &&
					params.url.startsWith("chrome-extension://")
				) {
					const { scriptId, url } = params;
					void (async () => {
						const result = await bridge?.send("Debugger.getScriptSource", { scriptId });
						const source = (result as undefined | { scriptSource?: string })?.scriptSource;
						if (source) scripts.set(scriptId, { source, url });
					})();
				}
			});
			const send = (method: string, params: object) =>
				new Promise<unknown>((resolve) => {
					const id = nextId++;
					pending.set(id, resolve);
					void browserCdp
						.send("Target.sendMessageToTarget", {
							message: JSON.stringify({ id, method, params }),
							sessionId
						})
						.catch(() => resolve(undefined));
				});
			bridge = {
				detach: async () => {
					await browserCdp.detach().catch(() => {});
				},
				send
			};
			await send("Profiler.enable", {});
			await send("Profiler.startPreciseCoverage", { callCount: false, detailed: false });
			// Enabling the Debugger replays scriptParsed for scripts already loaded.
			await send("Debugger.enable", {});
		} catch {
			// Best effort: without the session the report simply stays SW-free.
		}
	})();
	return async () => {
		if (!bridge) return;
		try {
			const result = (await bridge.send("Profiler.takePreciseCoverage", {})) as
				| undefined
				| { result?: { functions: unknown; scriptId: string }[] };
			const entries = (result?.result ?? []).flatMap((script) => {
				const meta = scripts.get(script.scriptId);
				return meta ? [{ functions: script.functions, source: meta.source, url: meta.url }] : [];
			});
			if (entries.length > 0) writeCoverageRecord(entries, `${label}-sw`);
		} catch {
			// Teardown can race the worker stopping; losing the last flush is acceptable.
		}
		await bridge.detach();
	};
}

/**
 * Pages a test opens itself (context.newPage, the second tab of the pauseBackgroundPlayers cases) are recorded like
 * the primary page. Their coverage is written when the test closes them, or with the context for the ones it leaves open.
 */
export function recordExtraPages(context: BrowserContext, label: string): () => Promise<void> {
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

export function recordNavigations(page: Page): void {
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

export async function saveCoverage(page: Page, label: string): Promise<void> {
	if (!COVERAGE_DIR) return;
	await flushCoverage(page);
	const own = bufferedCoverage.get(page) ?? [];
	bufferedCoverage.delete(page);
	if (own.length === 0) return;
	writeCoverageRecord(own, label);
}

export async function startCoverage(page: Page): Promise<void> {
	if (!COVERAGE_DIR) return;
	await page.coverage.startJSCoverage({ resetOnNavigation: false }).catch(() => {});
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

function writeCoverageRecord(
	entries: { functions: unknown; source?: string; url: string }[],
	label: string
): void {
	if (!COVERAGE_DIR) return;
	const sourcesDir = join(COVERAGE_DIR, "sources");
	mkdirSync(sourcesDir, { recursive: true });
	const stripped = entries.map(({ functions, source, url }) => {
		const sourceHash = createHash("sha1")
			.update(source ?? "")
			.digest("hex");
		const sourcePath = join(sourcesDir, `${sourceHash}.js`);
		if (!existsSync(sourcePath)) writeFileSync(sourcePath, source ?? "");
		return { functions, sourceHash, url };
	});
	writeFileSync(join(COVERAGE_DIR, `${label}.json.gz`), gzipSync(JSON.stringify(stripped)));
}
