import type { PlayerSize, YouTubePlayer } from "youtube-player/dist/types";

// TODO: update tests to test all button placements
import { test as base, type BrowserContext, chromium, defineConfig, devices, firefox, type Locator, type Page } from "@playwright/test";
import { join } from "path";
import { withExtension } from "playwright-webextext";
import { cwd } from "process";

import type { PageType } from "@/src/features/_registry/types";
import type { PlayerQualityFallbackStrategy, YoutubePlayerQualityLevel } from "@/src/features/playerQuality/types";
import type {
	ButtonPlacement,
	configuration,
	FeatureButtonId,
	FeatureMenuItemId,
	FilterKeysByValueType,
	ModifierKey,
	Nullable,
	Path,
	PathValue
} from "@/src/types";

import { buttonContainerId } from "@/src/features/buttonPlacement/utils";
import { checkTests } from "@/src/utils/checkTests";
import { clamp } from "@/src/utils/math";
import { getPathValue } from "@/src/utils/misc";
import { chooseClosestQuality } from "@/src/utils/player/quality";

checkTests();
type ControlType = "Speed" | "Volume";

type FilterKeysByPrefix<O extends object, K extends keyof O, Prefix extends string> = K extends `${Prefix}${string}` ? K : never;
type FilterMethodsWithParameters<O extends object, K extends keyof O> = {
	[Key in K]: O[Key] extends (...args: any[]) => any ?
		Parameters<O[Key]> extends [] ?
			never
		:	Key
	:	never;
}[K];

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
	pageType = "watch",
	value,
	withModifierKey = false,
	withRightClick = false
}: {
	controlType: ControlType;
	direction: "down" | "up";
	modifierKey?: ModifierKey;
	page: Page;
	pageType?: PageType;
	value: number;
	withModifierKey?: boolean;
	withRightClick?: boolean;
}) {
	const defaultConfiguration = await loadDefaultConfig();
	await enableFeature(page, `scrollWheel${controlType}Control.enabled`);
	const { [modifierKey]: keyToPress } = {
		altKey: "Alt",
		ctrlKey: "Control",
		shiftKey: "Shift"
	};
	if (withModifierKey) {
		if (controlType === "Volume") await enableFeature(page, `scrollWheel${controlType}Control.holdModifierKey`);
		await setOption(page, `scrollWheel${controlType}Control.modifierKey`, modifierKey);
	}
	if (controlType === "Volume" && withRightClick) {
		await enableFeature(page, `scrollWheel${controlType}Control.holdRightClick`);
	}
	const playerSelector = pageType === "shorts" ? "div#shorts-player" : "div#movie_player";
	await navigateToPageType(page, pageType);
	await page.evaluate(
		async ({ key, selector, value }) => {
			const container = document.querySelector(selector) as unknown as Nullable<YouTubePlayer>;
			if (!container) return null;
			try {
				await (container[key] as (...args: number[]) => Promise<void>)(value);
			} catch (error) {
				console.error(error);
			}
		},
		{ key: `set${controlType === "Volume" ? "Volume" : "PlaybackRate"}`, selector: playerSelector, value } as const
	);
	const originalValue: unknown = await page.evaluate(
		async ([selector, key]) => {
			const container = document.querySelector(selector) as unknown as Nullable<YouTubePlayer>;
			if (!container) return null;
			const result: unknown = await container[key]();
			return result;
		},
		[playerSelector, controlType === "Speed" ? "getPlaybackRate" : "getVolume"] as const
	);
	expect(originalValue).toBeTruthy();
	expect(originalValue).toBe(value);
	const playerContainer = page.locator(playerSelector);
	await playerContainer.hover();
	const playerContainerBoundingBox = await playerContainer.boundingBox();
	expect(playerContainerBoundingBox).toBeTruthy();
	const {
		height: playerContainerHeight,
		width: playerContainerWidth,
		x: playerContainerX,
		y: playerContainerY
	} = playerContainerBoundingBox as { height: number; width: number; x: number; y: number };

	if (withModifierKey) {
		await page.keyboard.down(keyToPress);
	}
	if (withRightClick) {
		await page.mouse.move(playerContainerX + playerContainerWidth / 2, playerContainerY + playerContainerHeight / 2);
		await page.mouse.down({
			button: "right"
		});
	}
	await page.mouse.wheel(0, direction === "up" ? -1 : 1);
	if (withModifierKey) {
		await page.keyboard.up(keyToPress);
	}
	if (withRightClick) {
		await page.mouse.move(playerContainerX + playerContainerWidth / 2, playerContainerY + playerContainerHeight / 2);
		await page.mouse.up({
			button: "right"
		});
	}
	const valueAfterScroll: unknown = await page.evaluate(
		async ([selector, key]) => {
			const container = document.querySelector(selector) as unknown as Nullable<YouTubePlayer>;
			if (!container) return null;
			const result: unknown = await container[key]();
			return result;
		},
		[playerSelector, controlType === "Speed" ? "getPlaybackRate" : "getVolume"] as const
	);
	const expectedValue = value + (direction === "up" ? 1 : -1) * Number(getPathValue(defaultConfiguration, `scrollWheel${controlType}Control.steps`));
	expect(valueAfterScroll).toBeTruthy();
	expect(valueAfterScroll).toBe(controlType === "Speed" ? clamp(expectedValue, 0.25, 4) : expectedValue);
}

