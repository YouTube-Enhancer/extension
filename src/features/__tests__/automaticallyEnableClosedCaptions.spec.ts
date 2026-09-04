import type { Page } from "@playwright/test";

import { expect, optionsTest, test } from "playwright.config";

import { metadata as disableCCMetadata } from "@/src/features/automaticallyDisableClosedCaptions/index.metadata";
import { metadata } from "@/src/features/automaticallyEnableClosedCaptions/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { navigateToCaptionedPage, spaNavigateToCaptionedVideo } from "@/src/utils/_tests/captions";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { reloadPage } from "@/src/utils/_tests/navigation";
import { setCheckbox } from "@/src/utils/_tests/options";
import {
	ensureCaptionsState,
	expectStableCaptionsState,
	getCaptionsState,
	isCaptionsUnavailable,
	waitForCaptionsAvailable
} from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { watch } = pageTypeRecord;
// The rendered options labels the conflict test drives; they come from the same locale entries the metadata points at.
const autoDisableLabel = "Automatically disable closed captions";
const autoEnableLabel = "Automatically enable closed captions";
// The feature waits up to 30 s for the video to offer captions before it clicks, which a live stream can take
// after an ad; the wait here has to outlast that.
const enableTimeout = 35000;

/** Waits for the feature to turn captions on. A video that withdraws its caption track mid-test is skipped, not failed. */
async function expectCaptionsEnabled(page: Page) {
	const enabled = await expectStableCaptionsState(page, true, { timeout: enableTimeout })
		.then(() => true)
		.catch(() => false);
	if (enabled) return;
	test.skip(await isCaptionsUnavailable(page), "the video withdrew its captions while the test ran");
	await expectStableCaptionsState(page, true, { timeout: 1000 });
}

/** Skips when the video offers no captions or they cannot be turned off first; without that start the feature has nothing to do. */
async function skipUnlessCaptionsCanStartOff(page: Page) {
	test.skip(!(await waitForCaptionsAvailable(page)), "this video offers no captions");
	test.skip((await getCaptionsState(page)) === null, "the captions button reports no state");
	test.skip(!(await ensureCaptionsState(page, false)), "captions could not be turned off before the feature acts");
}

