import { test } from "playwright.config";

import { metadata } from "@/src/features/automaticallyDisableClosedCaptions/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { ensureCaptionsState, expectStableCaptionsState, getCaptionsState, isCaptionsUnavailable } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { home } = pageTypeRecord;

test.describe("automaticallyDisableClosedCaptions", () => {
	for (const pageType of testPages) {
		test(`disables captions on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["captions"]);
			const initial = await getCaptionsState(page);
			if (initial === null) return;
			if (await isCaptionsUnavailable(page)) return;
			if (!(await ensureCaptionsState(page, false))) return;
			await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await expectStableCaptionsState(page, false);
		});
		test(`restores captions when feature disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			if (!(await ensureCaptionsState(page, true))) return;
			await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await expectStableCaptionsState(page, false);
			await disableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await expectStableCaptionsState(page, true);
		});
		test(`disables captions after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			if (!(await ensureCaptionsState(page, false))) return;
			await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await expectStableCaptionsState(page, false);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			await disableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await expectStableCaptionsState(page, false);
		});
		test(`re-applies after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			if (!(await ensureCaptionsState(page, false))) return;
			await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await expectStableCaptionsState(page, false);
			await disableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await expectStableCaptionsState(page, true);
			await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await expectStableCaptionsState(page, false);
		});
		test(`persists after full page reload on ${pageType}`, async ({ page }) => {
			if (pageType === "live") test.setTimeout(120_000);
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			if (!(await ensureCaptionsState(page, false))) return;
			await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await expectStableCaptionsState(page, false);
			await page.reload();
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			await expectStableCaptionsState(page, false);
		});
		test(`should not disable captions when feature is off on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			if (!(await ensureCaptionsState(page, true))) return;
			await disableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await expectStableCaptionsState(page, true);
		});
	}
});
