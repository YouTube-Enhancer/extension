import { expect, test } from "playwright.config";

import { metadata as disableCCMetadata } from "@/src/features/automaticallyDisableClosedCaptions/index.metadata";
import { metadata } from "@/src/features/automaticallyEnableClosedCaptions/index.metadata";
import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { ensureCaptionsState, expectStableCaptionsState, getCaptionsState, isCaptionsUnavailable } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";

const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { home, watch } = pageTypeRecord;

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
		test(`restores captions when feature disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			const initial = await getCaptionsState(page);
			if (initial === null) return;
			if (!(await ensureCaptionsState(page, false))) return;
			await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await expectStableCaptionsState(page, true);
			await disableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await expectStableCaptionsState(page, false);
		});
		test(`enables captions after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			if (!(await ensureCaptionsState(page, false))) return;
			await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await expectStableCaptionsState(page, true);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			await disableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await expectStableCaptionsState(page, true);
		});
		test(`should enable captions on re-enable after disable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			if (!(await ensureCaptionsState(page, false))) return;
			await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await expectStableCaptionsState(page, true);
			await disableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await expectStableCaptionsState(page, true);
		});
		test(`persists after full page reload on ${pageType}`, async ({ page }) => {
			if (pageType === "live") test.setTimeout(120_000);
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			if (!(await ensureCaptionsState(page, false))) return;
			await enableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await expectStableCaptionsState(page, true);
			await page.reload();
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			await expectStableCaptionsState(page, true);
		});
		test(`should not enable captions when feature is off on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType, ["captions"]);
			if (await isCaptionsUnavailable(page)) return;
			if (!(await ensureCaptionsState(page, false))) return;
			await disableFeature(page, "automaticallyEnableClosedCaptions.enabled");
			await expectStableCaptionsState(page, false);
		});
	}
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

			test("disabling one feature allows the other to take effect on watch", async ({ page }) => {
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