export async function clickFeatureMenuItem(page: Page, featureId: FeatureMenuItemId) {
	await ensurePlayerControlsVisible(page);

	const menuButton = page.locator("#yte-feature-menu-button");
	await menuButton.waitFor({ state: "visible" });
	await menuButton.click();

	const item = page.locator(`#${featureId}`);
	await item.waitFor({ state: "visible" });
	await item.click();
}
export async function disableFeature(page: Page, feature: FilterKeysByValueType<configuration, boolean>) {
	await setFeatureValue(page, feature, false);
}
export async function enableFeature(page: Page, feature: FilterKeysByValueType<configuration, boolean>) {
	await setFeatureValue(page, feature, true);
}

export async function expectCurrentQualityLevelToBeFalsy(page: Page, pageType: PageType = "watch", expectedQuality: YoutubePlayerQualityLevel) {
	const currentQualityLevel = await getValueFromYouTubePlayer(page, "getPlaybackQuality", pageType);
	expect(currentQualityLevel).toBeTruthy();
	expect(currentQualityLevel).not.toBe(expectedQuality);
}
export async function expectCurrentQualityLevelToBeTruthy(page: Page, pageType: PageType = "watch", expectedQuality: YoutubePlayerQualityLevel) {
	const currentQualityLevel = await getValueFromYouTubePlayer(page, "getPlaybackQuality", pageType);
	expect(currentQualityLevel).toBeTruthy();
	expect(currentQualityLevel).toBe(expectedQuality);
}
export async function expectFeatureButtonToBeFalsy(page: Page, featureId: FeatureButtonId) {
	const featureButton = page.locator(`#${featureId}`);
	await expect(featureButton).not.toBeAttached();
}
export async function setFeatureValue<K extends Path<configuration>>(page: Page, key: K, value: PathValue<configuration, K>) {
	await sendYouTubeMessage(page, {
		action: "send_data",
		data: { key, value },
		source: "content",
		type: "test_setConfigValue"
	});
	await page.waitForTimeout(100);
}
async function ensurePlayerControlsVisible(page: Page) {
	const player = page.locator("#movie_player");
	await player.hover();
	await page.mouse.move(500, 300);
}
const placementSelectors = {
	below_player: `#${buttonContainerId}`,
	player_controls_left: ".ytp-left-controls",
	player_controls_right: ".ytp-right-controls"
} as const;

