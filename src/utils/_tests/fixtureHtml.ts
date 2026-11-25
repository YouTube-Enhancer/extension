import type { Page } from "@playwright/test";

declare global {
	/**
	 * Appends `html` to an element's children — the Trusted Types-safe stand-in for
	 * `el.insertAdjacentHTML("beforeend", html)`.
	 *
	 * Page-side global, installed next to {@link setFixtureHTML} by {@link installFixtureHTML}.
	 */
	function appendFixtureHTML(el: Element, html: string): void;
	/**
	 * Replaces an element's children with `html` — the Trusted Types-safe stand-in for `el.innerHTML = html`
	 * inside `page.evaluate` callbacks.
	 *
	 * Page-side global: {@link installFixtureHTML} installs it, because Playwright stringifies the callbacks
	 * it sends to the page, where a module-scope binding does not exist.
	 */
	function setFixtureHTML(el: Element, html: string): void;
}
/**
 * Installs {@link setFixtureHTML} and {@link appendFixtureHTML} as page globals.
 *
 * `page.evaluate` serializes a callback's source and runs it in the page, where this module's scope does
 * not exist; a `var` global is how the helpers become reachable from those callbacks. Globals do not
 * survive navigation, so call this after each navigation and before the first fixture injection of that
 * document (idempotent within one document).
 */
export async function installFixtureHTML(page: Page): Promise<void> {
	await page.evaluate(
		`var setFixtureHTML = ${setFixtureHTML.toString()}; var appendFixtureHTML = ${appendFixtureHTML.toString()};`
	);
}
/**
 * Page-side implementation of {@link appendFixtureHTML}.
 *
 * Both writers replace an element's children, so the markup is first written into a detached element and
 * the parsed nodes are then moved in: the sanctioned write stays the only write, and append semantics
 * (`insertAdjacentHTML("beforeend", ...)`) are preserved for elements that already have children. The call
 * to `setFixtureHTML` resolves to the installed global — {@link installFixtureHTML} always installs both.
 */
function appendFixtureHTML(el: Element, html: string): void {
	const parsed = document.createElement("div");
	setFixtureHTML(parsed, html);
	el.append(...parsed.childNodes);
}
/**
 * Writes test-fixture markup without touching a raw Trusted Types sink.
 *
 * YouTube's documents require `TrustedHTML` for `innerHTML` / `insertAdjacentHTML` assignments, so fixture
 * injection has to go through a sanctioned path instead of a raw string sink. Two are tried, in order:
 * the Chromium Sanitizer API (`Element.setHTML`, not Trusted Types gated), then — when it is absent — a
 * test-only pass-through policy. The policy is a *named* test policy, never a pass-through default policy,
 * so the page's own policy restrictions keep their say, and a rejection propagates instead of being
 * swallowed.
 *
 * Page-side: {@link installFixtureHTML} stringifies these functions into the page, so their bodies must not
 * reference anything outside themselves (each other excepted — both are always installed together).
 */
function setFixtureHTML(el: Element, html: string): void {
	const target = el as Element & {
		setHTML?: (input: string, options?: { sanitizer?: unknown }) => void;
	};
	const { Sanitizer: sanitizer } = globalThis as {
		Sanitizer?: new (config?: Record<string, unknown>) => unknown;
	};
	if (typeof target.setHTML === "function" && typeof sanitizer === "function") {
		// The explicit empty config matters: the implicit default sanitizer strips ids, classes and
		// unknown (`ytd-*`) elements, which is exactly what test fixtures are made of.
		target.setHTML(html, { sanitizer: new sanitizer({}) });
		return;
	}
	// Created once per document and reused by every later write (see the shared cache key). The factory is
	// typed structurally because it is the Trusted Types global, which this DOM lib does not declare.
	const scope = globalThis as {
		__yteTestFixturesPolicy?: { createHTML: (input: string) => string };
		trustedTypes?: {
			createPolicy: (
				name: string,
				policy: { createHTML: (input: string) => string }
			) => { createHTML: (input: string) => string };
		};
	};
	let { __yteTestFixturesPolicy: policy } = scope;
	if (!policy) {
		if (!scope.trustedTypes)
			throw new Error("setFixtureHTML: neither the Sanitizer API nor Trusted Types is available");
		policy = scope.trustedTypes.createPolicy("yte-test-fixtures", {
			createHTML: (input) => input
		});
		scope.__yteTestFixturesPolicy = policy;
	}
	el.innerHTML = policy.createHTML(html);
}
