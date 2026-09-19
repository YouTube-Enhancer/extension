import type { Plugin } from "vite";

import { basename } from "path";

const prefix = "\0yte-worker:";

/**
 * Serve-mode counterpart of the build's `?worker` handling. Under the dev server such an import would create the
 * worker from the server's origin, and an extension page may not run a cross-origin worker. The watch pipeline's
 * build keeps emitting the workers into `src/chunks/vendor/` under fixed names, so a page served with HMR creates
 * them from the extension's own URL instead.
 */
export default function extensionServedWorkers(): Plugin {
	return {
		apply: "serve",
		enforce: "pre",
		load(id) {
			if (!id.startsWith(prefix)) return null;
			const file = id.slice(prefix.length);
			return `export default function () {\n\treturn new Worker(chrome.runtime.getURL("src/chunks/vendor/${file}"), { type: "module" });\n}\n`;
		},
		name: "yte:extension-served-workers",
		resolveId(source) {
			if (!source.endsWith("?worker")) return null;
			return prefix + basename(source.slice(0, -"?worker".length));
		}
	};
}