export async function clickFeatureButton(page: Page, featureId: FeatureButtonId, placement: Exclude<ButtonPlacement, "feature_menu">) {
	await expectFeatureButtonToBeIn(page, featureId, placement);

	if (placement !== "below_player") {
		await ensurePlayerControlsVisible(page);
	}

	await page.locator(`#${featureId}`).waitFor({ state: "visible" });
	await page.locator(`#${featureId}`).click();
}

export async function expectFeatureButtonToBeIn(page: Page, featureId: FeatureButtonId, placement: Exclude<ButtonPlacement, "feature_menu">) {
	const { [placement]: selector } = placementSelectors;
	const container = page.locator(selector);
	await expect(container).toBeAttached();
	const button = container.locator(`#${featureId}`);
	await expect(button).toBeAttached();
}
export async function expectFeatureButtonToBeTruthy(page: Page, featureId: FeatureButtonId) {
	const featureButton = page.locator(`#${featureId}`);
	await expect(featureButton).toBeAttached();
}
export async function expectFeatureMenuItemToBeFalsy(page: Page, featureId: FeatureMenuItemId) {
	const menuItem = page.locator(`#${featureId}`);
	await expect(menuItem).not.toBeAttached();
}
export async function expectFeatureMenuItemToBeTruthy(page: Page, featureId: FeatureMenuItemId) {
	const menuItem = page.locator(`#${featureId}`);
	await expect(menuItem).toBeAttached();
}

export async function getClosestQuality(
	page: Page,
	pageType: PageType = "watch",
	quality: YoutubePlayerQualityLevel,
	fallbackStrategy: PlayerQualityFallbackStrategy = "higher"
) {
	const availableQualityLevels = await getValueFromYouTubePlayer(page, "getAvailableQualityLevels", pageType);
	expect(availableQualityLevels).toBeTruthy();
	if (!availableQualityLevels) return;
	const closestQuality = chooseClosestQuality(quality, availableQualityLevels, fallbackStrategy);
	return closestQuality;
}

export async function getCurrentVolume(page: Page, pageType: PageType = "watch") {
	const currentVolume = await getValueFromYouTubePlayer(page, "getVolume", pageType);
	return currentVolume;
}

export async function getValueFromYouTubePlayer<P extends Page, K extends YouTubePlayerGetKeysWithoutParams>(
	page: P,
	key: K,
	pageType: PageType = "watch"
) {
	const playerSelector = pageType === "shorts" ? "div#shorts-player" : "div#movie_player";
	const value: unknown = await page.evaluate(
		async ([selector, key]) => {
			const container = document.querySelector(selector) as unknown as Nullable<YouTubePlayer>;
			if (!container) return null;
			const result: unknown = await container[key]();
			return result;
		},
		[playerSelector, key] as const
	);
	return value as Nullable<YouTubePlayerGetReturnType<K>>;
}
const YOUTUBE_AD_SELECTORS = {
	adShowing: "#movie_player.ad-showing",
	remainingTime: ".ytp-ad-duration-remaining .ytp-ad-text",
	skipButton: [".ytp-skip-ad-button", ".ytp-ad-skip-button", ".ytp-ad-skip-button-modern"].join(", ")
} as const;
export async function handleYoutubeAds(page: Page): Promise<void> {
	const getAdInfo = async (): Promise<{
		isShowing: boolean;
		isSkippable: boolean;
		remainingSeconds: Nullable<number>;
	}> => {
		return await page.evaluate((selectors) => {
			const isShowing = document.querySelector(selectors.adShowing) !== null;
			if (!isShowing) {
				return {
					isShowing: false,
					isSkippable: false,
					remainingSeconds: null
				};
			}
			const skipButton = document.querySelector<HTMLElement>(selectors.skipButton);
			const remainingText = document.querySelector<HTMLElement>(selectors.remainingTime)?.textContent?.trim() ?? null;
			let remainingSeconds: Nullable<number> = null;
			if (remainingText) {
				const [hours = 0, minutes = 0, seconds = 0] = remainingText.split(":").map((value) => Number.parseInt(value, 10));
				remainingSeconds = hours * 3600 + minutes * 60 + seconds;
			}
			return {
				isShowing: true,
				isSkippable: skipButton !== null && skipButton.offsetParent !== null,
				remainingSeconds
			};
		}, YOUTUBE_AD_SELECTORS);
	};
	const clickSkipButton = async (): Promise<boolean> => {
		const skipButton = page.locator(YOUTUBE_AD_SELECTORS.skipButton).first();
		if (!(await skipButton.isVisible().catch(() => false))) return false;
		try {
			await skipButton.click({
				force: true,
				timeout: 1_000
			});
			return true;
		} catch {
			return false;
		}
	};
	const adInfo = await getAdInfo();
	if (!adInfo.isShowing) return;
	if (adInfo.isSkippable) {
		await clickSkipButton();
		return;
	}
	const maxWaitTime = adInfo.remainingSeconds !== null ? Math.min(adInfo.remainingSeconds * 1000, 120_000) : 30_000;
	const start = Date.now();
	while (Date.now() - start < maxWaitTime) {
		const current = await getAdInfo();
		if (!current.isShowing) return;
		if (await clickSkipButton()) {
			await expect(page.locator(YOUTUBE_AD_SELECTORS.adShowing)).toHaveCount(0);
			return;
		}
		await page.waitForTimeout(500);
	}
	await expect(page.locator(YOUTUBE_AD_SELECTORS.adShowing)).toHaveCount(0, {
		timeout: 30_000
	});
}
const YOUTUBE_ERROR_SELECTORS = {
	error: ".ytp-error",
	reason: ".ytp-error-content-wrap-reason"
} as const;

