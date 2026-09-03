import { test } from "playwright.config";

import { metadata } from "@/src/features/automaticallyDisableClosedCaptions/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { ensureCaptionsState, expectStableCaptionsState, getCaptionsState, isCaptionsUnavailable } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { home, watch } = pageTypeRecord;

test.describe("automaticallyDisableClosedCaptions", () => {
	for (const pageType of testPages) {
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			if (!(await ensureCaptionsState(page, true))) return;
			await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await expectStableCaptionsState(page, false);
			await disableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await expectStableCaptionsState(page, true);
			await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await expectStableCaptionsState(page, false);
		});
	}

	// The cases below run on watch only: the feature has no live/VOD branch (index.ts has no page checks) and the live fixture costs up to 120 s.
	test(`disables captions on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["captions"]);
		const initial = await getCaptionsState(page);
		if (initial === null) return;
		if (await isCaptionsUnavailable(page)) return;
		if (!(await ensureCaptionsState(page, false))) return;
		await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
		await expectStableCaptionsState(page, false);
	});
	test(`disables captions after navigation on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["captions"]);
		if (await isCaptionsUnavailable(page)) return;
		if (!(await ensureCaptionsState(page, false))) return;
		await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
		await expectStableCaptionsState(page, false);
		await navigateToPageType(page, home);
		await navigateToPageType(page, watch, ["captions"]);
		if (await isCaptionsUnavailable(page)) return;
		await disableFeature(page, "automaticallyDisableClosedCaptions.enabled");
		await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
		await expectStableCaptionsState(page, false);
	});
	// On live the post-reload navigateToPageType goes back to the channel URL and opens whatever live video it finds, discarding the reloaded page.
	test(`persists after full page reload on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["captions"]);
		if (await isCaptionsUnavailable(page)) return;
		if (!(await ensureCaptionsState(page, false))) return;
		await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
		await expectStableCaptionsState(page, false);
		await page.reload();
		await navigateToPageType(page, watch, ["captions"]);
		if (await isCaptionsUnavailable(page)) return;
		await expectStableCaptionsState(page, false);
	});
});
