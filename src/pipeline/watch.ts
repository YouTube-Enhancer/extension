import { config } from "dotenv";
import { type FSWatcher, watch as watchFs } from "fs";
import { resolve } from "path";
import { type Rolldown, build as viteBuild } from "vite";

import type { Browser } from "@/src/utils/plugins/utils";

import updateAvailableLocales from "@/src/i18n/updateAvailableLocales";
import { DEV_RELOAD_PORT } from "@/src/utils/dev/hotReload";
import terminalColorLog from "@/src/utils/logging";
import { browsers, copyDirectorySync, emptyOutputFolder, outDir, publicDir, rootDir, srcDir } from "@/src/utils/plugins/utils";

import { buildFinished, buildStarted, emitRebuild, newBuildId, type RebuildEvent } from "./devEvents";
import { startHmrServer } from "./hmrServer";
import { startHotReloadServer } from "./hotReloadServer";
import { buildContentScripts } from "./steps/buildContentScripts";
import generateLocaleTypes from "./steps/generateLocaleTypes";
import generateManifests from "./steps/generateManifests";
import { loadFeatureMetadata } from "./steps/loadFeatureMetadata";
import updateReadmeFeatures from "./steps/updateReadmeFeatures";
import validateFeatureMetadata from "./steps/validateFeatureMetadata";
import { timedStep } from "./utils";

config();

export type WatchOptions = {
	hmr: boolean;
	hotReload: boolean;
	target: Browser["type"];
};

/** Editors often write a file twice per save; without a delay each write started its own rebuild. */
export const WATCH_BUILD_DELAY_MS = 100;

export function parseWatchArgs(argv: string[]): WatchOptions {
	const targetIndex = argv.indexOf("--target");
	const target = targetIndex === -1 ? "chrome" : argv[targetIndex + 1];
	if (target !== "chrome" && target !== "firefox") {
		throw new Error(`Unknown --target "${target}"; use chrome or firefox`);
	}
	/** Firefox has no localhost allowance in its extension-page policy, so the pages cannot be served there. */
	return { hmr: !argv.includes("--no-hmr") && target === "chrome", hotReload: !argv.includes("--no-hot-reload"), target };
}

/**
 * Keeps both Vite builds running and writes straight into one browser folder, so a save costs an incremental rebuild
 * instead of the full release pipeline. The release-only steps (locale checks, ZIPs, output copies) do not run here;
 * the README feature list still does, because it is a tracked file that must change with the feature that changes it.
 * With hot reload on, every rebuild is pushed to the loaded extension, which applies it without a page reload where
 * it can (see `hotReloadServer.ts`). With HMR on, the React pages are served from a Vite dev server instead of the
 * build (see `hmrServer.ts`).
 */