export async function handleYoutubeErrors(page: Page): Promise<void> {
	let lastReload = 0;
	const COOLDOWN = 10_000;
	const check = async (): Promise<void> => {
		try {
			if (page.isClosed()) return;
			const errorRoot = page.locator(YOUTUBE_ERROR_SELECTORS.error);
			if ((await errorRoot.count()) === 0) return;
			const reason = await page
				.locator(YOUTUBE_ERROR_SELECTORS.reason)
				.first()
				.textContent()
				.catch(() => "");
			if (!reason?.trim()) return;
			const now = Date.now();
			if (now - lastReload < COOLDOWN) return;
			lastReload = now;
			await page.reload({ waitUntil: "domcontentloaded" }).catch(() => undefined);
			await page.waitForTimeout(2000);
		} catch {}
	};
	await check();
	const interval = setInterval(() => void check(), 1500);
	page.once("close", () => clearInterval(interval));
}
const YOUTUBE_PROMO_SELECTORS = {
	dialog: "tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)",
	dismissButton: ["yt-button-renderer#dismiss-button button", 'button[aria-label="No thanks"]', 'yt-button-shape button:has-text("No thanks")'].join(
		", "
	)
} as const;

export async function handleYoutubePromos(page: Page): Promise<void> {
	const dialog = page.locator(YOUTUBE_PROMO_SELECTORS.dialog);
	const closeOne = async (d: Locator): Promise<boolean> => {
		try {
			if (!(await d.isVisible().catch(() => false))) return false;
			const btn = d.locator(YOUTUBE_PROMO_SELECTORS.dismissButton).first();
			if ((await btn.count()) === 0) return false;
			await btn.click({ force: true, timeout: 1000 });
			await d.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
			return true;
		} catch {
			return false;
		}
	};
	const dismissAll = async (): Promise<void> => {
		const count = await dialog.count();
		for (let i = 0; i < count; i++) {
			await closeOne(dialog.nth(i));
		}
	};
	await dismissAll();
	page.on("domcontentloaded", () => {
		void dismissAll();
	});
}
const YOUTUBE_OVERLAY_SELECTORS = {
	container: ".ytp-overlay-bottom-left",
	featured: ".ytp-featured-product",
	suggested: ".ytp-suggested-action"
} as const;

