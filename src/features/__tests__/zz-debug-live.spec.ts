import { test } from "playwright.config";

import { enableFeature } from "@/src/utils/_tests/features";
import { navigateToPageType } from "@/src/utils/_tests/navigation";

test("debug live state", async ({ page }) => {
	await navigateToPageType(page, "live");
	const isLiveBefore = await page.evaluate(async () => {
		const player = document.querySelector("#movie_player") as unknown as { getVideoData?: () => Promise<{ isLive?: boolean }> };
		return player?.getVideoData ? (await player.getVideoData())?.isLive : "no-getVideoData";
	});
	const hasClassBefore = await page.locator("body").getAttribute("class");
	console.log("DEBUG BEFORE enable:", { hasClassBefore, isLiveBefore });

	await enableFeature(page, "hideLiveStreamChat.enabled");

	const events: string[] = [];
	for (let i = 0; i < 30; i++) {
		const [isLive, cls] = await Promise.all([
			page.evaluate(async () => {
				const player = document.querySelector("#movie_player") as unknown as { getVideoData?: () => Promise<{ isLive?: boolean }> };
				return player?.getVideoData ? (await player.getVideoData())?.isLive : "no-getVideoData";
			}),
			page.locator("body").getAttribute("class")
		]);
		events.push(`t+${i * 500}ms isLive=${String(isLive)} class=${JSON.stringify(cls)}`);
		await page.waitForTimeout(500);
	}
	console.log("DEBUG EVENTS:\n" + events.join("\n"));
});
