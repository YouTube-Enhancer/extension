import type { Page } from "@playwright/test";

import { expect, test } from "playwright.config";

import { metadata } from "@/src/features/playbackSpeedButtons/index.metadata";
import { expectFeatureButtonToBeFalsy, expectFeatureButtonToBeIn, expectFeatureButtonToBeTruthy, expectToStay } from "@/src/utils/_tests/assertions";
import { pageTypeRecord, placementRecord } from "@/src/utils/_tests/constants";
import { clickFeatureButton, disableFeature, enableFeature, setOption } from "@/src/utils/_tests/features";
import { toggleFullscreen } from "@/src/utils/_tests/fullscreen";
import { navigateToPageType } from "@/src/utils/_tests/navigation";
import { getCurrentSpeed, setValueOnYouTubePlayer } from "@/src/utils/_tests/player";
import { resolveNonTargetPage, resolvePageTypes } from "@/src/utils/_tests/utils";
const testPages = resolvePageTypes(metadata.dependencies?.includePages);
const nonTargetPage = resolveNonTargetPage(metadata.dependencies);
const { live, watch } = pageTypeRecord;
const { left, right } = placementRecord;
const speedAdjustment = 0.25;
// A step the feature does not default to, so writing it actually emits a config change instead of being
// discarded as a no-op write.
const customSpeedAdjustment = 0.5;
// getMinSpeed(0.25) - the lowest rate the buttons may reach with the default step.
const minSpeed = 0.25;
const osdSelector = "canvas#yte-osd";
const increaseButtonId = "yte-feature-increasePlaybackSpeedButton-button";
const decreaseButtonId = "yte-feature-decreasePlaybackSpeedButton-button";
async function countSpeedButtons(page: Page): Promise<number> {
	return page.evaluate(([increaseId, decreaseId]) => document.querySelectorAll(`#${increaseId}, #${decreaseId}`).length, [
		increaseButtonId,
		decreaseButtonId
	] as const);
}
/**
 * Reads the on-screen display canvas: its inline position plus how many pixels were actually painted.
 * The painted count is what proves the speed display was drawn, since an empty canvas is still appended.
 */
