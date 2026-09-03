import { expect, test } from "playwright.config";

import type { PageType } from "@/src/features/_registry/types";

import { metadata } from "@/src/features/globalVolume/index.metadata";
import { metadata as rememberVolumeMetadata } from "@/src/features/rememberVolume/index.metadata";
import { expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, volume } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType, reloadPage, spaNavigateToRelatedVideo } from "@/src/utils/_tests/navigation";
import { getCurrentVolume, setVolume } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
// live takes exactly the same `isWatchPage() || isLivePage() -> #movie_player` branch as watch (index.ts:12), so it adds no coverage while each navigateToPageType(live) re-runs the channel scan with a 120 s budget.
const nonLiveTestPages: readonly PageType[] = [pageTypeRecord.watch, pageTypeRecord.shorts];
const { watch } = pageTypeRecord;
test.describe("globalVolume", () => {
	for (const pageType of testPages) {
		test(`should set global volume to ${volume} when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "globalVolume.volume", volume);
			await enableFeature(page, "globalVolume.enabled");
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 10000 }).toBe(volume);
		});
	}

	for (const pageType of nonLiveTestPages) {
		test(`re-applies volume after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "globalVolume.volume", volume);
			const original = await getCurrentVolume(page, pageType);
			expect(original).not.toBeNull();
			await enableFeature(page, "globalVolume.enabled");
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 10000 }).toBe(volume);
			await disableFeature(page, "globalVolume.enabled");
			// restorePlayerVolume puts back the exact volume captured before the feature ran, so assert that value
			// instead of "anything but the configured one", which also passes when getCurrentVolume returns null.
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 10000 }).toBe(original);
			await enableFeature(page, "globalVolume.enabled");
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 10000 }).toBe(volume);
		});
		// On live this would not test a reload at all: the post-reload navigateToPageType re-runs the channel scan and opens another live video.
		test(`persists volume after full page reload on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "globalVolume.volume", volume);
			await enableFeature(page, "globalVolume.enabled");
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 10000 }).toBe(volume);
			await reloadPage(page, pageType);
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 15000 }).toBe(volume);
		});
	}

	// Watch only: with enabled=false the orchestrator never calls enableFeature/navigateFeature, so getPlayerContainer and its watch/live vs shorts branch are never reached.
	test(`should not set global volume when disabled on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		// Own both sides of the comparison: the volume the feature would apply if it ran, and the one the player is on.
		await setOption(page, "globalVolume.volume", volume);
		await setVolume(page, 55, watch);
		await disableFeature(page, "globalVolume.enabled");
		await expectToStay(async () => getCurrentVolume(page, watch), 55, { page });
	});

	// Watch only: spaNavigateToRelatedVideo is the only genuine in-page navigation available, and on shorts the same
	// round trip would be another document load, which the reload test already covers.
	test(`should persist volume after navigation on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "globalVolume.volume", volume);
		await enableFeature(page, "globalVolume.enabled");
		await expect.poll(async () => getCurrentVolume(page, watch), { intervals: [200], timeout: 10000 }).toBe(volume);
		// Move the player off the configured volume so the final assertion can only pass because onNavigate re-applied it.
		await setVolume(page, 55, watch);
		await expect.poll(async () => getCurrentVolume(page, watch), { intervals: [200], timeout: 10000 }).toBe(55);
		await spaNavigateToRelatedVideo(page);
		await expect.poll(async () => getCurrentVolume(page, watch), { intervals: [200], timeout: 10000 }).toBe(volume);
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

			test("globalVolume overrides rememberVolume when enabled last on watch", async ({ page }) => {
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