export async function handleYoutubeSuggestedActions(page: Page): Promise<void> {
	await page.addStyleTag({
		content: `
			${YOUTUBE_OVERLAY_SELECTORS.container} ${YOUTUBE_OVERLAY_SELECTORS.suggested},
			${YOUTUBE_OVERLAY_SELECTORS.container} ${YOUTUBE_OVERLAY_SELECTORS.featured} {
				display: none !important;
				visibility: hidden !important;
				pointer-events: none !important;
			}
		`
	});
}
export async function navigateToPage(page: Page, url: string) {
	await page.goto(url);
	await page.waitForLoadState("domcontentloaded");
	expect(page.url().replace(/\/$/, "")).toBe(url.replace(/\/$/, ""));
}
export async function sendExtensionMessage(page: Page, message: Record<string, unknown>): Promise<void> {
	await page.evaluate((msg) => {
		const provider = document.getElementById("yte-message-from-extension");
		if (!provider) return;
		provider.textContent = JSON.stringify(msg);
		document.dispatchEvent(new CustomEvent("yte-message-from-extension"));
	}, message);
	await page.waitForTimeout(50);
}
export async function sendYouTubeMessage(page: Page, message: Record<string, unknown>): Promise<void> {
	await page.evaluate((msg) => {
		const provider = document.getElementById("yte-message-from-youtube");
		if (!provider) return;

		provider.textContent = JSON.stringify(msg);
		document.dispatchEvent(new CustomEvent("yte-message-from-youtube"));
	}, message);

	await page.waitForTimeout(50);
}
export const pageUrlMap: Record<PageType, Record<"alt" | "main", string> | string> = {
	channel_home: "https://www.youtube.com/@RickAstleyYT",
	channel_videos: "https://www.youtube.com/@RickAstleyYT/videos",
	home: "https://www.youtube.com",
	live: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
	playlist: "https://www.youtube.com/playlist?list=UUuAXFkgsw1L7xaCfnd5JJOw",
	search: "https://www.youtube.com/results?search_query=test",
	shorts: "https://www.youtube.com/shorts/Ay8lynMZ4mE",
	subscriptions: "https://www.youtube.com/feed/subscriptions",
	watch: {
		alt: "https://www.youtube.com/watch?v=epUk3T2Kfno",
		main: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
	}
};

export async function navigateToPageType(page: Page, pageType: PageType, alternative: boolean = false): Promise<void> {
	const { [pageType]: objOrString } = pageUrlMap;
	const url =
		typeof objOrString === "string" ? objOrString
		: alternative ? objOrString.alt
		: objOrString.main;
	await navigateToYoutubePage(page, url, pageType === "live");
}

export async function setOption<P extends Page, K extends Path<configuration>, V extends PathValue<configuration, K>>(page: P, id: K, value: V) {
	await setFeatureValue(page, id, value);
}
export async function setValueOnYouTubePlayer<P extends Page, K extends YouTubePlayerSetKeys, V extends Parameters<YouTubePlayer[K]>>(
	page: P,
	key: K,
	...value: V
) {
	await page.evaluate(
		async ({ key, selector, value }) => {
			const container = document.querySelector(selector) as unknown as Nullable<YouTubePlayer>;
			if (!container) return null;
			try {
				await (container[key] as (...args: V[]) => Promise<void>)(...value);
			} catch (error) {
				console.error(error);
			}
		},
		{ key, selector: "div#movie_player", value } as const
	);
}
export async function setVolume(page: Page, volume: number, pageType: PageType = "watch") {
	const playerSelector = pageType === "shorts" ? "div#shorts-player" : "div#movie_player";
	await page.evaluate(
		async ([selector, volume]) => {
			const container = document.querySelector(selector) as unknown as Nullable<YouTubePlayer>;
			if (!container) return null;
			await container.setVolume(volume);
		},
		[playerSelector, volume] as const
	);
}
async function navigateToYoutubePage(page: Page, pageUrl: string, isLive: boolean = false) {
	if (normalizeUrl(page.url()) !== normalizeUrl(pageUrl)) {
		await navigateToPage(page, pageUrl);
	}
	await page.bringToFront();
	await expect(page.locator("div#yte-message-from-youtube")).toBeAttached();
	await expect(page.locator("div#yte-message-from-extension")).toBeAttached();
	await page.waitForLoadState(!isLive ? "networkidle" : "domcontentloaded");
	await handleYoutubeAds(page);
	await handleYoutubePromos(page);
	await handleYoutubeSuggestedActions(page);
	await handleYoutubeErrors(page);
}