async function readOnScreenDisplayState(page: Page): Promise<null | { left: string; painted: number; top: string }> {
	return page.evaluate((selector) => {
		const canvas = document.querySelector<HTMLCanvasElement>(selector);
		if (!canvas) return null;
		const context = canvas.getContext("2d");
		if (!context) return null;
		const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
		let painted = 0;
		for (let index = 3; index < data.length; index += 4) {
			if (data[index] > 0) painted++;
		}
		const {
			style: { left, top }
		} = canvas;
		return { left, painted, top };
	}, osdSelector);
}
test.describe("playbackSpeedButtons", () => {
	for (const pageType of testPages) {
		test(`increase speed button should increase playback speed on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playbackSpeedButtons.speed", speedAdjustment);
			await setOption(page, "playbackSpeedButtons.button.placement", left);
			await enableFeature(page, "playbackSpeedButtons.button.enabled");
			const currentSpeed = await getCurrentSpeed(page, pageType);
			expect(currentSpeed).toBeTruthy();
			if (!currentSpeed) return;
			await clickFeatureButton(page, pageType, "yte-feature-increasePlaybackSpeedButton-button", left);
			await expect.poll(async () => getCurrentSpeed(page, pageType), { intervals: [200], timeout: 5000 }).toBe(currentSpeed + speedAdjustment);
		});
		test(`decrease speed button should decrease playback speed on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playbackSpeedButtons.speed", speedAdjustment);
			await setOption(page, "playbackSpeedButtons.button.placement", left);
			await enableFeature(page, "playbackSpeedButtons.button.enabled");
			const currentSpeed = await getCurrentSpeed(page, pageType);
			expect(currentSpeed).toBeTruthy();
			if (!currentSpeed) return;
			await clickFeatureButton(page, pageType, "yte-feature-decreasePlaybackSpeedButton-button", left);
			await expect.poll(async () => getCurrentSpeed(page, pageType), { intervals: [200], timeout: 5000 }).toBe(currentSpeed - speedAdjustment);
		});
		test(`speed buttons should re-appear after disable then re-enable on ${pageType}`, async ({ page }) => {
			await navigateToPageType(page, pageType);
			await setOption(page, "playbackSpeedButtons.button.placement", left);
			await enableFeature(page, "playbackSpeedButtons.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-increasePlaybackSpeedButton-button");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-decreasePlaybackSpeedButton-button");
			await disableFeature(page, "playbackSpeedButtons.button.enabled");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-increasePlaybackSpeedButton-button");
			await expectFeatureButtonToBeFalsy(page, "yte-feature-decreasePlaybackSpeedButton-button");
			await enableFeature(page, "playbackSpeedButtons.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-increasePlaybackSpeedButton-button");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-decreasePlaybackSpeedButton-button");
		});
	}

	test(`speed buttons should persist after full page reload`, async ({ page }) => {
		await navigateToPageType(page, testPages[0]);
		await setOption(page, "playbackSpeedButtons.button.placement", left);
		await enableFeature(page, "playbackSpeedButtons.button.enabled");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-increasePlaybackSpeedButton-button");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-decreasePlaybackSpeedButton-button");
		await page.reload();
		await navigateToPageType(page, testPages[0]);
		await expectFeatureButtonToBeTruthy(page, "yte-feature-increasePlaybackSpeedButton-button");
		await expectFeatureButtonToBeTruthy(page, "yte-feature-decreasePlaybackSpeedButton-button");
	});

	test(`should not create speed buttons on non-target page`, async ({ page }) => {
		await navigateToPageType(page, nonTargetPage!);
		await enableFeature(page, "playbackSpeedButtons.button.enabled");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-increasePlaybackSpeedButton-button");
		await expectFeatureButtonToBeFalsy(page, "yte-feature-decreasePlaybackSpeedButton-button");
	});

	// The only page where the isLive guard in addPlaybackSpeedButton can run at all: a live /watch URL is
	// classified as pageType "live", which is also outside the feature's includePages.
	test(`speed buttons are not added on a live stream`, async ({ page }) => {
		await navigateToPageType(page, live);
		await setOption(page, "playbackSpeedButtons.speed", speedAdjustment);
		await setOption(page, "playbackSpeedButtons.button.placement", left);
		await enableFeature(page, "playbackSpeedButtons.button.enabled");
		// A single read would sample before the buttons could have been added.
		await expectToStay(async () => countSpeedButtons(page), 0, { page });
	});

	test(`increase button steps by the configured speed value on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		// The step is captured when the button is added and a speed-only config change never re-adds the
		// button, so a non-default step has to be stored before the feature is enabled.
		await setOption(page, "playbackSpeedButtons.speed", customSpeedAdjustment);
		await setOption(page, "playbackSpeedButtons.button.placement", left);
		await setValueOnYouTubePlayer(page, watch, "setPlaybackRate", 1);
		await enableFeature(page, "playbackSpeedButtons.button.enabled");
		await expect.poll(async () => getCurrentSpeed(page, watch), { intervals: [200], timeout: 5000 }).toBe(1);
		await clickFeatureButton(page, watch, increaseButtonId, left);
		await expect.poll(async () => getCurrentSpeed(page, watch), { intervals: [200], timeout: 5000 }).toBe(1 + customSpeedAdjustment);
	});

	test(`decrease button clamps at the minimum speed and shows the limit title on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "playbackSpeedButtons.speed", speedAdjustment);
		await setOption(page, "playbackSpeedButtons.button.placement", left);
		await setValueOnYouTubePlayer(page, watch, "setPlaybackRate", minSpeed + speedAdjustment);
		await enableFeature(page, "playbackSpeedButtons.button.enabled");
		await expect.poll(async () => getCurrentSpeed(page, watch), { intervals: [200], timeout: 5000 }).toBe(minSpeed + speedAdjustment);
		await clickFeatureButton(page, watch, decreaseButtonId, left);
		await expect.poll(async () => getCurrentSpeed(page, watch), { intervals: [200], timeout: 5000 }).toBe(minSpeed);
		const decreaseButton = page.locator(`#${decreaseButtonId}`);
		await expect.poll(async () => decreaseButton.getAttribute("data-title")).toBe(`Can't decrease further (${minSpeed})`);
		// A further click must be refused: another step would take the rate to 0 and stall playback.
		await clickFeatureButton(page, watch, decreaseButtonId, left);
		await expectToStay(async () => getCurrentSpeed(page, watch), minSpeed, { page });
	});

	test(`button titles update after a click on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "playbackSpeedButtons.speed", speedAdjustment);
		await setOption(page, "playbackSpeedButtons.button.placement", left);
		// The titles are built from the rate the video reports when the buttons are added.
		await setValueOnYouTubePlayer(page, watch, "setPlaybackRate", 1);
		await enableFeature(page, "playbackSpeedButtons.button.enabled");
		const increaseButton = page.locator(`#${increaseButtonId}`);
		const decreaseButton = page.locator(`#${decreaseButtonId}`);
		await expect.poll(async () => increaseButton.getAttribute("data-title")).toBe("Increase Speed to 1.25");
		await expect.poll(async () => decreaseButton.getAttribute("data-title")).toBe("Decrease Speed to 0.75");
		await clickFeatureButton(page, watch, increaseButtonId, left);
		await expect.poll(async () => getCurrentSpeed(page, watch), { intervals: [200], timeout: 5000 }).toBe(1 + speedAdjustment);
		await expect.poll(async () => increaseButton.getAttribute("data-title")).toBe("Increase Speed to 1.5");
		await expect.poll(async () => decreaseButton.getAttribute("data-title")).toBe("Decrease Speed to 1");
	});

	test(`changing playbackSpeedButtons.speed live refreshes the button titles on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "playbackSpeedButtons.speed", speedAdjustment);
		await setOption(page, "playbackSpeedButtons.button.placement", left);
		await setValueOnYouTubePlayer(page, watch, "setPlaybackRate", 1);
		await enableFeature(page, "playbackSpeedButtons.button.enabled");
		const increaseButton = page.locator(`#${increaseButtonId}`);
		const decreaseButton = page.locator(`#${decreaseButtonId}`);
		await expect.poll(async () => increaseButton.getAttribute("data-title")).toBe("Increase Speed to 1.25");
		await expect.poll(async () => decreaseButton.getAttribute("data-title")).toBe("Decrease Speed to 0.75");
		// onConfigChange is the feature's only lifecycle hook: the buttons stay in place and only the step
		// they advertise changes.
		await setOption(page, "playbackSpeedButtons.speed", customSpeedAdjustment);
		await expect.poll(async () => increaseButton.getAttribute("data-title")).toBe("Increase Speed to 1.5");
		await expect.poll(async () => decreaseButton.getAttribute("data-title")).toBe("Decrease Speed to 0.5");
	});

	test(`on-screen display appears when a speed button is clicked on ${watch}`, async ({ page }) => {
		await navigateToPageType(page, watch);
		await setOption(page, "playbackSpeedButtons.speed", speedAdjustment);
		await setOption(page, "playbackSpeedButtons.button.placement", left);
		// The click path forces displayType "text" and ignores onScreenDisplay.type, so "no_display" is what
		// makes the painted-pixel assertion falsifiable: a display honouring the setting would draw nothing.
		await setOption(page, "onScreenDisplay.type", "no_display");
		await setOption(page, "onScreenDisplay.position", "top_left");
		await setOption(page, "onScreenDisplay.padding", 0);
		await setOption(page, "onScreenDisplay.hideTime", 5000);
		await setValueOnYouTubePlayer(page, watch, "setPlaybackRate", 1);
		await enableFeature(page, "playbackSpeedButtons.button.enabled");
		await expect(page.locator(osdSelector)).not.toBeAttached();
		await clickFeatureButton(page, watch, increaseButtonId, left);
		await expect
			.poll(
				async () => {
					const state = await readOnScreenDisplayState(page);
					return state && state.painted > 0 ? { left: state.left, top: state.top } : null;
				},
				{ timeout: 5000 }
			)
			.toEqual({ left: "0px", top: "0px" });
	});

	test.describe("feature conflicts", () => {
		test.describe("playerSpeed vs playbackSpeedButtons", () => {
			test("playerSpeed default is applied and speed buttons are present when both enabled on watch", async ({ page }) => {
				await navigateToPageType(page, watch);
				await setOption(page, "playerSpeed.speed", 2);
				await setOption(page, "playbackSpeedButtons.speed", 0.25);
				await setOption(page, "playbackSpeedButtons.button.placement", left);
				await enableFeature(page, "playerSpeed.enabled");
				await enableFeature(page, "playbackSpeedButtons.button.enabled");
				await expect(page.locator("#yte-feature-decreasePlaybackSpeedButton-button")).toBeAttached();
				await expect(page.locator("#yte-feature-increasePlaybackSpeedButton-button")).toBeAttached();
				await expect.poll(async () => getCurrentSpeed(page, watch), { timeout: 10000 }).toBe(2);
			});
			test(`a speed button click overrides playerSpeed enforcement on ${watch}`, async ({ page }) => {
				// YouTube's player API caps the rate it accepts and reports at 2x, so the enforced speed has to leave
				// room for one increase step; starting at 2 would report 2 again after the click and prove nothing.
				const enforcedSpeed = 1.5;
				await navigateToPageType(page, watch);
				await setOption(page, "playerSpeed.speed", enforcedSpeed);
				await setOption(page, "playbackSpeedButtons.speed", speedAdjustment);
				await setOption(page, "playbackSpeedButtons.button.placement", left);
				await enableFeature(page, "playerSpeed.enabled");
				await enableFeature(page, "playbackSpeedButtons.button.enabled");
				await expect.poll(async () => getCurrentSpeed(page, watch), { timeout: 10000 }).toBe(enforcedSpeed);
				await clickFeatureButton(page, watch, increaseButtonId, left);
				await expect.poll(async () => getCurrentSpeed(page, watch), { intervals: [200], timeout: 5000 }).toBe(enforcedSpeed + speedAdjustment);
				// The click is not an own-write, so playerSpeed marks a manual override and must stop enforcing
				// its configured speed for the rest of this video.
				await expectToStay(async () => getCurrentSpeed(page, watch), enforcedSpeed + speedAdjustment, { page });
			});
		});
	});

	test.describe("button placement", () => {
		// player_controls_left is already asserted by clickFeatureButton in the increase/decrease click tests.
		test(`speed buttons should render in ${right}`, async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "playbackSpeedButtons.button.placement", right);
			await enableFeature(page, "playbackSpeedButtons.button.enabled");
			await expectFeatureButtonToBeTruthy(page, "yte-feature-increasePlaybackSpeedButton-button");
			await expectFeatureButtonToBeIn(page, "yte-feature-increasePlaybackSpeedButton-button", right);
			await expectFeatureButtonToBeTruthy(page, "yte-feature-decreasePlaybackSpeedButton-button");
			await expectFeatureButtonToBeIn(page, "yte-feature-decreasePlaybackSpeedButton-button", right);
		});
	});

	test.describe("fullscreen transition", () => {
		test("speed buttons should move from left to right on fullscreen enter/exit", async ({ page }) => {
			await navigateToPageType(page, watch);
			await setOption(page, "playbackSpeedButtons.button.placement", left);
			await setOption(page, "playbackSpeedButtons.button.fullscreenPlacement", right);
			await enableFeature(page, "playbackSpeedButtons.button.enabled");
			await expectFeatureButtonToBeIn(page, "yte-feature-increasePlaybackSpeedButton-button", left);
			await expectFeatureButtonToBeIn(page, "yte-feature-decreasePlaybackSpeedButton-button", left);
			await toggleFullscreen(page, true);
			await expectFeatureButtonToBeIn(page, "yte-feature-increasePlaybackSpeedButton-button", right);
			await expectFeatureButtonToBeIn(page, "yte-feature-decreasePlaybackSpeedButton-button", right);
			await toggleFullscreen(page, false);
			await expectFeatureButtonToBeIn(page, "yte-feature-increasePlaybackSpeedButton-button", left);
			await expectFeatureButtonToBeIn(page, "yte-feature-decreasePlaybackSpeedButton-button", left);
		});
	});
});
