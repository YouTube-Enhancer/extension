import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/globalVolume/index.metadata";
import { volume } from "@/src/utils/_tests/constants";
import { disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getCurrentVolume } from "@/src/utils/_tests/player";
import { resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
test.describe("globalVolume", () => {
	for (const pageType of testPages) {
		test(`should not set global volume when disabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await disableFeature(page, "globalVolume.enabled");
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 5000 }).not.toBe(volume);
		});
		test(`should set global volume to ${volume} when enabled on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "globalVolume.volume", volume);
			await enableFeature(page, "globalVolume.enabled");
			await expect.poll(async () => getCurrentVolume(page, pageType), { intervals: [200], timeout: 5000 }).toBe(volume);
		});
	}
});
