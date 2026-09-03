import { expect, optionsTest, test } from "playwright.config";

import { metadata } from "@/src/features/automaticallyDisableClosedCaptions/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { setCheckbox } from "@/src/utils/_tests/options";
import { ensureCaptionsState, expectStableCaptionsState, getCaptionsState, isCaptionsUnavailable } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { watch } = pageTypeRecord;
// The rendered options labels the conflict test drives; they come from the same locale entries the metadata points at.
const autoDisableLabel = "Automatically disable closed captions";
const autoEnableLabel = "Automatically enable closed captions";

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
	// onEnable returns early when aria-pressed is already "false" (index.ts:39-41), so this covers that branch, not an actual toggle.
	test(`does not toggle captions when they are already off on ${watch}`, async ({ page }) => {
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
		if (!(await ensureCaptionsState(page, true))) return;
		await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
		await expectStableCaptionsState(page, false);
		// Turn captions back on so the navigation has something to disable, then navigate in-page: onNavigate only
		// runs on a real SPA navigation, and navigateToPageType would be a document load that re-runs onEnable.
		if (!(await ensureCaptionsState(page, true))) return;
		await spaNavigateToRelatedVideo(page);
		if (await isCaptionsUnavailable(page)) return;
		await expectStableCaptionsState(page, false);
	});
	// On live the post-reload navigateToPageType goes back to the channel URL and opens whatever live video it finds, discarding the reloaded page.
	test(`persists after full page reload on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["captions"]);
		if (await isCaptionsUnavailable(page)) return;
		if (!(await ensureCaptionsState(page, false))) return;
		await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
		await expectStableCaptionsState(page, false);
		// Leave captions on so YouTube restores them after the reload; otherwise onEnable takes its early return and
		// the assertion below would hold even if the feature did nothing.
		if (!(await ensureCaptionsState(page, true))) return;
		await reloadPage(page, watch);
		if (await isCaptionsUnavailable(page)) return;
		await expectStableCaptionsState(page, false);
	});

	test(`does not re-enable captions on disable when they were off before enabling on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["captions"]);
		if (await isCaptionsUnavailable(page)) return;
		if (!(await ensureCaptionsState(page, false))) return;
		await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
		await expectStableCaptionsState(page, false);
		await disableFeature(page, "automaticallyDisableClosedCaptions.enabled");
		// onEnable recorded captions as already off, so onDisable has nothing to restore and must leave the subtitles
		// button alone; a single poll would sample before an unguarded click could land.
		await expectToStay(async () => getCaptionsState(page), false, { durationMs: 4000, intervalMs: 500, page });
	});
	test(`keeps captions disabled after an in-page navigation to another video on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["captions"]);
		if (await isCaptionsUnavailable(page)) return;
		if (!(await ensureCaptionsState(page, true))) return;
		await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
		await expectStableCaptionsState(page, false);
		// Captions are left off on purpose: YouTube carries that choice into the next video, so onNavigate has to keep
		// them off instead of clicking the button again.
		await spaNavigateToRelatedVideo(page);
		if (await isCaptionsUnavailable(page)) return;
		await expectStableCaptionsState(page, false);
	});
});
optionsTest.describe("automaticallyDisableClosedCaptions options", () => {
	optionsTest("conflict checkbox is disabled and shows the reason while auto-enable CC is on", async ({ page }) => {
		const autoDisableCheckbox = page.getByLabel(autoDisableLabel, { exact: true });
		await expect(autoDisableCheckbox).toBeEnabled({ timeout: 15000 });
		const conflictReason = page.locator(`label:text-is("${autoDisableLabel}") + span`);
		await expect(conflictReason).toHaveCount(0);
		await setCheckbox(page, autoEnableLabel, true);
		await expect(autoDisableCheckbox).toBeDisabled();
		await expect(conflictReason).toHaveText(/cannot be enabled while/i);
		await setCheckbox(page, autoEnableLabel, false);
		await expect(autoDisableCheckbox).toBeEnabled();
		await expect(conflictReason).toHaveCount(0);
	});
});
