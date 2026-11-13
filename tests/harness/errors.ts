import type { BrowserContext, Page } from "@playwright/test";

/**
 * Extension stacks, whichever scheme the browser uses: chrome-extension:// on Chromium,
 * moz-extension:// on Firefox, where a chrome-only filter records nothing and an empty
 * result passes vacuously.
 */
const EXTENSION_SCHEMES = ["chrome-extension://", "moz-extension://"];

/**
 * The context fixture's always-on collector: one array for the whole test, a listener on
 * every page the context opens (including the ones tests open themselves), attached once
 * per page so a second call is a no-op.
 */
const sharedAttached = new WeakSet<Page>();

/** Fails the test when any extension error was recorded, naming the test and how to opt out. */
export function assertNoExtensionErrors(errors: string[], testTitle: string): void {
	if (errors.length === 0) return;
	const shown = errors.slice(0, 3).join("\n---\n");
	throw new Error(
		`The extension raised ${errors.length} uncaught error(s) during "${testTitle}":\n${shown}${
			errors.length > 3 ? `\n(+${errors.length - 3} more)` : ""
		}\nIf the errors are expected, opt out with test.use({ ignoreExtensionErrors: true }).`
	);
}

export function watchContextExtensionErrors(context: BrowserContext): string[] {
	const errors: string[] = [];
	const attach = (page: Page) => {
		if (sharedAttached.has(page)) return;
		sharedAttached.add(page);
		attachToPage(page, errors);
	};
	for (const page of context.pages()) attach(page);
	context.on("page", attach);
	return errors;
}

/**
 * Uncaught errors and unhandled rejections raised by the extension's own scripts on the
 * page, from the call onward. Pass `into` to share an existing array (the context
 * collector does); each call without one starts its own window, matching the mid-test
 * watchers specs have always used.
 */
export function watchExtensionErrors(page: Page, into?: string[]): string[] {
	const errors = into ?? [];
	attachToPage(page, errors);
	return errors;
}

function attachToPage(page: Page, errors: string[]): void {
	page.on("pageerror", (error) => {
		const stack = error.stack ?? "";
		if (
			EXTENSION_SCHEMES.some((scheme) => stack.includes(scheme) || error.message.includes(scheme))
		)
			errors.push(`${error.message}\n${stack}`);
	});
}
