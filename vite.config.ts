import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";
import { defineConfig } from "vite";

import checkLocalesForMissingKeys from "./src/utils/checkLocalesForMissingKeys";
import buildContentScript from "./src/utils/plugins/build-content-script";
import copyBuild from "./src/utils/plugins/copy-build";
import copyPublic from "./src/utils/plugins/copy-public";
import makeManifest from "./src/utils/plugins/make-manifest";
import makeReleaseZips from "./src/utils/plugins/make-release-zips";
import { assetsDir, componentsDir, emptyOutputFolder, hooksDir, outDir, pagesDir, srcDir, utilsDir } from "./src/utils/plugins/utils";
import updateAvailableLocales from "./src/utils/updateAvailableLocales";
import updateLocalePercentages from "./src/utils/updateLocalePercentages";

export default function build() {
	emptyOutputFolder();
	void updateAvailableLocales();
	void checkLocalesForMissingKeys();
	void updateLocalePercentages();
	return defineConfig({
		build: {
			emptyOutDir: false,
			outDir: resolve(outDir, "temp"),
			rollupOptions: {
				input: {
					background: resolve(pagesDir, "background", "index.ts"),
					options: resolve(pagesDir, "options", "index.html"),
					popup: resolve(pagesDir, "popup", "index.html")
				},
				output: {
					entryFileNames: (chunk) => {
						return `src/pages/${chunk.name}/index.js`;
					}
				}
			},
			sourcemap: process.env.__DEV__ === "true" ? "inline" : false
		},
		plugins: [react(), makeManifest(), buildContentScript(), copyPublic(), copyBuild(), makeReleaseZips()],
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
