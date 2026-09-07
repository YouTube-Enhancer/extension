import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";
import { defineConfig } from "vite";

import { DEV_MODE, ENABLE_SOURCE_MAP } from "./src/utils/config/env";
import bundleWorker from "./src/utils/plugins/bundle-worker";
import { assetsDir, componentsDir, hooksDir, outDir, pagesDir, srcDir, utilsDir } from "./src/utils/plugins/utils";

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

// COVERAGE_BUILD=true keeps the bundles readable and gives them inline source maps, for a coverage run of the e2e suite.
const COVERAGE_BUILD = process.env.COVERAGE_BUILD === "true";

export default defineConfig({
	build: {
		emptyOutDir: false,
		minify: !DEV_MODE && !COVERAGE_BUILD ? "esbuild" : false,
		modulePreload: false,
		outDir: resolve(outDir, "temp"),
		rollupOptions: {
			input: pageInputs,
			output: {
				assetFileNames: (chunk) => `src/${chunk.name}`,
				chunkFileNames: (chunk) => `src/${chunk.name}.js`,
				entryFileNames: (chunk) => {
					const { name } = chunk;
					if (name === "devtools") return "src/pages/devtools/index.js";
					if (name === "devtools_panel") return "src/pages/devtools/panel.js";
					return `src/pages/${name}/index.js`;
				},
				manualChunks(id: string) {
					if (id.includes("node_modules")) {
						const [module] = id.split("node_modules/")[1].split("/");
						return `vendor/${module.split("/")[0]}`;
					}
					if (id.includes("featureMetadataRegistry")) return "featureMetadataRegistry";
				}
			},
			treeshake: {
				moduleSideEffects: true,
				preset: "smallest",
				propertyReadSideEffects: true,
				tryCatchDeoptimization: true
			}
		},
		sourcemap: COVERAGE_BUILD ? "inline" : ENABLE_SOURCE_MAP
	},
	esbuild: {
		keepNames: true,
		minifyIdentifiers: !DEV_MODE && !COVERAGE_BUILD,
		minifySyntax: !DEV_MODE && !COVERAGE_BUILD,
		minifyWhitespace: !DEV_MODE && !COVERAGE_BUILD
	},
	mode: DEV_MODE ? "development" : "production",
	plugins: [react(), bundleWorker()],
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
			"monaco-editor/esm": resolve(__dirname, "node_modules/monaco-editor/esm")
		}
	}
});
