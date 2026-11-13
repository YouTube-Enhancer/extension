import type { Page } from "@playwright/test";

import type { PageType } from "@/src/features/_registry/types";

import { hasAuthState } from "@/src/utils/_tests/auth";
import { disableFeature, enableFeature, loadDefaultConfig } from "@/src/utils/_tests/features";
import {
	navigateToLiveOrSkip,
	navigateToPageType,
	reloadPage
} from "@/src/utils/_tests/navigation";
import { loginRequiredPages } from "@/src/utils/_tests/utils";
import { expect, test } from "@/tests/harness";

/**
 * The suite-wide lifecycle battery: one implementation of "an enabled feature survives reload, SPA
 * navigation, and a disable/re-enable cycle" (issue #1479) instead of one copy per spec. Specs keep
 * their own test wrappers, titles and iteration, and collapse each body to a call here; what only a
 * spec knows - its enable sequence, its observable, its navigation choice - comes in as arguments,
 * while the sequence, the waits and the reload idiom live in this one module, so a timing fix lands
 * once instead of forty-six times.
 *
 * Tests are declared in the calling spec on purpose: Playwright attributes a test() to the file it
 * is called from, and a generator function here would file every battery test under this module,
 * breaking single-spec runs (`playwright test path/to/spec.ts`).
 */
export type LifecycleSubject = {
	/** Its observable while it should be off (defaults, after disable, non-target). */
	assertOff?: (page: Page) => Promise<void>;
	/** The feature's observable while it should be on. */
	assertOn?: (page: Page) => Promise<void>;
	/** Turns it off; defaults to disabling `${featureId}.enabled`. */
	disable?: (page: Page) => Promise<void>;
	/** Turns the feature on; defaults to enabling `${featureId}.enabled`. */
	enable?: (page: Page) => Promise<void>;
	/** Per-test setup after the initial navigation: option values, timeouts, prerequisites. */
	setup?: (page: Page, pageType: PageType) => Promise<void>;
};

/** The initial navigation a lifecycle test makes: the live page hunts a stream (or skips), everything else loads its fixture. */
export async function enterPage(page: Page, pageType: PageType): Promise<void> {
	if (pageType === "live") {
		await navigateToLiveOrSkip(page);
		return;
	}
	await navigateToPageType(page, pageType);
}

/**
 * The one reload idiom: a raw reload then a full re-settle through navigateToPageType (which
 * self-heals a redirect back onto the fixture), except on live, where renavigating would hunt a
 * different stream and discard the reloaded document - reloadPage keeps the same stream.
 */
export async function reloadAndSettle(page: Page, pageType: PageType): Promise<void> {
	if (pageType === "live") {
		await reloadPage(page, pageType);
		return;
	}
	await page.reload();
	await navigateToPageType(page, pageType);
}

/** Loads the page and checks the feature's off-state observable. */
export async function verifyDefaults(
	page: Page,
	pageType: PageType,
	subject: LifecycleSubject
): Promise<void> {
	await enterPage(page, pageType);
	await subject.setup?.(page, pageType);
	if (subject.assertOff) await subject.assertOff(page);
}

/** Loads the page at defaults and lets the observation window run; the harness asserts no extension errors. */
export async function verifyLoadsAtDefaults(page: Page, pageType: PageType): Promise<void> {
	test.skip(!hasAuthState() && loginRequiredPages.includes(pageType), `${pageType} requires login`);
	await enterPage(page, pageType);
	await page.waitForTimeout(2000);
}

/** Enable, observe, SPA-navigate through the spec's chosen helper, observe again. */
export async function verifyNavigationPersistence(
	page: Page,
	pageType: PageType,
	featureId: string,
	subject: LifecycleSubject,
	navigate: (page: Page, pageType: PageType) => Promise<void>
): Promise<void> {
	const { enable } = subjectFor(subject, featureId);
	await enterPage(page, pageType);
	await subject.setup?.(page, pageType);
	await enable(page);
	await expectOn(subject, page);
	await navigate(page, pageType);
	await expectOn(subject, page);
}

/** Enable on a page the feature does not target; it must stay quiet (and the harness asserts no errors). */
export async function verifyNonTargetSilence(
	page: Page,
	nonTargetPage: PageType,
	featureId: string,
	subject: LifecycleSubject = {}
): Promise<void> {
	const { enable } = subjectFor(subject, featureId);
	await navigateToPageType(page, nonTargetPage);
	await subject.setup?.(page, nonTargetPage);
	await enable(page);
	if (subject.assertOff) await subject.assertOff(page);
	else await page.waitForTimeout(2000);
}

/** Enable, observe, disable, observe off, re-enable, observe on again. */
export async function verifyReEnableCycle(
	page: Page,
	pageType: PageType,
	featureId: string,
	subject: LifecycleSubject
): Promise<void> {
	const { disable, enable } = subjectFor(subject, featureId);
	await enterPage(page, pageType);
	await subject.setup?.(page, pageType);
	await enable(page);
	await expectOn(subject, page);
	await disable(page);
	if (subject.assertOff) await subject.assertOff(page);
	await enable(page);
	await expectOn(subject, page);
}

/** Enable, observe, full reload, observe again. */
export async function verifyReloadPersistence(
	page: Page,
	pageType: PageType,
	featureId: string,
	subject: LifecycleSubject
): Promise<void> {
	const { enable } = subjectFor(subject, featureId);
	await enterPage(page, pageType);
	await subject.setup?.(page, pageType);
	await enable(page);
	await expectOn(subject, page);
	await reloadAndSettle(page, pageType);
	await expectOn(subject, page);
}

/** The shipped defaults disable the feature. */
export async function verifyShippedDefaults(featureId: string): Promise<void> {
	expect(await loadDefaultConfig()).toMatchObject({ [featureId]: { enabled: false } });
}

function enabledKey(featureId: string): Parameters<typeof enableFeature>[1] {
	return `${featureId}.enabled` as Parameters<typeof enableFeature>[1];
}

async function expectOn(subject: LifecycleSubject, page: Page): Promise<void> {
	if (subject.assertOn) await subject.assertOn(page);
}

function subjectFor(
	subject: LifecycleSubject,
	featureId: string
): LifecycleSubject & Required<Pick<LifecycleSubject, "disable" | "enable">> {
	return {
		...subject,
		disable: subject.disable ?? ((page) => disableFeature(page, enabledKey(featureId))),
		enable: subject.enable ?? ((page) => enableFeature(page, enabledKey(featureId)))
	};
}
