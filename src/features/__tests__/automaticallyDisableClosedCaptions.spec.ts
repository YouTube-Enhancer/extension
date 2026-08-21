import { test } from "playwright.config";

import { metadata } from "@/src/features/automaticallyDisableClosedCaptions/index.metadata";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { ensureCaptionsState, expectStableCaptionsState, getCaptionsState, isCaptionsUnavailable } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);

test.describe("automaticallyDisableClosedCaptions", () => {
	for (const pageType of testPages) {
		test(`disables captions on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["captions"]);
			const initial = await getCaptionsState(page);
			if (initial === null) return;
			if (await isCaptionsUnavailable(page)) return;
			await ensureCaptionsState(page, false);
			await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await expectStableCaptionsState(page, false);
		});
		test(`restores captions when feature disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["captions"]);
			const initial = await getCaptionsState(page);
			if (initial === null) return;
			if (await isCaptionsUnavailable(page)) return;
			await ensureCaptionsState(page, false);
			await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await expectStableCaptionsState(page, false);
			await disableFeature(page, "automaticallyDisableClosedCaptions.enabled");
			await expectStableCaptionsState(page, initial);
		});
	}
});
