import type { Plugin } from "vite";

import { buildSync } from "esbuild";
import { basename } from "path";

export default function vitePluginBundleWorker(): Plugin {
	return {
		apply: "build",
		configResolved(config) {
			// Remove the built-in Vite worker plugin in place (read-only array)
			const plugins = config.plugins as Plugin[];
			const index = plugins.findIndex((p) => p.name === "vite:worker");
			if (index !== -1) plugins.splice(index, 1);
		},
		enforce: "pre",
		name: "vite-plugin-bundle-worker",
		transform(_code: string, id: string) {
			// Only process files ending with '?worker'
			if (!id.endsWith("?worker")) return null;

			// Remove '?worker' from id
			const workerPath = id.replace(/\?[\w-]+$/, "");

			// Bundle the worker code with esbuild
			const result = buildSync({
				bundle: true,
				entryPoints: [workerPath],
				minify: true,
				write: false
			});

			const {
				outputFiles: [{ text: bundledCode }]
			} = result;

			// Emit the bundled worker as an asset in the "assets/" folder
			const fileName = `src/vendor/${basename(workerPath)}`;
			const url = this.emitFile({
				fileName,
				source: bundledCode,
				type: "asset"
			});

			// Return code that exports a Worker constructor
			return {
				code: `
					export default function() {
						return new Worker("__VITE_ASSET__${url}__", { type: "module" });
					}
				`,
				map: null
			};
		}
	};
}
