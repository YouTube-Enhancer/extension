import { expect, test } from "playwright.config";

import { metadata as disableCCMetadata } from "@/src/features/automaticallyDisableClosedCaptions/index.metadata";
import { metadata } from "@/src/features/automaticallyEnableClosedCaptions/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { ensureCaptionsState, expectStableCaptionsState, getCaptionsState, isCaptionsUnavailable } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { watch } = pageTypeRecord;

test.describe("automaticallyEnableClosedCaptions", () => {
	for (const pageType of testPages) {
		test(`enables captions on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			const initial = await getCaptionsState(page);
			if (initial === null) return;
			if (!(await ensureCaptionsState(page, false))) return;
			await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await expectStableCaptionsState(page, true);
		});
		test(`enables captions after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			if (!(await ensureCaptionsState(page, false))) return;
			await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await expectStableCaptionsState(page, true);
			// Turn captions off again so the assertion after the navigation can only pass because onNavigate acted.
			if (!(await ensureCaptionsState(page, false))) return;
			// onNavigate only runs on a real single-page navigation: on watch click through to a related video, on
			// live navigateToPageType itself clicks a stream from the channel page.
			if (pageType === watch) await spaNavigateToRelatedVideo(page);
			else await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			await expectStableCaptionsState(page, true);
		});
	}

	// The cases below run on watch only: onEnable/onDisable have no live-vs-VOD branch (index.ts only touches div#movie_player and button.ytp-subtitles-button) and the live fixture costs up to 120 s.
	test(`restores captions when feature disabled on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["captions"]);
		if (await isCaptionsUnavailable(page)) return;
		const initial = await getCaptionsState(page);
		if (initial === null) return;
		if (!(await ensureCaptionsState(page, false))) return;
		await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
		await expectStableCaptionsState(page, true);
		await disableFeature(page, "automaticallyEnableClosedCaptions.enabled");
		await expectStableCaptionsState(page, false);
		await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
		await expectStableCaptionsState(page, true);
	});
	// On live the post-reload navigateToPageType goes back to the channel URL and opens a possibly different live video, discarding the reloaded page.
	test(`persists after full page reload on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["captions"]);
		if (await isCaptionsUnavailable(page)) return;
		if (!(await ensureCaptionsState(page, false))) return;
		await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
		await expectStableCaptionsState(page, true);
		// Click captions back off (this leaves the feature's captionsWhereEnabled untouched) so YouTube restores them
		// off after the reload and the assertion below depends on the feature acting again.
		if (!(await ensureCaptionsState(page, false))) return;
		await reloadPage(page, watch);
		if (await isCaptionsUnavailable(page)) return;
		await expectStableCaptionsState(page, true);
	});
	// With the feature off no lifecycle hook runs on any page, so the live expansion adds nothing to this negative control.
	test(`should not enable captions when feature is off on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch, ["captions"]);
		if (await isCaptionsUnavailable(page)) return;
		if (!(await ensureCaptionsState(page, false))) return;
		// The feature is disabled by default, so calling disableFeature would write an unchanged value and no hook
		// would run at all. Reload with it off instead, so the enable-all pass on load is what is being observed.
		await reloadPage(page, watch);
		if (await isCaptionsUnavailable(page)) return;
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
				await navigateToPageType(page, watch, ["captions"]);
				if (await isCaptionsUnavailable(page)) return;
				const initial = await getCaptionsState(page);
				if (initial === null) return;

				await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
				await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
				await expectStableCaptionsState(page, true);
			});

			// Captions come back because automaticallyDisableClosedCaptions.onDisable re-clicks the subtitles button, not
			// because auto-enable acts, so the title names the restore path that is actually exercised.
			test("auto-disable restores captions when it is turned off on watch", async ({ page }) => {
				await navigateToPageType(page, watch, ["captions"]);
				if (await isCaptionsUnavailable(page)) return;
				const initial = await getCaptionsState(page);
				if (initial === null) return;

				await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
				await enableFeature(page, "automaticallyDisableClosedCaptions.enabled");
				await expectStableCaptionsState(page, false);

				await disableFeature(page, "automaticallyDisableClosedCaptions.enabled");
				await expectStableCaptionsState(page, true);
			});
		});
	});
});
