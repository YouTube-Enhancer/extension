import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";
import { defineConfig } from "vite";

import { DEV_MODE, ENABLE_SOURCE_MAP } from "./src/utils/config/env.ts";
import stripMonacoWorkerFallbacks from "./src/utils/plugins/strip-monaco-worker-fallbacks.ts";
import { assetsDir, componentsDir, hooksDir, outDir, pagesDir, srcDir, utilsDir } from "./src/utils/plugins/utils.ts";

const pageInputs = {
	background: resolve(pagesDir, "background", "index.html"),
	options: resolve(pagesDir, "options", "index.html"),
	popup: resolve(pagesDir, "popup", "index.html"),
	...(DEV_MODE ?
		{
			devtools: resolve(pagesDir, "devtools", "index.html"),
			devtools_panel: resolve(pagesDir, "devtools", "panel.html")
		}
	:	{})
};

/**
 * Every emitted file name below is fixed and hash-free on purpose. Store reviewers rebuild the extension from source
 * and compare it file by file with the uploaded package, and content hashes differ between machines. Any new output
 * (workers included) must set explicit names too.
 *
 * Layout: entries stay at `src/pages/<page>/index.js`; everything else this build emits (shared chunks, vendor chunks,
 * workers, CSS, fonts) goes under `src/chunks/`. The content-script build (`buildContentScripts.ts`) writes its chunks
 * to `src/*.js` in the same output folder, and the two builds run in parallel, so they must not share a chunk folder:
 * both emit helper chunks with the same names (`rolldown-runtime.js`, `preload-helper.js`).
 */
export default defineConfig({
	build: {
		emptyOutDir: false,
		minify: !DEV_MODE ? "oxc" : false,
		modulePreload: false,
		outDir: resolve(outDir, "temp"),
		reportCompressedSize: false,
		rolldownOptions: {
			input: pageInputs,
			output: {
				assetFileNames: "src/chunks/[name][extname]",
				chunkFileNames: (chunk) => `src/chunks/${chunk.name}.js`,
				codeSplitting: {
					groups: [
						{ name: "featureMetadataRegistry", test: /featureMetadataRegistry/ },
						{
							name: (id) => {
								const normalised = id.replace(/\\/g, "/");
								const parts = normalised.split("node_modules/");
								const [firstSegment = ""] = parts[1]?.split("/") ?? [];
								// pnpm stores packages under node_modules/.pnpm/<name>@<version>/node_modules/<name>
								// so the real package name is in the segment after the second "node_modules/"
								if (firstSegment === ".pnpm") {
									const [realPkg = firstSegment] = parts[2]?.split("/") ?? [];
									return `vendor/${realPkg}`;
								}
								return `vendor/${firstSegment}`;
							},
							test: /node_modules/
						}
					],
					/**
					 * Keep each captured module's imports in the same chunk. Rolldown documents that disabling this produces
					 * circular chunks unless `strictExecutionOrder` is on; with it off, the embedded build once evaluated
					 * feature metadata before the constants it enumerates.
					 */
					includeDependenciesRecursively: true
				},
				entryFileNames: (chunk) => {
					const { name } = chunk;
					if (name === "devtools") return "src/pages/devtools/index.js";
					if (name === "devtools_panel") return "src/pages/devtools/panel.js";
					return `src/pages/${name}/index.js`;
				},
				keepNames: true
			},
			treeshake: {
				moduleSideEffects: true,
				propertyReadSideEffects: false,
				unknownGlobalSideEffects: false
			}
		},
		sourcemap: ENABLE_SOURCE_MAP
	},
	mode: DEV_MODE ? "development" : "production",
	plugins: [react(), stripMonacoWorkerFallbacks()],
	resolve: {
		alias: {
			"@/assets": assetsDir,
			"@/components": componentsDir,
			"@/hooks": hooksDir,
			"@/pages": pagesDir,
			"@/src": srcDir,
			"@/utils": utilsDir,
			/**
			 * The exports map of monaco-editor 0.56 breaks deep ESM imports by doubling the path, so its esm folder
			 * is resolved directly on disk.
			 */
			"monaco-editor/esm": resolve(import.meta.dirname, "node_modules/monaco-editor/esm")
		}
	},
	/** The Monaco `?worker` imports are bundled by Vite itself into one module worker each, under fixed names. */
	worker: {
		format: "es",
		rolldownOptions: {
			output: {
				assetFileNames: "src/chunks/vendor/[name][extname]",
				chunkFileNames: "src/chunks/vendor/[name].js",
				codeSplitting: false,
				entryFileNames: "src/chunks/vendor/[name].js"
			}
		}
	}
});
