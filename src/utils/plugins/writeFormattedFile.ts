import type { FormatConfig } from "oxfmt";

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { rootDir } from "@/src/utils/plugins/utils";

/**
 * Formats generated TypeScript with the project's oxfmt config before writing it, and writes only when the result
 * differs from what is on disk. The build used to spawn `oxlint --fix` and `prettier --write` on the generated locale
 * constants after every build instead, which cost about five seconds.
 *
 * @returns true when the file was written.
 */
export async function writeFormattedFile(filePath: string, code: string): Promise<boolean> {
	const { format } = await import("oxfmt");
	const { code: formatted } = await format(filePath, code, loadOxfmtOptions());
	const current = existsSync(filePath) ? readFileSync(filePath, "utf-8") : null;
	if (current === formatted) return false;
	writeFileSync(filePath, formatted);
	return true;
}

function loadOxfmtOptions(): FormatConfig {
	const configPath = join(rootDir, ".oxfmtrc.json");
	if (!existsSync(configPath)) return {};
	const parsed = JSON.parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
	delete parsed.$schema;
	delete parsed.ignorePatterns;
	delete parsed.overrides;
	return parsed;
}
