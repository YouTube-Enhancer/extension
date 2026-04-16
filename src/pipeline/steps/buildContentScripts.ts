import { resolve } from "path";
import { build } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

import { ENABLE_SOURCE_MAP } from "@/src/utils/constants";

import { assetsDir, componentsDir, hooksDir, outDir, pagesDir, srcDir, utilsDir } from "../../utils/plugins/utils";
const contentScripts = [
	{
		content: resolve(process.cwd(), "src/pages/content/index.ts")
	},
	{
		embedded: resolve(process.cwd(), "src/pages/embedded/index.ts")
	}
] as const;
export async function buildContentScripts(): Promise<void> {
	for (const contentScript of contentScripts) {
		await build({
			build: {
				emptyOutDir: false,
				outDir: resolve(outDir, "temp"),
				rollupOptions: {
					input: contentScript,
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
}