export async function startWatch(argv: string[]): Promise<void> {
	const { hmr, hotReload, target } = parseWatchArgs(argv);
	const browser = browsers.find((candidate) => candidate.type === target);
	if (!browser) throw new Error(`No build target of type ${target}`);
	const targetDir = resolve(outDir, browser.name);
	const chunkDir = resolve(targetDir, "src");
	log(`Development watch mode for ${browser.name}. Load ${targetDir} as an unpacked extension.`);

	await timedStep("Clearing output folder", () => emptyOutputFolder());
	await timedStep("Validating feature metadata", () => validateFeatureMetadata());
	await timedStep("Updating available locales", () => updateAvailableLocales());
	await timedStep("Generating locale types", () => generateLocaleTypes());
	copyDirectorySync(publicDir, targetDir);

	const hmrServer = hmr ? await startHmrServer() : null;
	let manifestJson = "";
	const writeManifest = () => {
		const [json] = Object.values(
			generateManifests({ chunkDir, patch: hmrServer ? (manifest) => hmrServer.patchManifest(manifest) : undefined, targets: [browser] })
		);
		const changed = manifestJson !== "" && json !== manifestJson;
		manifestJson = json;
		return changed;
	};
	writeManifest();
	await updateReadmeFeatures();

	const hotReloadServer =
		hotReload ? startHotReloadServer({ announcePages: !hmr, port: Number(process.env.YTE_DEV_RELOAD_PORT) || DEV_RELOAD_PORT, targetDir }) : null;
	/** Tells the bundles which port this pipeline actually listens on (a number, so it is not inlined as a string); see `devReloadPort()`. */
	const define = { __YTE_DEV_RELOAD_PORT__: (await hotReloadServer?.ready) ?? DEV_RELOAD_PORT };

	const pagesWatcher = (await viteBuild({
		build: { outDir: targetDir, watch: { buildDelay: WATCH_BUILD_DELAY_MS } },
		configFile: resolve(rootDir, "vite.config.ts"),
		define,
		logLevel: "warn"
	})) as Rolldown.RolldownWatcher;
	const [contentWatcher, embeddedWatcher] = await buildContentScripts({
		define,
		logLevel: "warn",
		outDir: targetDir,
		singleFileEmbedded: true,
		watch: { buildDelay: WATCH_BUILD_DELAY_MS }
	});
	attach("pages", pagesWatcher, () => hmrServer?.writeHtml(targetDir));
	attach("content", contentWatcher);
	attach("embedded", embeddedWatcher, () => {
		if (writeManifest()) announce("manifest");
	});

	const fsWatchers: FSWatcher[] = [
		watchDirectory(publicDir, () => {
			copyDirectorySync(publicDir, targetDir);
			generateLocaleTypes();
			const manifestChanged = writeManifest();
			void updateReadmeFeatures();
			log("public/ copied (a new locale file needs a restart to be listed in the manifest)");
			announce(manifestChanged ? "manifest" : "public");
		}),
		watchDirectory(
			resolve(srcDir, "features"),
			async () => {
				try {
					await loadFeatureMetadata({ fresh: true });
					await validateFeatureMetadata();
					await updateReadmeFeatures();
				} catch (error) {
					terminalColorLog(`Feature metadata: ${error instanceof Error ? error.message : String(error)}`, "error");
				}
			},
			(file) => file.endsWith("index.metadata.ts")
		)
	];

	const shutdown = async () => {
		log("Stopping...");
		for (const watcher of fsWatchers) watcher.close();
		await Promise.all([pagesWatcher.close(), contentWatcher.close(), embeddedWatcher.close(), hotReloadServer?.close(), hmrServer?.close()]);
		process.exit(0);
	};
	process.on("SIGINT", () => void shutdown());
	process.on("SIGTERM", () => void shutdown());
}

function announce(bundle: RebuildEvent["bundle"], durationMs = 0): void {
	emitRebuild({ buildId: newBuildId(), bundle, durationMs });
}

function attach(bundle: "content" | "embedded" | "pages", watcher: Rolldown.RolldownWatcher, afterBuild?: () => void): void {
	watcher.on("event", (event) => {
		if (event.code === "BUNDLE_START") {
			buildStarted();
		} else if (event.code === "BUNDLE_END") {
			afterBuild?.();
			const durationMs = Math.round(event.duration);
			log(`${bundle} built in ${durationMs} ms`);
			buildFinished();
			announce(bundle, durationMs);
		} else if (event.code === "ERROR") {
			buildFinished();
			terminalColorLog(`${bundle} build failed: ${event.error.message}`, "error");
		}
	});
}

function log(message: string): void {
	console.log(`[Dev] ${message}`);
}

/** Recursive directory watch with a short debounce; Node's own watcher fires several events per save. */
function watchDirectory(directory: string, onChange: () => Promise<void> | void, filter: (file: string) => boolean = () => true): FSWatcher {
	let timer: NodeJS.Timeout | undefined;
	return watchFs(directory, { recursive: true }, (_eventType, fileName) => {
		if (fileName && !filter(String(fileName).replace(/\\/g, "/"))) return;
		clearTimeout(timer);
		timer = setTimeout(() => void onChange(), 200);
	});
}
