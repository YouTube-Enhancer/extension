import type { PlayerSize, YouTubePlayer } from "youtube-player/dist/types";

// TODO: update tests to test all button placements
import { test as base, type BrowserContext, chromium, defineConfig, devices, type Page } from "@playwright/test";
import { join } from "path";
import { cwd } from "process";

import { buttonContainerId } from "@/src/features/buttonPlacement/utils";
import { checkTests } from "@/src/utils/checkTests";
import { defaultConfiguration } from "@/src/utils/constants";

import type {
	ButtonPlacement,
	configuration,
	configurationId,
	FeatureButtonId,
	FeatureMenuItemId,
	ModifierKey,
	Path,
	PathValue,
	YoutubePlayerQualityLevel
} from "./src/types/index";

import { chooseClosestQuality, clamp } from "./src/utils/utilities";
checkTests();

type FilterKeysByPrefix<O extends object, K extends keyof O, Prefix extends string> = K extends `${Prefix}${string}` ? K : never;

type FilterKeysByValueType<O extends object, ValueType> = {
	[K in keyof O]: O[K] extends ValueType ? K
	: O[K] extends Record<string, ValueType> ? K
	: never;
}[keyof O];
type FilterMethodsWithParameters<O extends object, K extends keyof O> = {
	[Key in K]: O[Key] extends (...args: any[]) => any ?
		Parameters<O[Key]> extends [] ?
			never
		:	Key
	:	never;
}[K];
type SelectKeys = {
	[K in Path<configuration>]: PathValue<configuration, K> extends number | string ? K : never;
}[Path<configuration>];

type YouTubePlayerGetKeys = FilterKeysByPrefix<YouTubePlayer, keyof YouTubePlayer, "get">;

type YouTubePlayerGetKeysWithoutParams = Exclude<YouTubePlayerGetKeys, FilterMethodsWithParameters<YouTubePlayer, YouTubePlayerGetKeys>>;
type YouTubePlayerGetReturnType<K extends YouTubePlayerGetKeysWithoutParams> =
	K extends keyof YouTubePlayerGetReturnTypeMappings ? YouTubePlayerGetReturnTypeMappings[K] : "Return type not implemented";

type YouTubePlayerGetReturnTypeMappings = {
	getAvailableQualityLevels: Exclude<YoutubePlayerQualityLevel, "auto">[];
	getPlaybackQuality: YoutubePlayerQualityLevel;
	getPlaybackRate: number;
	getSize: PlayerSize;
	getVolume: number;
};

