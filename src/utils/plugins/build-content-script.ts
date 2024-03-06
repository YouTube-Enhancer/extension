import type { PluginOption } from "vite";

import { resolve } from "path";
import { build } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

import { ENABLE_SOURCE_MAP, outputFolderName } from "../constants";
const packages: { [entryAlias: string]: string }[] = [
	{
		content: resolve(__dirname, "../../../", "src/pages/content/index.tsx")
	},
	{
		inject: resolve(__dirname, "../../../", "src/pages/inject/index.tsx")
	}
];
const root = resolve("src");
const pagesDir = resolve(root, "pages");
const assetsDir = resolve(root, "assets");
const componentsDir = resolve(root, "components");
const utilsDir = resolve(root, "utils");
const hooksDir = resolve(root, "hooks");

const outDir = resolve(__dirname, "../../../", outputFolderName);
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
							"@/src": root,
							"@/utils": utilsDir
						}
					}
				});
			}
		},
		name: "build-content"
	};
}
