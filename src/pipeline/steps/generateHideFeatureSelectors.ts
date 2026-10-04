import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "fs";
import { join, resolve } from "path";
import postcss from "postcss";

import { writeFormattedFile } from "@/src/utils/plugins/writeFormattedFile";

interface HideSelectorEntry {
	bodyClass: string;
	selectors: string[];
}

export default async function generateHideFeatureSelectors(): Promise<void> {
	const featuresDir = resolve(process.cwd(), "src/features");
	const outputDir = resolve(featuresDir, "__tests__", "__generated__");
	const outputFile = resolve(outputDir, "hideFeatureSelectors.ts");

	const allEntries: Record<string, HideSelectorEntry> = {};

	const featureDirs = readdirSync(featuresDir).filter(
		(name) => name.startsWith("hide") && statSync(join(featuresDir, name)).isDirectory()
	);

	for (const dirName of featureDirs) {
		const cssPath = join(featuresDir, dirName, "index.css");
		if (!existsSync(cssPath)) continue;

		const css = readFileSync(cssPath, "utf-8");
		const root = postcss.parse(css);
		const entries: HideSelectorEntry[] = [];

		root.walkRules((rule) => {
			const bodyMatch = rule.selector.match(/^body\.(yte-hide-[a-z0-9-]+(?::[^{]+)?)\s*$/);
			if (!bodyMatch) return;

			const [, bodyClass] = bodyMatch;
			const selectors: string[] = [];

			rule.walkRules((childRule) => {
				const hasDisplayNone = childRule.nodes?.some(
					(node) => node.type === "decl" && node.prop === "display" && node.value.includes("none")
				);
				if (!hasDisplayNone) return;

				const childSelectors = splitByTopLevelComma(childRule.selector)
					.map((s: string) => s.replace(/\n/g, " ").replace(/\s+/g, " ").trim())
					.map((s: string) => s.replace(/^&\s*/, "").trim())
					.filter(Boolean);

				selectors.push(...childSelectors);
			});

			if (selectors.length > 0) {
				entries.push({ bodyClass, selectors });
			}
		});

		if (entries.length === 0) continue;

		if (entries.length === 1) {
			const [first] = entries;
			allEntries[dirName] = first;
		} else {
			for (const entry of entries) {
				const section = extractSection(dirName, entry.bodyClass);
				allEntries[`${dirName}${capitalize(section)}`] = entry;
			}
		}
	}

	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true });
	}

	const output = generateTypeScriptOutput(allEntries);
	const written = await writeFormattedFile(outputFile, output);
	if (written) {
		console.log(`Generated ${outputFile}`);
	}
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function extractSection(dirName: string, bodyClass: string): string {
	const prefix = `yte-${dirName.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
	let suffix = bodyClass.slice(prefix.length);
	if (suffix.startsWith("-")) suffix = suffix.slice(1);
	return suffix;
}

function generateTypeScriptOutput(entries: Record<string, HideSelectorEntry>): string {
	const sorted = (Object.entries(entries) as [string, HideSelectorEntry][]).sort(([a], [b]) =>
		a.localeCompare(b)
	);
	const lines: string[] = [
		"// Auto-generated. Do not edit manually.",
		"export const hideFeatureSelectors = {"
	];
	for (const [idx, [key, { bodyClass, selectors }]] of sorted.entries()) {
		const isLast = idx === sorted.length - 1;
		const qSelectors = selectors.map((s: string) => quote(s)).join(", ");
		lines.push(`\t${key}: {`);
		lines.push(`\t\tbodyClass: ${quote(bodyClass)},`);
		lines.push(`\t\tselectors: [${qSelectors}]`);
		lines.push(`\t}${isLast ? "" : ","}`);
	}
	lines.push("} as const;");
	lines.push("");
	return lines.join("\n");
}

function quote(s: string): string {
	const hasDouble = s.includes('"');
	const hasSingle = s.includes("'");
	if (hasDouble && !hasSingle) return `'${s}'`;
	return JSON.stringify(s);
}

function splitByTopLevelComma(selector: string): string[] {
	const parts: string[] = [];
	let current = "";
	let parenDepth = 0;
	let bracketDepth = 0;

	for (const char of selector) {
		if (char === "(") parenDepth++;
		if (char === ")") parenDepth--;
		if (char === "[") bracketDepth++;
		if (char === "]") bracketDepth--;

		if (char === "," && parenDepth === 0 && bracketDepth === 0) {
			parts.push(current);
			current = "";
		} else {
			current += char;
		}
	}
	if (current.trim()) parts.push(current);
	return parts;
}
