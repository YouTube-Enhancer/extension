import type { Plugin } from "vite";

const workerManagerFile = /monaco-editor\/esm\/vs\/languages\/features\/(?:css|html|json|typescript)\/workerManager\.js$/;
const workerFallback =
	/createWorker:\s*\(\)\s*=>\s*new Worker\(new URL\((['"])[a-z]+\.worker\.js\1,\s*import\.meta\.url\),\s*\{\s*type:\s*(['"])module\2\s*\}\)/;

/**
 * Monaco's `editor.main` registers every language, and each language's worker manager carries a
 * `createWorker: () => new Worker(new URL("<language>.worker.js", import.meta.url))` fallback. Vite bundles every such
 * reference eagerly, which would ship the TypeScript, HTML and JSON workers (about 8 MB) in an extension whose only
 * editor edits CSS. Monaco calls `MonacoEnvironment.getWorker` first (`vs/internal/common/workers.js`) and
 * `editorWorkerConfig.ts` answers for every label, so the fallbacks never run. This removes them before Vite's worker
 * plugin sees them, and fails the build if Monaco changes their shape, so an upgrade cannot bring the workers back
 * unnoticed.
 */
export default function stripMonacoWorkerFallbacks(): Plugin {
	return {
		enforce: "pre",
		name: "yte:strip-monaco-worker-fallbacks",
		transform(code, id) {
			const [file] = id.replace(/\\/g, "/").split("?");
			if (!workerManagerFile.test(file)) return null;
			if (!workerFallback.test(code)) {
				this.error(`Monaco's worker fallback in ${file} no longer matches; update strip-monaco-worker-fallbacks.ts`);
			}
			return {
				code: code.replace(workerFallback, 'createWorker: () => { throw new Error("MonacoEnvironment.getWorker must provide this worker"); }'),
				map: { mappings: "" }
			};
		}
	};
}
