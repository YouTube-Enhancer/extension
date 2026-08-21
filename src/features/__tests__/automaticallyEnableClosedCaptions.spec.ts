import { test } from "playwright.config";

import { metadata } from "@/src/features/automaticallyEnableClosedCaptions/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { ensureCaptionsState, expectStableCaptionsState, getCaptionsState, isCaptionsUnavailable } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("automaticallyEnableClosedCaptions", () => {
	for (const pageType of testPages) {
		test(`enables captions on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["captions"]);
			const initial = await getCaptionsState(page);
			if (initial === null) return;
			if (await isCaptionsUnavailable(page)) return;
			await ensureCaptionsState(page, false);
			await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await expectStableCaptionsState(page, true);
		});
		test(`restores captions when feature disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			await ensureCaptionsState(page, false);
			await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await expectStableCaptionsState(page, true);
			await disableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await expectStableCaptionsState(page, false);
		});
	}
});
