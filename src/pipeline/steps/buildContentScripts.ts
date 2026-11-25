import { resolve } from "path";
import { pathToFileURL } from "url";
import { build, type LogLevel, type Rolldown } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

import { DEV_MODE, ENABLE_SOURCE_MAP } from "@/src/utils/config/env";
import { EMBEDDED_STYLE_ID } from "@/src/utils/dev/hotReload";
import {
	assetsDir,
	componentsDir,
	hooksDir,
	outDir,
	pagesDir,
	srcDir,
	utilsDir
} from "@/src/utils/plugins/utils";

export type ContentScriptBuildOptions = {
	/** Extra compile-time constants, e.g. the hot-reload port in watch mode. */
	define?: Record<string, number | string>;
	logLevel?: LogLevel;
	/** Output folder. The release pipeline builds into `dist/temp`; the watch pipeline builds straight into its target. */
	outDir?: string;
	/** Keep building on change; one watcher per bundle is returned in `contentScripts` order. */
	watch?: Rolldown.WatcherOptions;
};

const contentScripts = [
	{
		/** The manifest loads the content script as a classic script, so it must stay one file without ES imports. */
		codeSplitting: false,
		entry: "content",
		format: "es" as const
	},
	{
		/**
		 * The embedded bundle reaches the page world as a classic script injected by
		 * `chrome.scripting.executeScript({ world: "MAIN", files: [...] })` (Chrome ≥157 refuses
		 * the page-initiated `chrome-extension://` module tag), so it must be one self-contained
		 * IIFE: no top-level `import`, no sibling chunks, and every lazy feature chunk inlined —
		 * there is no module map to resolve them against on youtube.com. Code splitting is off
		 * because IIFE output cannot be split; the single file also removes the chunk-boundary
		 * ordering hazard (feature metadata evaluating before the constants it enumerates).
		 */
		entry: "embedded",
		format: "iife" as const
	}
];

export async function buildContentScripts({
	define,
	logLevel,
	outDir: targetDir = resolve(outDir, "temp"),
	watch
}: ContentScriptBuildOptions = {}): Promise<Rolldown.RolldownWatcher[]> {
	const watchers: Rolldown.RolldownWatcher[] = [];
	for (const { codeSplitting, entry, format } of contentScripts) {
		const result = await build({
			build: {
				emptyOutDir: false,
				minify: !DEV_MODE ? "oxc" : false,
				/**
				 * The embedded script runs inside youtube.com, where Vite's preload links for dynamic imports resolve
				 * against the page URL. Each import then fired a 404 at youtube.com/src/<chunk>.js before the real import
				 * ran.
				 */
				modulePreload: false,
				outDir: targetDir,
				reportCompressedSize: false,
				rolldownOptions: {
					input: { [entry]: resolve(process.cwd(), `src/pages/${entry}/index.ts`) },
					/**
					 * File names stay hash-free so store reviewers can compare a rebuild with the uploaded package. Chunks
					 * land in `src/*.js`, which the manifest step lists as web-accessible resources; the pages build keeps
					 * its own chunks under `src/chunks/` so the two parallel builds never write the same file.
					 */
					output: {
						assetFileNames: "src/[name][extname]",
						chunkFileNames: (chunk) => `src/${chunk.name}.js`,
						codeSplitting,
						entryFileNames: (chunk) => {
							return `src/pages/${chunk.name}/index.js`;
						},
						/** The embedded entry's IIFE is the classic-script delivery path (see the entry comment). */
						format,
						keepNames: true
					},
					treeshake: {
						moduleSideEffects: true,
						unknownGlobalSideEffects: false
					}
				},
				sourcemap: ENABLE_SOURCE_MAP,
				watch: watch ?? null
			},
			configFile: false,
			define,
			logLevel,
			mode: DEV_MODE ? "development" : "production",
			plugins: [
				cssInjectedByJsPlugin({
					attributes: { id: EMBEDDED_STYLE_ID },
					topExecutionPriority: true
				})
			],
			publicDir: false,
			resolve: {
				alias: {
					"@/assets": assetsDir,
					"@/components": componentsDir,
					"@/hooks": hooksDir,
					"@/pages": pagesDir,
					"@/src": srcDir,
					"@/utils": utilsDir
				}
			}
		});
		if (watch) watchers.push(result as Rolldown.RolldownWatcher);
	}
	return watchers;
}

/** `pnpm run build:client` runs this file directly; the pipeline imports the function instead. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	await buildContentScripts();
}
