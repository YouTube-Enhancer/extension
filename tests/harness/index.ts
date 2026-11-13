import type { BrowserContext, Page } from "@playwright/test";

import { test as base } from "@playwright/test";
import { rm } from "fs/promises";

import { createExtensionContext, getExtensionOrigin, getPrimaryPage } from "./context";
import {
	attachWorkerCoverage,
	COVERAGE_DIR,
	recordExtraPages,
	recordNavigations,
	saveCoverage,
	startCoverage
} from "./coverage";
import { assertNoExtensionErrors, watchContextExtensionErrors } from "./errors";

export { watchExtensionErrors } from "./errors";

type ContextOptions = {
	ignoreExtensionErrors: boolean;
	label: string;
	titlePath: string;
	trackExtraPages: boolean;
};

type Fixtures = {
	context: BrowserContext;
	page: Page;
};

type OptionsFixtures = Fixtures & {
	extensionId: string;
};

/**
 * The shared half of both context fixtures: launch the extension context, hand it to the test,
 * then tear down open pages, coverage, the context, and its temp profile in one order. The caller
 * decides whether pages the test opens itself get recorded: the page fixture tracks them here,
 * while the options fixture records its options page inline in its own page fixture. Every test
 * also gets an always-on extension-error collector whose teardown assertion fails the test
 * unless it declares test.use({ ignoreExtensionErrors: true }).
 */
async function useExtensionContext(
	browserName: string,
	options: ContextOptions,
	use: (context: BrowserContext) => Promise<void>
): Promise<void> {
	const { context, userDataDir } = await createExtensionContext(browserName);
	const closeExtraPages = options.trackExtraPages
		? recordExtraPages(context, options.label)
		: async () => {};
	const flushWorker = attachWorkerCoverage(context, options.label);
	const extensionErrors = watchContextExtensionErrors(context);
	try {
		await use(context);
	} finally {
		await closeExtraPages();
		await flushWorker();
		await context.close();
		await rm(userDataDir, { force: true, recursive: true });
		if (!options.ignoreExtensionErrors) assertNoExtensionErrors(extensionErrors, options.titlePath);
	}
}

export const test = base.extend<Fixtures, { ignoreExtensionErrors: boolean }>({
	context: async ({ browserName, ignoreExtensionErrors }, use, testInfo) => {
		await useExtensionContext(
			browserName,
			{
				ignoreExtensionErrors,
				label: `${testInfo.testId}-${testInfo.retry}`,
				titlePath: testInfo.titlePath.join(" > "),
				trackExtraPages: true
			},
			use
		);
	},
	ignoreExtensionErrors: [false, { option: true, scope: "worker" }],
	page: async ({ context }, use, testInfo) => {
		const page = await getPrimaryPage(context);
		await startCoverage(page);
		recordNavigations(page);
		await use(page);
		await saveCoverage(page, `${testInfo.testId}-${testInfo.retry}`);
	}
});

export const optionsTest = base.extend<OptionsFixtures, { ignoreExtensionErrors: boolean }>({
	context: async ({ browserName, ignoreExtensionErrors }, use, testInfo) => {
		await useExtensionContext(
			browserName,
			{
				ignoreExtensionErrors,
				label: `${testInfo.testId}-${testInfo.retry}`,
				titlePath: testInfo.titlePath.join(" > "),
				trackExtraPages: false
			},
			use
		);
	},
	ignoreExtensionErrors: [false, { option: true, scope: "worker" }],

	page: async ({ context }, use, testInfo) => {
		const origin = await getExtensionOrigin(context);

		// Check if extension already has a options page tab open (from onInstalled handler)
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
