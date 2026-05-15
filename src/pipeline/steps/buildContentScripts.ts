import { resolve } from "path";
import { build } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

import { DEV_MODE, ENABLE_SOURCE_MAP } from "@/src/utils/config/env";
import { assetsDir, componentsDir, hooksDir, outDir, pagesDir, srcDir, utilsDir } from "@/utils/plugins/utils";
const contentScripts = [
	{
		content: resolve(process.cwd(), "src/pages/content/index.ts")
	},
	{
		embedded: resolve(process.cwd(), "src/pages/embedded/index.ts")
	}
] as const;
for (const contentScript of contentScripts) {
	await build({
		build: {
			emptyOutDir: false,
			minify: !DEV_MODE ? "esbuild" : false,
			outDir: resolve(outDir, "temp"),
			rollupOptions: {
				input: contentScript,
				output: {
					assetFileNames: (chunk) => `src/${chunk.name}`,
					chunkFileNames: (chunk) => `src/${chunk.name}.js`,
					entryFileNames: (chunk) => {
						return `src/pages/${chunk.name}/index.js`;
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
		configFile: false,
		esbuild: {
			keepNames: true,
			minifyIdentifiers: !DEV_MODE,
			minifySyntax: !DEV_MODE,
			minifyWhitespace: !DEV_MODE
		},
		mode: DEV_MODE ? "development" : "production",
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
