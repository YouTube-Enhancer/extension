import { resolve } from "path";
import { pathToFileURL } from "url";
import { build, type LogLevel, type Rolldown } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

import { DEV_MODE, ENABLE_SOURCE_MAP } from "@/src/utils/config/env";
import { assetsDir, componentsDir, hooksDir, outDir, pagesDir, srcDir, utilsDir } from "@/utils/plugins/utils";

export type ContentScriptBuildOptions = {
	logLevel?: LogLevel;
	/** Output folder. The release pipeline builds into `dist/temp`; the watch pipeline builds straight into its target. */
	outDir?: string;
	/**
	 * Emit the embedded script as one file. The watch pipeline re-injects it into open YouTube tabs with a fresh query
	 * string, and a document's ES module map would otherwise keep serving the old chunks by their unchanged URLs.
	 */
	singleFileEmbedded?: boolean;
	/** Keep building on change; one watcher per bundle is returned in `contentScripts` order. */
	watch?: Rolldown.WatcherOptions;
};

const contentScripts = [
	{
		/** The manifest loads the content script as a classic script, so it must stay one file without ES imports. */
		codeSplitting: false,
		entry: "content"
	},
	{
		codeSplitting: {
			/**
			 * Every feature chunk imports its own `index.metadata.ts`, which the eagerly loaded metadata registry imports
			 * as well. Left to itself, Rolldown emits one tiny chunk per such shared module; this keeps all feature
			 * metadata in one chunk, as the entry already loads it.
			 */
			groups: [{ name: "featureMetadata", test: /[\\/]index\.metadata\.ts$/ }],
			/**
			 * Keep the metadata modules' own imports (schemas, constants such as the deep-dark presets) in the same chunk.
			 * With this off, Rolldown split those constants into a chunk that also imported this one, and the metadata ran
			 * before the constants existed ("Cannot convert undefined or null to object" from zod's enum).
			 */
			includeDependenciesRecursively: true
		},
		entry: "embedded"
	}
];

export async function buildContentScripts({
	logLevel,
	outDir: targetDir = resolve(outDir, "temp"),
	singleFileEmbedded = false,
	watch
}: ContentScriptBuildOptions = {}): Promise<Rolldown.RolldownWatcher[]> {
	const watchers: Rolldown.RolldownWatcher[] = [];
	for (const { codeSplitting, entry } of contentScripts) {
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
						codeSplitting: singleFileEmbedded && entry === "embedded" ? false : codeSplitting,
						entryFileNames: (chunk) => {
							return `src/pages/${chunk.name}/index.js`;
						},
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
			logLevel,
			mode: DEV_MODE ? "development" : "production",
			plugins: [cssInjectedByJsPlugin({ topExecutionPriority: !ENABLE_SOURCE_MAP })],
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

/** `npm run build:client` runs this file directly; the pipeline imports the function instead. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	await buildContentScripts();
}
