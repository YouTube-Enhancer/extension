import { GetInstalledBrowsers } from "get-installed-browsers";
import { resolve } from "path";
import { build } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

import { outputFolderName } from "../constants";
import terminalColorLog from "../log";

import type { PluginOption } from "vite";
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
		name: "build-content",
		async buildEnd() {
			const browsers = GetInstalledBrowsers();
			for (const browser of browsers) {
				for (const _package of packages) {
					await build({
						resolve: {
							alias: {
								"@/src": root,
								"@/assets": assetsDir,
								"@/pages": pagesDir,
								"@/components": componentsDir,
								"@/utils": utilsDir,
								"@/hooks": hooksDir
							}
						},
						publicDir: false,
						plugins: [cssInjectedByJsPlugin()],
						build: {
							outDir: resolve(outDir, browser.name),
							sourcemap: process.env.__DEV__ === "true" ? "inline" : false,
							emptyOutDir: false,
							rollupOptions: {
								input: _package,
								output: {
									entryFileNames: (chunk) => {
										return `src/pages/${chunk.name}/index.js`;
									}
								}
							}
						},
						configFile: false
					});
				}
				terminalColorLog(`Content code build successfully for ${browser.name}`, "success");
			}
		}
	};
}
