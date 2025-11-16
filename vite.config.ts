import react from "@vitejs/plugin-react-swc";
import { config } from "dotenv";
import path, { resolve } from "path";
import { defineConfig } from "vite";

import checkLocalesForMissingKeys from "./src/utils/checkLocalesForMissingKeys";
import { ENABLE_SOURCE_MAP } from "./src/utils/constants";
import buildContentScript from "./src/utils/plugins/build-content-script";
import bundleWorker from "./src/utils/plugins/bundle-worker";
import copyBuild from "./src/utils/plugins/copy-build";
import copyPublic from "./src/utils/plugins/copy-public";
import makeManifest from "./src/utils/plugins/make-manifest";
import makeReleaseZips from "./src/utils/plugins/make-release-zips";
import replaceDevModeConst from "./src/utils/plugins/replace-dev-mode-const";
import { assetsDir, componentsDir, emptyOutputFolder, hooksDir, outDir, pagesDir, srcDir, utilsDir } from "./src/utils/plugins/utils";
import updateAvailableLocales from "./src/utils/updateAvailableLocales";
import updateLocalePercentages from "./src/utils/updateLocalePercentages";
config();

export default function build() {
	emptyOutputFolder();
	void updateAvailableLocales();
	if (process.env.__DEV__ !== "true") {
		void checkLocalesForMissingKeys();
		void updateLocalePercentages();
	}
	return defineConfig({
		build: {
			emptyOutDir: false,
			minify: "esbuild",
			modulePreload: false,
			outDir: resolve(outDir, "temp"),
			rollupOptions: {
				input: {
					background: resolve(pagesDir, "background", "index.html"),
					options: resolve(pagesDir, "options", "index.html"),
					popup: resolve(pagesDir, "popup", "index.html")
				},
				output: {
					assetFileNames: (chunk) => {
						return `assets/${chunk.name}`;
					},
					chunkFileNames: (chunk) => {
						return `assets/${chunk.name}.js`;
					},
					entryFileNames: (chunk) => {
						return `src/pages/${chunk.name}/index.js`;
					},
					manualChunks: (id) => {
						if (id.includes("node_modules/monaco-editor")) {
							const parts = id.split(path.posix.sep || path.sep);
							const vsIndex = parts.findIndex((part) => part === "vs");
							if (vsIndex >= 0 && parts.length > vsIndex + 1) {
								const { [vsIndex + 2]: folder } = parts;
								switch (folder) {
									case "browser":
										return "monaco-editor-browser";
									case "common":
										return "monaco-editor-common";
									case "contrib":
										return "monaco-editor-contrib";
									case "standalone":
										return "monaco-editor-standalone";
									default:
										return "monaco-editor-other";
								}
							}
							return "monaco-editor-other";
						}
						if (id.includes("node_modules")) return "vendor";
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
			minifyIdentifiers: false,
			minifySyntax: false,
			minifyWhitespace: true
		},
		plugins: [replaceDevModeConst(), bundleWorker(), react(), makeManifest(), buildContentScript(), copyPublic(), copyBuild(), makeReleaseZips()],
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
}
