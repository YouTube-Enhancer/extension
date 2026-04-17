import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";
import { defineConfig } from "vite";

import { DEV_MODE, ENABLE_SOURCE_MAP } from "./src/utils/constants";
import bundleWorker from "./src/utils/plugins/bundle-worker";
import { assetsDir, componentsDir, hooksDir, outDir, pagesDir, srcDir, utilsDir } from "./src/utils/plugins/utils";

const pageInputs = {
	background: resolve(pagesDir, "background", "index.html"),
	options: resolve(pagesDir, "options", "index.html"),
	popup: resolve(pagesDir, "popup", "index.html")
};

export default defineConfig({
	build: {
		emptyOutDir: false,
		minify: "esbuild",
		modulePreload: false,
		outDir: resolve(outDir, "temp"),
		rollupOptions: {
			input: pageInputs,
			output: {
				assetFileNames: (chunk) => `src/${chunk.name}`,
				chunkFileNames: (chunk) => `src/${chunk.name}.js`,
				entryFileNames: (chunk) => `src/pages/${chunk.name}/index.js`,
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
		sourcemap: ENABLE_SOURCE_MAP
	},
	esbuild: {
		keepNames: true,
		minifyIdentifiers: true,
		minifySyntax: true,
		minifyWhitespace: true
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
			"@/utils": utilsDir
		}
	}
});
