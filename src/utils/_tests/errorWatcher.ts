import type { Page } from "@playwright/test";

/**
 * Registry for the background error watchers pageSetup arms: one entry per page, holding whether the
 * watcher is still running and how many times it has reloaded the page. It lives apart from pageSetup
 * so the harness can stop watchers at teardown without importing the module that imports the harness.
 */
export type ErrorWatcher = {
	reloads: number;
	stopped: boolean;
};

const errorWatchers = new WeakMap<Page, ErrorWatcher>();

/**
 * Arms a fresh watcher for the page, or returns null when one is already running: pageSetup runs on
 * every navigation and must start exactly one background loop per page.
 */
export function armErrorWatcher(page: Page): ErrorWatcher | null {
	const existing = errorWatchers.get(page);
	if (existing && !existing.stopped) return null;
	const watcher: ErrorWatcher = { reloads: 0, stopped: false };
	errorWatchers.set(page, watcher);
	return watcher;
}

/** How many times the harness's error watcher reloaded this page (0 when it never had to). */
export function harnessReloadCount(page: Page): number {
	return errorWatchers.get(page)?.reloads ?? 0;
}

/** Stops a page's background error watcher. Idempotent; the harness page teardown calls it. */
export function stopErrorWatcher(page: Page): void {
	const watcher = errorWatchers.get(page);
	if (watcher) watcher.stopped = true;
}