type YouTubePlayerSetKeys = FilterKeysByPrefix<YouTubePlayer, keyof YouTubePlayer, "set">;
export async function adjustWithScrollWheel({
	controlType,
	direction,
	modifierKey = "altKey",
	page,
	value,
	withModifierKey = false,
	withRightClick = false
}: {
	controlType: "speed" | "volume";
	direction: "down" | "up";
	modifierKey?: ModifierKey;
	page: Page;
	value: number;
	withModifierKey?: boolean;
	withRightClick?: boolean;
}) {
	// Enable the feature for scroll wheel control
	await enableFeature(page, `enable_scroll_wheel_${controlType}_control`);
	// Map the modifier key to the corresponding key to press
	const { [modifierKey]: keyToPress } = {
		altKey: "Alt",
		ctrlKey: "Control",
		shiftKey: "Shift"
	};
	// If using a modifier key, enable the feature and select the modifier key
	if (withModifierKey) {
		if (controlType === "volume") await enableFeature(page, `enable_scroll_wheel_${controlType}_control_hold_modifier_key`);
		await selectOption(page, `scroll_wheel_${controlType}_control_modifier_key`, modifierKey);
	}
	// If using a right click, enable the feature
	if (controlType === "volume" && withRightClick) {
		await enableFeature(page, `enable_scroll_wheel_${controlType}_control_hold_right_click`);
	}
	// Get the adjustment steps from the page
	const scrollWheelAdjustment = await waitForSelector(page, `${controlType}_adjustment_steps`).getAttribute("value");
	// Expect the adjustment steps to be the default value
	expect(scrollWheelAdjustment).toBe(defaultConfiguration[`${controlType}_adjustment_steps`].toString());
	// Navigate to the YouTube page
	await navigateToYoutubePage(page);
	// Set the value on the YouTube player
	await setValueOnYouTubePlayer(page, `set${controlType === "volume" ? "Volume" : "PlaybackRate"}`, value);
	// Original value should be equal to the specified value
	const originalValue = await getCurrentValue(page, controlType);
	expect(originalValue).toBeTruthy();
	expect(originalValue).toBe(value);
	// Hover over the YouTube player container
	const playerContainer = page.locator("div#movie_player");
	await playerContainer.hover();
	const playerContainerBoundingBox = await playerContainer.boundingBox();
	expect(playerContainerBoundingBox).toBeTruthy();
	const {
		height: playerContainerHeight,
		width: playerContainerWidth,
		x: playerContainerX,
		y: playerContainerY
	} = playerContainerBoundingBox as { height: number; width: number; x: number; y: number };
	// Move the mouse to the center of the YouTube player container

	// If using a modifier key, press it down
	if (withModifierKey) {
		await page.keyboard.down(keyToPress);
	}
	// TODO: fix right click testing
	if (withRightClick) {
		await page.mouse.move(playerContainerX + playerContainerWidth / 2, playerContainerY + playerContainerHeight / 2);
		await page.mouse.down({
			button: "right"
		});
	}
	// Simulate the mouse wheel scroll (up or down) to adjust the control
	await page.mouse.wheel(0, direction === "up" ? -1 : 1);
	// If using a modifier key, release the key
	if (withModifierKey) {
		await page.keyboard.up(keyToPress);
	}
	if (withRightClick) {
		await page.mouse.move(playerContainerX + playerContainerWidth / 2, playerContainerY + playerContainerHeight / 2);
		await page.mouse.up({
			button: "right"
		});
	}
	// Get the value after the scroll and expect it to be adjusted correctly
	const valueAfterScroll = await getCurrentValue(page, controlType);
	const expectedValue = value + (direction === "up" ? 1 : -1) * defaultConfiguration[`${controlType}_adjustment_steps`];
	expect(valueAfterScroll).toBeTruthy();
	expect(valueAfterScroll).toBe(controlType === "speed" ? clamp(expectedValue, 0.25, 4) : expectedValue);
}
export async function clickFeatureButton(page: Page, featureId: FeatureButtonId) {
	// Click the feature button
	await page.locator(`#${featureId}`).click();
}
export async function clickFeatureMenuItem(page: Page, featureId: FeatureMenuItemId) {
	// Open the features menu
	await page.locator(`#yte-feature-menu-button`).click();
	// Click the feature menu item
	await page.locator(`#${featureId}`).click();
}
export async function disableFeature(page: Page, feature: FilterKeysByPrefix<configuration, keyof configuration, "enable">) {
	// Wait for the checkbox to appear.
	const checkbox = waitForSelector(page, feature);
	// Uncheck the checkbox.
	await checkbox.setChecked(false);
	// Ensure the checkbox is unchecked.
	const isChecked = await checkbox.isChecked();
	expect(isChecked).toBe(false);
}
export async function enableFeature(page: Page, feature: FilterKeysByPrefix<configuration, keyof configuration, "enable">) {
	// Wait for the checkbox to appear
	const checkbox = waitForSelector(page, feature);
	// Set the checkbox to true
	await checkbox.setChecked(true);
	// Check that the checkbox is true
	const isChecked = await checkbox.isChecked();
	expect(isChecked).toBe(true);
}
export async function expectCurrentQualityLevelToBeFalsy(page: Page, expectedQuality: YoutubePlayerQualityLevel) {
	// Get the current quality level from the YouTube player
	const currentQualityLevel = await getValueFromYouTubePlayer(page, "getPlaybackQuality");
	// Make sure the current quality level exists
	expect(currentQualityLevel).toBeTruthy();
	// Make sure the current quality level is not the expected quality level
	expect(currentQualityLevel).not.toBe(expectedQuality);
}
export async function expectCurrentQualityLevelToBeTruthy(page: Page, expectedQuality: YoutubePlayerQualityLevel) {
	// Get the current quality level from the YouTube player
	const currentQualityLevel = await getValueFromYouTubePlayer(page, "getPlaybackQuality");
	// Check that the quality level is the same as the one we set
	expect(currentQualityLevel).toBeTruthy();
	expect(currentQualityLevel).toBe(expectedQuality);
}
export async function expectFeatureButtonToBeFalsy(page: Page, featureId: FeatureButtonId) {
	// Get the menu item for the feature
	const menuItem = page.locator(`#${featureId}`);
	// Check that the menu item is not attached to the DOM
	await expect(menuItem).not.toBeAttached();
}
export async function expectFeatureButtonToBeIn(page: Page, featureId: FeatureButtonId, placement: Exclude<ButtonPlacement, "feature_menu">) {
	const placementSelectors = {
		below_player: `#${buttonContainerId}`,
		player_controls_left: ".ytp-left-controls",
		player_controls_right: ".ytp-right-controls"
	};
	const { [placement]: selector } = placementSelectors;
	const container = page.locator(selector);
	await expect(container).toBeAttached();
	const button = container.locator(`#${featureId}`);
	await expect(button).toBeAttached();
}

