import type { PluginOption } from "vite";

import { resolve } from "path";
import { build } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

import { ENABLE_SOURCE_MAP } from "../constants";
import { assetsDir, componentsDir, hooksDir, outDir, pagesDir, srcDir, utilsDir } from "./utils";
const packages: { [entryAlias: string]: string }[] = [
	{
		content: resolve(__dirname, "../../../", "src/pages/content/index.ts")
	},
	{
		embedded: resolve(__dirname, "../../../", "src/pages/embedded/index.ts")
	}
];
export default function buildContentScript(): PluginOption {
	return {
		async buildEnd() {
			for (const _package of packages) {
				await build({
					build: {
						emptyOutDir: false,
						outDir: resolve(outDir, "temp"),
						rollupOptions: {
							input: _package,
							output: {
								entryFileNames: (chunk) => {
									return `src/pages/${chunk.name}/index.js`;
								}
							}
						},
						sourcemap: ENABLE_SOURCE_MAP
					},
					configFile: false,
					plugins: [cssInjectedByJsPlugin()],
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
			}
		},
		name: "build-content"
	};
}