test.describe("automaticallyEnableClosedCaptions", () => {
	for (const pageType of testPages) {
		test(`enables captions on ${pageType}`, async ({ page }) => {
			await navigateToCaptionedPage(page, pageType);
			await skipUnlessCaptionsCanStartOff(page);
			await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await expectCaptionsEnabled(page);
		});
		test(`enables captions after navigation on ${pageType}`, async ({ page }) => {
			await navigateToCaptionedPage(page, pageType);
			await skipUnlessCaptionsCanStartOff(page);
			await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await expectCaptionsEnabled(page);
			// Turn captions off again so the assertion after the navigation can only pass because onNavigate acted.
			test.skip(!(await ensureCaptionsState(page, false)), "captions could not be turned off again before the navigation");
			// onNavigate only runs on a real single-page navigation: on watch click through to a related video, on
			// live navigateToPageType itself clicks a stream from the channel page.
			if (pageType === watch) await spaNavigateToCaptionedVideo(page);
			else await navigateToCaptionedPage(page, pageType);
			await expectCaptionsEnabled(page);
		});
	}

	// The cases below run on watch only: onEnable/onDisable have no live-vs-VOD branch (index.ts only touches div#movie_player and button.ytp-subtitles-button) and the live fixture costs up to 120 s.
	test(`restores captions when feature disabled on ${watch}`, async ({ page }) => {
		await navigateToCaptionedPage(page, watch);
		test.skip((await getCaptionsState(page)) === null, "the captions button reports no state");
		test.skip(!(await ensureCaptionsState(page, false)), "captions could not be turned off");
		await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
		await expectCaptionsEnabled(page);
		await disableFeature(page, "automaticallyEnableClosedCaptions.enabled");
		await expectStableCaptionsState(page, false);
		await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
		await expectCaptionsEnabled(page);
	});
	// On live the post-reload navigateToPageType goes back to the channel URL and opens a possibly different live video, discarding the reloaded page.
	test(`persists after full page reload on ${watch}`, async ({ page }) => {
		await navigateToCaptionedPage(page, watch);
		test.skip(!(await ensureCaptionsState(page, false)), "captions could not be turned off");
		await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
		await expectCaptionsEnabled(page);
		// Click captions back off (this leaves the feature's captionsWhereEnabled untouched) so YouTube restores them
		// off after the reload and the assertion below depends on the feature acting again.
		test.skip(!(await ensureCaptionsState(page, false)), "captions could not be turned off");
		await reloadPage(page, watch);
		test.skip(!(await waitForCaptionsAvailable(page)), "this video offers no captions");
		await expectCaptionsEnabled(page);
	});
	// With the feature off no lifecycle hook runs on any page, so the live expansion adds nothing to this negative control.
	test(`should not enable captions when feature is off on ${watch}`, async ({ page }) => {
		await navigateToCaptionedPage(page, watch);
		test.skip(!(await ensureCaptionsState(page, false)), "captions could not be turned off");
		// The feature is disabled by default, so calling disableFeature would write an unchanged value and no hook
		// would run at all. Reload with it off instead, so the enable-all pass on load is what is being observed.
		await reloadPage(page, watch);
		test.skip(!(await waitForCaptionsAvailable(page)), "this video offers no captions");
		await expectStableCaptionsState(page, false);
	});

	test.describe("feature conflicts", () => {
		type DisabledWhenCondition = { equals: boolean; feature: string; setting: string };

		function getCheckboxDisabledWhen(settings: readonly Record<string, unknown>[]): readonly DisabledWhenCondition[] | undefined {
			for (const node of settings) {
				if (node.component === "checkbox") return node.disabledWhen as readonly DisabledWhenCondition[] | undefined;
				if (node.type === "group" && Array.isArray(node.children)) {
					const result = getCheckboxDisabledWhen(node.children as readonly Record<string, unknown>[]);
					if (result) return result;
				}
			}
			return undefined;
		}

		test.describe("CC auto-enable vs auto-disable", () => {
			test("disabledWhen metadata cross-references are configured correctly", () => {
				const enableCCDisabledWhen = getCheckboxDisabledWhen(metadata.settings);
				expect(enableCCDisabledWhen).toBeDefined();
				expect(enableCCDisabledWhen![0]).toMatchObject({
					equals: true,
					feature: "automaticallyDisableClosedCaptions",
					setting: "automaticallyDisableClosedCaptions.enabled"
				});

				const disableCCDisabledWhen = getCheckboxDisabledWhen(disableCCMetadata.settings);
				expect(disableCCDisabledWhen).toBeDefined();
				expect(disableCCDisabledWhen![0]).toMatchObject({
					equals: true,
					feature: "automaticallyEnableClosedCaptions",
					setting: "automaticallyEnableClosedCaptions.enabled"
				});
			});

			test("last-enabled feature determines captions state when both enabled on watch", async ({ page }) => {
				await navigateToCaptionedPage(page, watch);
				const initial = await getCaptionsState(page);
				if (initial === null) return;

				await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
				await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
				await expectCaptionsEnabled(page);
			});

			// Captions come back because automaticallyDisableClosedCaptions.onDisable re-clicks the subtitles button, not
			// because auto-enable acts, so the title names the restore path that is actually exercised.
			test("auto-disable restores captions when it is turned off on watch", async ({ page }) => {
				await navigateToCaptionedPage(page, watch);
				const initial = await getCaptionsState(page);
				if (initial === null) return;

				await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
				await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
				await expectStableCaptionsState(page, false);

				await disableFeature(page, "automaticallyDisableClosedCaptions.enabled");
				await expectCaptionsEnabled(page);
			});
		});
	});

	test(`keeps captions on when they were already enabled before the feature is enabled on ${watch}`, async ({ page }) => {
		await navigateToCaptionedPage(page, watch);
		test.skip(!(await ensureCaptionsState(page, true)), "captions could not be turned on");
		await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
		// onEnable records captions as already on and returns without clicking, so a stray click would show up as
		// captions turning off during the settle window.
		await expectToStay(async () => getCaptionsState(page), true, { durationMs: 4000, intervalMs: 500, page });
		await disableFeature(page, "automaticallyEnableClosedCaptions.enabled");
		// captionsWhereEnabled is true, so onDisable must not unload the captions module the user had switched on.
		await expectToStay(async () => getCaptionsState(page), true, { durationMs: 4000, intervalMs: 500, page });
	});
	test(`keeps captions enabled after an in-page navigation to another video on ${watch}`, async ({ page }) => {
		await navigateToCaptionedPage(page, watch);
		test.skip(!(await ensureCaptionsState(page, false)), "captions could not be turned off");
		await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
		await expectCaptionsEnabled(page);
		// Captions are left on: YouTube carries that choice into the next video, so onNavigate has to keep them on
		// rather than click the button again.
		await spaNavigateToCaptionedVideo(page);
		await expectCaptionsEnabled(page);
	});
});
optionsTest.describe("automaticallyEnableClosedCaptions options", () => {
	optionsTest("auto-enable checkbox is disabled and shows the conflict reason when auto-disable is enabled", async ({ page }) => {
		const autoEnableCheckbox = page.getByLabel(autoEnableLabel, { exact: true });
		await expect(autoEnableCheckbox).toBeEnabled({ timeout: 15000 });
		const conflictReason = page.locator(`label:text-is("${autoEnableLabel}") + span`);
		await expect(conflictReason).toHaveCount(0);
		await setCheckbox(page, autoDisableLabel, true);
		await expect(autoEnableCheckbox).toBeDisabled();
		await expect(conflictReason).toHaveText(/cannot be enabled while/i);
		await setCheckbox(page, autoDisableLabel, false);
		await expect(autoEnableCheckbox).toBeEnabled();
		await expect(conflictReason).toHaveCount(0);
	});
});
