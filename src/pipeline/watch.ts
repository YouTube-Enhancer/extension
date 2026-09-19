import { config } from "dotenv";
import { type FSWatcher, watch as watchFs } from "fs";
import { resolve } from "path";
import { type Rolldown, build as viteBuild } from "vite";

import type { Browser } from "@/src/utils/plugins/utils";

import updateAvailableLocales from "@/src/i18n/updateAvailableLocales";
import terminalColorLog from "@/src/utils/logging";
import { browsers, copyDirectorySync, emptyOutputFolder, outDir, publicDir, rootDir, srcDir } from "@/src/utils/plugins/utils";

import { buildContentScripts } from "./steps/buildContentScripts";
import generateLocaleTypes from "./steps/generateLocaleTypes";
import generateManifests from "./steps/generateManifests";
import { loadFeatureMetadata } from "./steps/loadFeatureMetadata";
import updateReadmeFeatures from "./steps/updateReadmeFeatures";
import validateFeatureMetadata from "./steps/validateFeatureMetadata";
import { timedStep } from "./utils";

config();

export type BundleName = "content" | "embedded" | "pages";

export type RebuildEvent = {
	buildId: string;
	bundle: BundleName;
	durationMs: number;
};

export type WatchOptions = {
	target: Browser["type"];
};

type RebuildListener = (event: RebuildEvent) => void;

/** Editors often write a file twice per save; without a delay each write started its own rebuild. */
export const WATCH_BUILD_DELAY_MS = 100;

const rebuildListeners = new Set<RebuildListener>();

/** Called after every completed rebuild, once the output on disk is consistent (manifest included). */
export function onRebuild(listener: RebuildListener): () => void {
	rebuildListeners.add(listener);
	return () => rebuildListeners.delete(listener);
}

export function parseWatchArgs(argv: string[]): WatchOptions {
	const targetIndex = argv.indexOf("--target");
	const target = targetIndex === -1 ? "chrome" : argv[targetIndex + 1];
	if (target !== "chrome" && target !== "firefox") {
		throw new Error(`Unknown --target "${target}"; use chrome or firefox`);
	}
	return { target };
}

/**
 * Keeps both Vite builds running and writes straight into one browser folder, so a save costs an incremental rebuild
 * instead of the full release pipeline. The release-only steps (locale checks, ZIPs, output copies) do not run here;
 * the README feature list still does, because it is a tracked file that must change with the feature that changes it.
 */
export async function startWatch(argv: string[]): Promise<void> {
	const { target } = parseWatchArgs(argv);
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
	const writeManifest = () => generateManifests({ chunkDir, targets: [browser] });
	writeManifest();
	await updateReadmeFeatures();

	const pagesWatcher = (await viteBuild({
		build: { outDir: targetDir, watch: { buildDelay: WATCH_BUILD_DELAY_MS } },
		configFile: resolve(rootDir, "vite.config.ts"),
		logLevel: "warn"
	})) as Rolldown.RolldownWatcher;
	const [contentWatcher, embeddedWatcher] = await buildContentScripts({
		logLevel: "warn",
		outDir: targetDir,
		singleFileEmbedded: true,
		watch: { buildDelay: WATCH_BUILD_DELAY_MS }
	});
	attach("pages", pagesWatcher);
	attach("content", contentWatcher);
	attach("embedded", embeddedWatcher, writeManifest);

	const fsWatchers: FSWatcher[] = [
		watchDirectory(publicDir, () => {
			copyDirectorySync(publicDir, targetDir);
			generateLocaleTypes();
			writeManifest();
			void updateReadmeFeatures();
			log("public/ copied (a new locale file needs a restart to be listed in the manifest)");
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
		await Promise.all([pagesWatcher.close(), contentWatcher.close(), embeddedWatcher.close()]);
		process.exit(0);
	};
	process.on("SIGINT", () => void shutdown());
	process.on("SIGTERM", () => void shutdown());
}

function attach(bundle: BundleName, watcher: Rolldown.RolldownWatcher, afterBuild?: () => void): void {
	watcher.on("event", (event) => {
		if (event.code === "BUNDLE_END") {
			afterBuild?.();
			const rebuild: RebuildEvent = { buildId: newBuildId(), bundle, durationMs: Math.round(event.duration) };
			log(`${bundle} built in ${rebuild.durationMs} ms`);
			for (const listener of rebuildListeners) listener(rebuild);
		} else if (event.code === "ERROR") {
			terminalColorLog(`${bundle} build failed: ${event.error.message}`, "error");
		}
	});
}

function log(message: string): void {
	console.log(`[Dev] ${message}`);
}

function newBuildId(): string {
	return Date.now().toString(36);
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