function normalizeUrl(url: string): string {
	return url.replace(/\/$/, "");
}
let _cachedDefaultConfig: configuration | null = null;
async function loadDefaultConfig(): Promise<configuration> {
	if (_cachedDefaultConfig) return _cachedDefaultConfig;
	const vite = await import("vite");
	const server = await vite.createServer({
		appType: "custom",
		logLevel: "error",
		server: { watch: null }
	});
	try {
		await server.pluginContainer.buildStart({});
		const mod = (await server.ssrLoadModule("/src/utils/config/defaults.ts")) as { getDefaultConfiguration: () => configuration };
		_cachedDefaultConfig = mod.getDefaultConfiguration();
		return _cachedDefaultConfig;
	} finally {
		await server.close();
	}
}

export const test = base.extend<{
	context: BrowserContext;
	page: Page;
}>({
	context: async ({ browserName }, use) => {
		const pathToExtension = join(
			cwd(),
			`dist/${
				browserName === "chromium" ? "Chrome"
				: browserName === "firefox" ? "Firefox"
				: "Chrome"
			}`
		);
		const baseBrowser = browserName === "firefox" ? firefox : chromium;
		const browserType = withExtension(baseBrowser, pathToExtension);
		const context = await browserType.launchPersistentContext("", {
			acceptDownloads: true,
			downloadsPath: join(cwd(), "playwright-downloads"),
			headless: false
		});
		await use(context);
		await context.close();
	},
	page: async ({ context }, use) => {
		let [page] = context.pages();
		if (!page) page = await context.newPage();
		for (const p of context.pages()) {
			if (p !== page) await p.close().catch(() => {});
		}
		await use(page);
	}
});
export const optionsTest = base.extend<{
	context: BrowserContext;
	extensionId: string;
	page: Page;
}>({
	context: async ({ browserName }, use) => {
		const pathToExtension = join(
			cwd(),
			`dist/${
				browserName === "chromium" ? "Chrome"
				: browserName === "firefox" ? "Firefox"
				: "Chrome"
			}`
		);
		const baseBrowser = browserName === "firefox" ? firefox : chromium;
		const browserType = withExtension(baseBrowser, pathToExtension);
		const context = await browserType.launchPersistentContext("", {
			acceptDownloads: true,
			downloadsPath: join(cwd(), "playwright-downloads"),
			headless: false
		});
		await use(context);
		await context.close();
	},
	extensionId: async ({ browserName, context }, use) => {
		switch (browserName) {
			case "chromium": {
				let [background] = context.serviceWorkers();
				if (!background) background = await context.waitForEvent("serviceworker");
				const [, , extensionId] = background.url().split("/");
				await use(extensionId);
				break;
			}
			case "firefox": {
				const extensionId = "{c49b13b1-5dee-4345-925e-0c793377e3fa}";
				await use(extensionId);
				break;
			}
			case "webkit":
				return;
		}
	},
	page: async ({ browserName, context, extensionId }, use) => {
		const extensionProtocol = browserName === "firefox" ? "moz-extension" : "chrome-extension";
		const page = await context.newPage();
		await page.goto(`${extensionProtocol}://${extensionId}/src/pages/options/index.html`);
		await page.waitForLoadState();
		await use(page);
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
				...devices["Desktop Chrome"],
				permissions: ["clipboard-read", "clipboard-write"]
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
	reporter: process.env.CI ? "dot" : "html",
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	testDir: ".",
	timeout: process.env.CI ? 30 * 1000 : 60 * 1000 * 1,
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
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