export async function expectFeatureButtonToBeTruthy(page: Page, featureId: FeatureButtonId) {
	// Get the menu item for the feature
	const menuItem = page.locator(`#${featureId}`);
	// Check that the menu item is attached to the DOM
	await expect(menuItem).toBeAttached();
}

export async function expectFeatureMenuItemToBeFalsy(page: Page, featureId: FeatureMenuItemId) {
	// Get the menu item for the feature
	const menuItem = page.locator(`#${featureId}`);
	// Check that the menu item is not attached to the DOM
	await expect(menuItem).not.toBeAttached();
}

export async function expectFeatureMenuItemToBeTruthy(page: Page, featureId: FeatureMenuItemId) {
	// Get the menu item for the feature
	const menuItem = page.locator(`#${featureId}`);
	// Check that the menu item is attached to the DOM
	await expect(menuItem).toBeAttached();
}
export async function getClosestQuality(page: Page, quality: YoutubePlayerQualityLevel) {
	// Get the available quality levels from the YouTube player.
	const availableQualityLevels = await getValueFromYouTubePlayer(page, "getAvailableQualityLevels");
	// Ensure we have some quality levels available.
	expect(availableQualityLevels).toBeTruthy();
	if (!availableQualityLevels) return;
	// Choose the best quality level.
	const closestQuality = chooseClosestQuality(quality, availableQualityLevels);
	return closestQuality;
}
export async function getCurrentVolume(page: Page) {
	const currentVolume = await getValueFromYouTubePlayer(page, "getVolume");
	return currentVolume;
}
export async function getSelected<P extends Page, K extends Exclude<FilterKeysByValueType<configuration, number | string>, undefined>>(
	page: P,
	id: K
) {
	// Wait for the select to appear
	const select = waitForSelector(page, id);
	// Make sure the select has appeared
	expect(select).toBeTruthy();
	// Get the selected value
	const selected = await select.getAttribute("aria-valuetext");
	// Make sure the selected value is not empty
	expect(selected).toBeTruthy();
	// Return the selected value
	return selected;
}
export async function getValueFromYouTubePlayer<P extends Page, K extends YouTubePlayerGetKeysWithoutParams>(page: P, key: K) {
	const value = await page.evaluate(
		async ([selector, key]) => {
			// Get the element with the selector.
			const container = document.querySelector(selector) as unknown as null | YouTubePlayer;
			if (!container) return null;
			// Call the method on the element.
			return await container[key]();
		},
		["div#movie_player", key] as const
	);
	return value as null | YouTubePlayerGetReturnType<K>;
}
export async function handleYoutubeAds(page: Page) {
	const adsContainer = await page.evaluate(() => {
		const adsContainer = document.querySelector("div.video-ads.ytp-ad-module");
		if (!adsContainer) return null;
		return {
			hasRemainingTime: adsContainer.querySelector<HTMLSpanElement>(".ytp-ad-duration-remaining > .ytp-ad-text") !== null,
			hasSkipButton: adsContainer.querySelector<HTMLButtonElement>(".ytp-ad-skip-ad-slot button") !== null,
			remainingTime: adsContainer.querySelector<HTMLSpanElement>(".ytp-ad-duration-remaining > .ytp-ad-text")?.textContent
		};
	});
	if (!adsContainer) return;
	// If there is a skip button, click it
	if (adsContainer.hasSkipButton) {
		await page.evaluate(() => {
			const skipButton = document.querySelector<HTMLButtonElement>(".ytp-ad-skip-ad-slot button");
			if (!skipButton) return;
			skipButton.click();
		});
		return;
	}
	// If there is a remaining time, wait for the ad to be over
	if (adsContainer.hasRemainingTime && adsContainer.remainingTime) {
		// Parse the remaining time from mm:ss format into milliseconds
		const [hours = 0, minutes = 0, seconds = 0] = adsContainer.remainingTime.split(":").map((value) => parseInt(value));
		const remainingTime = hours * 60 * 60 + minutes * 60 + seconds;
		// Wait for the ad to be over
		await page.waitForTimeout(remainingTime * 1000);
	}
}
export async function handleYoutubePromos(page: Page) {
	const promoContainer = await page.evaluate(() => {
		const promoContainer = document.querySelector("tp-yt-paper-dialog");
		if (!promoContainer) return null;
		return {
			isVisible: promoContainer !== null
		};
	});
	if (!promoContainer) return;
	if (promoContainer.isVisible) {
		await page.evaluate(() => {
			const dismissButton = document.querySelector<HTMLButtonElement>("#dismiss-button");
			if (!dismissButton) return;
			dismissButton.click();
		});
	}
}
export async function navigateToOptionsPage(page: Page, extensionId: string) {
	await navigateToPage(page, `chrome-extension://${extensionId}/src/pages/options/index.html`);
	await page.waitForTimeout(250);
	await selectOption(page, "feature_menu_open_type", "click");
}
export async function navigateToPage(page: Page, url: string) {
	await page.goto(url);
	await page.waitForLoadState();
	expect(page.url()).toBe(url);
}
export async function navigateToYoutubePage(page: Page) {
	// Navigate to a YouTube video
	await navigateToPage(page, "https://www.youtube.com/watch?v=epUk3T2Kfno");
	// Confirm that the message from YouTube is on the page
	await expect(page.locator("div#yte-message-from-youtube")).toBeAttached();
	// Confirm that the message from the extension is on the page
	await expect(page.locator("div#yte-message-from-extension")).toBeAttached();
	// Wait for the page to be fully loaded
	await page.waitForLoadState("networkidle");
	await handleYoutubeAds(page);
	await handleYoutubePromos(page);
}
export async function selectOption<P extends Page, K extends SelectKeys, V extends PathValue<configuration, K>>(page: P, id: K, value: V) {
	// Wait for the select to appear on the page
	const select = waitForSelector(page, id);
	expect(select).toBeTruthy();
	// Click the select to open the dropdown
	await select.locator("div > button").click();
	// Select the option
	const selectOption = select.locator(`div > div > div[aria-valuetext="${value}"]`);
	expect(selectOption).toBeTruthy();
	await selectOption.click();
}
export async function setValue<
	P extends Page,
	K extends Exclude<FilterKeysByValueType<configuration, number>, undefined>,
	V extends configuration[K]
