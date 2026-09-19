import { execFileSync } from "child_process";
import { existsSync, statSync } from "fs";
import { resolve } from "path";

import { rootDir } from "@/src/utils/plugins/utils";

/**
 * `public/locales/en-US.json.d.ts` is what `npm run typecheck` and the editor read; the bundles do not need it. It is
 * regenerated only when the source locale is newer, because `ts-json-as-const` is a CLI and costs a Node start.
 */
export default function generateLocaleTypes(): void {
	const source = resolve(rootDir, "public/locales/en-US.json");
	const output = `${source}.d.ts`;
	if (existsSync(output) && statSync(output).mtimeMs >= statSync(source).mtimeMs) return;
	execFileSync(process.execPath, [resolve(rootDir, "node_modules/ts-json-as-const/index.js"), source], { stdio: "inherit" });
}
