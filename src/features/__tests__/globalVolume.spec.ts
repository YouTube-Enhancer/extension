import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/globalVolume/index.metadata";
import { metadata as rememberVolumeMetadata } from "@/src/features/rememberVolume/index.metadata";
import { pageTypeRecord, volume } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getCurrentVolume, setVolume } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const { home, watch } = pageTypeRecord;
test.describe("globalVolume", () => {
	for (const pageType of testPages) {
		test(`should not set global volume when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "globalVolume.enabled");
			await page.waitForTimeout(1000);
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 10000 }).not.toBe(volume);
		});
		test(`should set global volume to ${volume} when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "globalVolume.volume", volume);
			await enableFeature(page, "globalVolume.enabled");
			await page.waitForTimeout(1000);
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 10000 }).toBe(volume);
		});
		test(`should persist volume after navigation on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "globalVolume.volume", volume);
			await enableFeature(page, "globalVolume.enabled");
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 10000 }).toBe(volume);
			await navigateToPageType(page, home);
			await navigateToPageType(page, pageType);
			await disableFeature(page, "globalVolume.enabled");
			await enableFeature(page, "globalVolume.enabled");
			await expect
				.poll(() => getCurrentVolume(page, pageType), {
					intervals: [200],
					timeout: 5000
				})
				.toBe(volume);
		});
		test(`re-applies volume after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "globalVolume.volume", volume);
			await enableFeature(page, "globalVolume.enabled");
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 10000 }).toBe(volume);
			await disableFeature(page, "globalVolume.enabled");
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 10000 }).not.toBe(volume);
			await enableFeature(page, "globalVolume.enabled");
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 10000 }).toBe(volume);
		});
		test(`persists volume after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "globalVolume.volume", volume);
			await enableFeature(page, "globalVolume.enabled");
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 10000 }).toBe(volume);
			await page.reload();
			await navigateToPageType(page, pageType);
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 15000 }).toBe(volume);
		});
		test(`restores volume when disabled after being enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "globalVolume.volume", volume);
			await enableFeature(page, "globalVolume.enabled");
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 10000 }).toBe(volume);
			await disableFeature(page, "globalVolume.enabled");
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 10000 }).not.toBe(volume);
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

		test.describe("globalVolume vs rememberVolume", () => {
			test("disabledWhen metadata cross-references are configured correctly", () => {
				const globalVolDisabledWhen = getCheckboxDisabledWhen(metadata.settings);
				expect(globalVolDisabledWhen).toBeDefined();
				expect(globalVolDisabledWhen![0]).toMatchObject({
					equals: true,
					feature: "rememberVolume",
					setting: "rememberVolume.enabled"
				});

				const rememberVolDisabledWhen = getCheckboxDisabledWhen(rememberVolumeMetadata.settings);
				expect(rememberVolDisabledWhen).toBeDefined();
				expect(rememberVolDisabledWhen![0]).toMatchObject({
					equals: true,
					feature: "globalVolume",
					setting: "globalVolume.enabled"
				});
			});

			test("last-enabled volume feature determines volume on watch", async ({ page }) => {
				await navigateToPageType(page, watch);
				await enableFeature(page, "rememberVolume.enabled");
				await setVolume(page, 50, watch);
				await expect.poll(() => getCurrentVolume(page, watch), { intervals: [200], timeout: 10000 }).toBe(50);

				await setOption(page, "globalVolume.volume", volume);
				await enableFeature(page, "globalVolume.enabled");
				await expect.poll(() => getCurrentVolume(page, watch), { intervals: [200], timeout: 10000 }).toBe(volume);
			});
		});
	});
});