>(page: P, key: K, value: V) {
	// Find the input element using the key (which is a data-test-id)
	const input = waitForSelector(page, key);
	// Type the value into the input element
	expect(input).toBeTruthy();
	await input.fill(String(value));
}
export async function setValueOnYouTubePlayer<P extends Page, K extends YouTubePlayerSetKeys, V extends Parameters<YouTubePlayer[K]>>(
	page: P,
	key: K,
	...value: V
) {
	await page.evaluate(
		async ({ key, selector, value }) => {
			// Find the YouTube player on the page.
			const container = document.querySelector(selector) as unknown as null | YouTubePlayer;
			if (!container) return null;
			try {
				// Call the specified function on the player.
				await (container[key] as (...args: V[]) => Promise<void>)(...value);
			} catch (error) {
				console.error(error);
			}
		},
		// Pass the following arguments to the function:
		{ key, selector: "div#movie_player", value } as const
	);
}
export async function setVolume(page: Page, volume: number) {
	// Set the volume of the YouTube player to the value specified by the user.
	await page.evaluate(
		async ([selector, volume]) => {
			// Get a reference to the YouTube player element.
			const container = document.querySelector(selector) as unknown as null | YouTubePlayer;
			// If the element does not exist, return null.
			if (!container) return null;
			// Set the volume of the player and return the result.
			await container.setVolume(volume);
		},
		["div#movie_player", volume] as const
	);
}
export function waitForSelector(page: Page, selector: configurationId) {
	const element = page.locator(`id=${selector}`);
	return element;
}
async function getCurrentValue(page: Page, controlType: "speed" | "volume") {
	const { [controlType]: key } = {
		speed: "getPlaybackRate",
		volume: "getVolume"
	} as const;
	const currentVolume = await getValueFromYouTubePlayer(page, key);
	return currentVolume;
}
export const test = base.extend<{
	context: BrowserContext;
	extensionId: string;
}>({
	context: async ({ browserName }, use) => {
		const pathToExtension = join(
			cwd(),
			`/dist/${
				browserName === "chromium" ? "Chrome"
				: browserName === "firefox" ? "Firefox"
				: "Chrome"
			}`
		);
		const context = await chromium.launchPersistentContext("", {
			acceptDownloads: true,
			args: [`--disable-extensions-except=${pathToExtension}`, `--load-extension=${pathToExtension}`],
			downloadsPath: join(cwd(), "/playwright-downloads"),
			headless: false
		});
		await use(context);
		await context.close();
	},
	extensionId: async ({ browserName, context }, use) => {
		switch (browserName) {
			case "chromium": {
				// for manifest v3:
				let [background] = context.serviceWorkers();
				if (!background) background = await context.waitForEvent("serviceworker");

				const [, , extensionId] = background.url().split("/");
				await use(extensionId);
				break;
			}
			case "firefox": {
				let [background] = context.backgroundPages();
				if (!background) background = await context.waitForEvent("backgroundpage");

				const [, , extensionId] = background.url().split("/");
				await use(extensionId);
				break;
			}
			case "webkit":
				return;
		}
	}
});
export const volume = 10;
export const speed = 0.25;
export const qualityLevel = "hd2160" as YoutubePlayerQualityLevel;
export const { describe, expect } = test;

export default defineConfig({
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Run tests in files in parallel */
	fullyParallel: true,
	globalTimeout: process.env.CI ? 60 * 1000 * 30 : undefined,
	/* Configure projects for major browsers */
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"]
			}
		},
		{
			name: "firefox",
			use: {
				...devices["Desktop Firefox"]
			}
		}
	],
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: process.env.CI ? "dot" : "list",
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	testDir: ".",
	timeout: 60 * 1000 * 1,
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		permissions: ["clipboard-read", "clipboard-write"],
		screenshot: {
			fullPage: true,
			mode: "only-on-failure",
			omitBackground: true
		},
		trace: {
			attachments: true,
			mode: "retain-on-failure",
			screenshots: true,
			snapshots: true
		},
		video: {
			mode: "retain-on-failure",
			size: {
				height: 720,
				width: 1280
			}
		},
		viewport: {
			height: 720,
			width: 1280
		}
	},
	/* Opt out of parallel tests on CI. */
	workers: process.env.CI ? 1 : 3
});
