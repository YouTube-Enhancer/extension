import type { Page } from "@playwright/test";

import { test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { navigateToPageType, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { waitForCaptionsAvailable } from "@/src/utils/_tests/player";

/**
 * Navigates to the page type's captions fixture and skips when it offers no captions. On live the hunt walks the
 * channel's streams for one with a caption track; when none is on air that is the channel's state, not a failure.
 */
export async function navigateToCaptionedPage(page: Page, pageType: PageType): Promise<void> {
	if (pageType === "live") {
		// The hunt opens every stream on the channel before it gives up, and a test may hunt twice; each hunt adds its own
		// budget and stops within it, so a channel with many streams ends in a skip rather than a test timeout.
		test.setTimeout(test.info().timeout + 240_000);
		const reached = await navigateToPageType(page, pageType, ["captions"], { deadline: Date.now() + 200_000 })
			.then(() => true)
			.catch(() => false);
		test.skip(!reached, "no live stream with captions is on air right now");
	} else {
		await navigateToPageType(page, pageType, ["captions"]);
	}
	test.skip(!(await waitForCaptionsAvailable(page)), "this video offers no captions");
}

/** Moves in-page to a related video that offers captions. Related videos are whatever YouTube suggests, so it may take a few hops. */
export async function spaNavigateToCaptionedVideo(page: Page): Promise<void> {
	for (let hop = 0; hop < 5; hop++) {
		await spaNavigateToRelatedVideo(page);
		if (await waitForCaptionsAvailable(page, 5000)) return;
	}
	test.skip(true, "no related video within five hops offers captions");
}
