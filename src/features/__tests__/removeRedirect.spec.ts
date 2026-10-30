import type { FrameLocator, Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";
import type { Nullable } from "@/src/types";

import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import {
	navigateToPageType,
	reloadPage,
	spaNavigateToRelatedVideo
} from "@/src/utils/_tests/navigation";

const { channel_home: channelHome, live, watch } = pageTypeRecord;

// The feature has no page-specific branch; an explicit page set avoids running every test on all 11 page types.
const testPages: PageType[] = [channelHome, watch];

const REDIRECT_TARGET = "https://example.com";
const REDIRECT_URL = `https://www.youtube.com/redirect?q=${encodeURIComponent(REDIRECT_TARGET)}`;
const INJECTED_ANCHOR_ID = "yte-test-redirect";
const LATE_ANCHOR_ID = "yte-test-redirect-late";
const NESTED_ANCHOR_ID = "yte-test-redirect-nested";
const REENABLE_ANCHOR_ID = "yte-test-redirect-re-enable";
const FRAME_ID = "yte-test-redirect-frame";
const FRAME_ANCHOR_ID = "yte-test-redirect-frame-anchor";
const CHAT_ANCHOR_ID = "yte-test-redirect-chat-anchor";
/** The live chat iframe on a live watch page; the chat links live in its document, not the top one. */
const CHAT_FRAME_SELECTOR = "ytd-live-chat-frame iframe#chatframe";

async function expectNoRedirects(page: Page): Promise<void> {
	await expect.poll(async () => (await getRedirectLinks(page)).length, { timeout: 15000 }).toBe(0);
}

async function getRedirectLinks(page: Page): Promise<string[]> {
	return await page.evaluate(() =>
		Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
			.map((link) => link.href)
			.filter((href) => href.startsWith("https://www.youtube.com/redirect?"))
	);
}

/**
 * Adds an empty same-origin frame to the top document. Its blank document is reachable from the page, which
 * is the position the live chat iframe puts the feature in: a document the embedded script never runs in,
 * where only a frame-scoped subscription can observe new links.
 */
async function injectEmptyFrame(page: Page): Promise<void> {
	await page.evaluate((frameId) => {
		const iframe = document.createElement("iframe");
		iframe.id = frameId;
		document.body.appendChild(iframe);
	}, FRAME_ID);
	// Waits for the frame's initial document to exist, so the anchor injection below lands in a real one.
	await expect(page.frameLocator(`#${FRAME_ID}`).locator("body")).toBeAttached();
}

async function injectFrameRedirectAnchor(page: Page, anchorId: string): Promise<void> {
	await page
		.frameLocator(`#${FRAME_ID}`)
		.locator("body")
		.evaluate(
			(body, { anchorId, url }) => {
				const anchor = body.ownerDocument.createElement("a");
				anchor.id = anchorId;
				anchor.setAttribute("href", url);
				anchor.textContent = "test";
				body.appendChild(anchor);
			},
			{ anchorId, url: REDIRECT_URL }
		);
	await expect(page.frameLocator(`#${FRAME_ID}`).locator(`#${anchorId}`)).toBeAttached();
}

/**
 * Appends a subtree whose root carries no href, so the anchor is only reachable through processNode's
 * querySelectorAll branch rather than its "added node is itself a link" branch.
 */
async function injectNestedRedirectAnchor(page: Page): Promise<void> {
	await page.evaluate(
		({ id, url }) => {
			const wrapper = document.createElement("div");
			const anchor = document.createElement("a");
			anchor.id = id;
			anchor.setAttribute("href", url);
			anchor.textContent = "nested test";
			wrapper.appendChild(anchor);
			document.body.appendChild(wrapper);
		},
		{ id: NESTED_ANCHOR_ID, url: REDIRECT_URL }
	);
	await expect(page.locator(`#${NESTED_ANCHOR_ID}`)).toBeAttached();
}

/**
 * No page reliably contains a redirect link, so the subject of every test is injected explicitly. The id lets the
 * assertions target that exact anchor, which distinguishes "unwrapped to its target" from "removed or blanked".
 */
async function injectRedirectAnchor(page: Page, id: string = INJECTED_ANCHOR_ID): Promise<void> {
	await page.evaluate(
		({ id, url }) => {
			const anchor = document.createElement("a");
			anchor.id = id;
			anchor.setAttribute("href", url);
			anchor.textContent = "test";
			document.body.appendChild(anchor);
		},
		{ id, url: REDIRECT_URL }
	);
	await expect(page.locator(`#${id}`)).toBeAttached();
}

/**
 * Creates the probe inside the chat document when it is missing and reads its href after a macrotask, which
 * lets the extension's mutation delivery run first. The live chat app removes foreign children of its body
 * again within a few hundred ms, so creating and reading has to happen inside one evaluate: the probe a
 * previous poll created may already be gone by the time this one runs.
 */
async function measureChatRedirectAnchor(chatFrame: FrameLocator): Promise<Nullable<string>> {
	try {
		return await chatFrame.locator("body").evaluate(
			async (body, { anchorId, url }) => {
				const { ownerDocument: chatDocument } = body;
				let anchor = chatDocument.getElementById(anchorId) as HTMLAnchorElement | null;
				if (!anchor) {
					anchor = chatDocument.createElement("a");
					anchor.id = anchorId;
					anchor.setAttribute("href", url);
					anchor.textContent = "test";
					body.appendChild(anchor);
				}
				await new Promise((resolve) => setTimeout(resolve, 0));
				return anchor.getAttribute("href");
			},
			{ anchorId: CHAT_ANCHOR_ID, url: REDIRECT_URL }
		);
	} catch {
		// The chat frame can be between documents, which detaches the body handle; the next poll retries.
		return null;
	}
}

/**
 * The live fixture crawls the fixture channel for a stream that is on air right now. When the channel is dark
 * there is nothing to assert, which has to be a visible skip instead of a failure.
 */
async function navigateToLiveOrSkip(page: Page): Promise<void> {
	try {
		await navigateToPageType(page, live);
	} catch (error) {
		test.skip(
			true,
			`no live stream is currently available on the fixture channel (${error instanceof Error ? error.message : String(error)})`
		);
	}
}

test.describe("removeRedirect", () => {
	for (const pageType of testPages) {
		test(`should remove redirect links when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await injectRedirectAnchor(page);
			await enableFeature(page, "removeRedirect.enabled");
			await expect(page.locator(`#${INJECTED_ANCHOR_ID}`)).toHaveAttribute("href", REDIRECT_TARGET);
			await expectNoRedirects(page);
		});
	}
	test("should not remove redirect links when disabled on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await disableFeature(page, "removeRedirect.enabled");
		await injectRedirectAnchor(page);
		await expectToStay(
			async () => page.locator(`#${INJECTED_ANCHOR_ID}`).getAttribute("href"),
			REDIRECT_URL,
			{ page }
		);
	});
	test("should clean dynamically added redirect links on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "removeRedirect.enabled");
		await expectNoRedirects(page);
		await injectRedirectAnchor(page);
		await expect(page.locator(`#${INJECTED_ANCHOR_ID}`)).toHaveAttribute("href", REDIRECT_TARGET);
		await expectNoRedirects(page);
	});
	test("should stop unwrapping newly added redirect links after the feature is disabled on watch", async ({
		page
	}) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "removeRedirect.enabled");
		await injectRedirectAnchor(page);
		await expect(page.locator(`#${INJECTED_ANCHOR_ID}`)).toHaveAttribute("href", REDIRECT_TARGET);
		await disableFeature(page, "removeRedirect.enabled");
		await injectRedirectAnchor(page, LATE_ANCHOR_ID);
		await expectToStay(
			async () => page.locator(`#${LATE_ANCHOR_ID}`).getAttribute("href"),
			REDIRECT_URL,
			{ page }
		);
	});
	test("redirect unwrapping re-applies after disable then re-enable on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "removeRedirect.enabled");
		await injectRedirectAnchor(page);
		await expect(page.locator(`#${INJECTED_ANCHOR_ID}`)).toHaveAttribute("href", REDIRECT_TARGET);
		await disableFeature(page, "removeRedirect.enabled");
		await injectRedirectAnchor(page, LATE_ANCHOR_ID);
		await expectToStay(
			async () => page.locator(`#${LATE_ANCHOR_ID}`).getAttribute("href"),
			REDIRECT_URL,
			{ page }
		);
		// The observer has to be armed again on the same document: an anchor added after the
		// re-enable must be unwrapped like any other, not left behind as a redirect link.
		await enableFeature(page, "removeRedirect.enabled");
		await injectRedirectAnchor(page, REENABLE_ANCHOR_ID);
		await expect(page.locator(`#${REENABLE_ANCHOR_ID}`)).toHaveAttribute("href", REDIRECT_TARGET);
		await expectNoRedirects(page);
	});
	test("should unwrap redirect links rendered after SPA navigation on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "removeRedirect.enabled");
		await expectNoRedirects(page);
		// A genuine in-page navigation: no fresh document, so the observer installed by the first onEnable has to survive it.
		await spaNavigateToRelatedVideo(page);
		await injectRedirectAnchor(page);
		await expect(page.locator(`#${INJECTED_ANCHOR_ID}`)).toHaveAttribute("href", REDIRECT_TARGET);
		await expectNoRedirects(page);
	});
	test("should unwrap redirect links nested inside a dynamically added subtree on watch", async ({
		page
	}) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "removeRedirect.enabled");
		await expectNoRedirects(page);
		await injectNestedRedirectAnchor(page);
		await expect(page.locator(`#${NESTED_ANCHOR_ID}`)).toHaveAttribute("href", REDIRECT_TARGET);
		await expectNoRedirects(page);
	});
	test("should persist redirect removal after full page reload on watch", async ({ page }) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "removeRedirect.enabled");
		await expectNoRedirects(page);
		await reloadPage(page, watch);
		await injectRedirectAnchor(page);
		await expect(page.locator(`#${INJECTED_ANCHOR_ID}`)).toHaveAttribute("href", REDIRECT_TARGET);
		await expectNoRedirects(page);
	});
	test("should unwrap redirect links inside a frame added after enable on watch", async ({
		page
	}) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "removeRedirect.enabled");
		await injectEmptyFrame(page);
		await injectFrameRedirectAnchor(page, FRAME_ANCHOR_ID);
		const frameAnchor = page.frameLocator(`#${FRAME_ID}`).locator(`#${FRAME_ANCHOR_ID}`);
		await expect(frameAnchor).toHaveAttribute("href", REDIRECT_TARGET, { timeout: 15000 });
	});
	test("should unwrap redirect links inside a frame that exists before enable on watch", async ({
		page
	}) => {
		await navigateToPageType(page, watch);
		await disableFeature(page, "removeRedirect.enabled");
		await injectEmptyFrame(page);
		await injectFrameRedirectAnchor(page, FRAME_ANCHOR_ID);
		const frameAnchor = page.frameLocator(`#${FRAME_ID}`).locator(`#${FRAME_ANCHOR_ID}`);
		// Baseline: with the feature off nothing touches the link, so the unwrap below can only be its doing.
		await expectToStay(async () => frameAnchor.getAttribute("href"), REDIRECT_URL, { page });
		await enableFeature(page, "removeRedirect.enabled");
		await expect(frameAnchor).toHaveAttribute("href", REDIRECT_TARGET, { timeout: 15000 });
	});
	test("should stop unwrapping links inside a frame after the feature is disabled on watch", async ({
		page
	}) => {
		await navigateToPageType(page, watch);
		await enableFeature(page, "removeRedirect.enabled");
		await injectEmptyFrame(page);
		await injectFrameRedirectAnchor(page, FRAME_ANCHOR_ID);
		const frameAnchor = page.frameLocator(`#${FRAME_ID}`).locator(`#${FRAME_ANCHOR_ID}`);
		await expect(frameAnchor).toHaveAttribute("href", REDIRECT_TARGET, { timeout: 15000 });
		await disableFeature(page, "removeRedirect.enabled");
		await injectFrameRedirectAnchor(page, LATE_ANCHOR_ID);
		const lateFrameAnchor = page.frameLocator(`#${FRAME_ID}`).locator(`#${LATE_ANCHOR_ID}`);
		await expectToStay(async () => lateFrameAnchor.getAttribute("href"), REDIRECT_URL, { page });
	});
	test("should unwrap redirect links inside the live chat frame on live", async ({ page }) => {
		await navigateToLiveOrSkip(page);
		await enableFeature(page, "removeRedirect.enabled");
		const chatFrame = page.frameLocator(CHAT_FRAME_SELECTOR);
		await expect
			.poll(async () => measureChatRedirectAnchor(chatFrame), { timeout: 20000 })
			.toBe(REDIRECT_TARGET);
	});
});
