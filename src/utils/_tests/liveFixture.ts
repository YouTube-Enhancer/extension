import type { Page } from "@playwright/test";

/**
 * Node-side marker for pages whose last navigateToPageType call was the live fixture. The stream hunt spends
 * most of a test's budget before any feature code can run, so placement-only budgets scale up on these pages
 * (see attachBudget in assertions). It lives on the Node side because the hunted page is re-navigated (and its
 * JS context replaced) throughout the hunt, so page state cannot hold it.
 */
const liveFixturePages = new WeakSet<Page>();
export function isLiveFixturePage(page: Page): boolean {
	return liveFixturePages.has(page);
}
export function markLiveFixturePage(page: Page): void {
	liveFixturePages.add(page);
}
export function unmarkLiveFixturePage(page: Page): void {
	liveFixturePages.delete(page);
}
