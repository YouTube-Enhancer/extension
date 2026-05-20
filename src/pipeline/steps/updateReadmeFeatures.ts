import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

import type { FeatureKeys, FeatureMetadata, FeatureSettingNode, SettingConfig } from "@/src/features/_registry/types";
import type { TSelectFunc } from "@/src/types";

import { isGroupNode, isSettingNode } from "@/src/features/_registry/types";
import { createT, safeResolve, type TFunction, type TranslationRoot } from "@/src/pipeline/utils";
import terminalColorLog from "@/src/utils/logging";

type FeatureData = {
	component: SettingConfig<FeatureKeys>["component"];
	id: string;
	label: string;
	missingLabel: boolean;
	missingTitle: boolean;
	options?: string[];
	section: string;
	settingId: string;
	title: string;
};

export default async function updateReadmeFeatures(): Promise<void> {
	const readmePath = resolve(process.cwd(), "README.md");
	const localesPath = resolve(process.cwd(), "public/locales/en-US.json");
	if (!existsSync(readmePath) || !existsSync(localesPath)) {
		terminalColorLog("updateReadmeFeatures: missing README or locales", "warning");
		return;
	}

	const translations = JSON.parse(readFileSync(localesPath, "utf-8")) as TranslationRoot;
	const t = createT(translations);

	const vite = await import("vite");
	const server = await vite.createServer({
		appType: "custom",
		logLevel: "error",
		server: {
			watch: null
		}
	});

	try {
		await server.pluginContainer.buildStart({});
		const mod = await server.ssrLoadModule("/src/features/_registry/featureMetadataRegistry.ts");
		const registry = mod.metadataRegistry as {
			getAll: () => FeatureMetadata<FeatureKeys>[];
		};
		if (!registry?.getAll) {
			throw new Error("metadataRegistry.getAll is missing");
		}

		const metadata = registry.getAll();
		const allFeatures: FeatureData[] = [];
		for (const feature of metadata) {
			const extracted = extractSettings(feature, t);
			allFeatures.push(...extracted);
		}

		const seen = new Set<string>();
		const deduped: FeatureData[] = [];
		for (const f of allFeatures) {
			const key = `${f.id}-${f.settingId}`;
			if (!seen.has(key)) {
				seen.add(key);
				deduped.push(f);
			}
		}

		const sectionMap = new Map<string, FeatureData[]>();
		for (const feature of deduped) {
			if (!sectionMap.has(feature.section)) {
				sectionMap.set(feature.section, []);
			}
			sectionMap.get(feature.section)!.push(feature);
		}

		const sortedSections = Array.from(sectionMap.keys()).sort((a, b) => {
			if (a === "miscellaneous") return -1;
			if (b === "miscellaneous") return 1;
			if (a === "customCSS") return 1;
			if (b === "customCSS") return -1;
			return a.localeCompare(b);
		});

		const { length: totalFeatures } = deduped.filter((f) => f.component === "checkbox");
		let markdown = `## 🎛️ Features • ${totalFeatures} features\n\n`;
		for (const section of sortedSections) {
			const features = sectionMap.get(section)!;
			const sortedFeatures = sortSettingsByComponent(features);
			const { length: sectionFeatureCount } = sortedFeatures.filter((f) => f.component === "checkbox");
			const { length: sectionSettingsCount } = sortedFeatures.filter((f) => f.component !== "checkbox");
			const settingsBadge = sectionSettingsCount > 0 ? ` (${sectionSettingsCount} settings)` : "";
			const sectionTitle =
				sectionFeatureCount > 1 ? `${toTitleCase(section)} • ${sectionFeatureCount} features${settingsBadge}` : toTitleCase(section);
			markdown += `<details>\n<summary>${sectionTitle}</summary>\n\n`;

			for (const feature of sortedFeatures) {
				const isCustomCssCode = feature.id === "customCSS" && feature.settingId === "code";
				const label = isCustomCssCode && feature.missingLabel ? "CSS Code" : feature.label;
				const title = isCustomCssCode && feature.missingTitle ? "Custom CSS code input" : feature.title;
				const missingLabel = isCustomCssCode ? false : feature.missingLabel;
				const missingTitle = isCustomCssCode ? false : feature.missingTitle;
				const flags = [missingLabel ? "missing_label" : "", missingTitle ? "missing_title" : ""].filter(Boolean);
				const debug = flags.length ? ` ⚠️ [${flags.join(", ")}]` : "";
				const titleCasedLabel = toTitleCase(label).replace(/\(d B\)/g, "(dB)");
				let line = `- **${titleCasedLabel}**: ${title}${debug}`;
				if (feature.component === "select" && feature.options && feature.options.length > 0) {
					line += `\n  - Options: ${feature.options.join(", ")}`;
				}
				markdown += `${line}\n`;
			}
			markdown += "</details>\n\n";
		}

		const readmeContent = readFileSync(readmePath, "utf-8");
		const startMarker = "<!-- YOUTUBE-ENHANCER-FEATURES-LIST:START - Do not remove or modify this section -->";
		const endMarker = "<!-- YOUTUBE-ENHANCER-FEATURES-LIST:END -->";
		const startIndex = readmeContent.indexOf(startMarker);
		const endIndex = readmeContent.indexOf(endMarker);
		if (startIndex === -1 || endIndex === -1) {
			terminalColorLog("updateReadmeFeatures: markers not found", "warning");
			return;
		}
		const insertionStart = startIndex + startMarker.length;
		const newReadme = readmeContent.substring(0, insertionStart) + "\n\n" + markdown + readmeContent.substring(endIndex);
		writeFileSync(readmePath, newReadme);
		terminalColorLog("README.md features generated successfully", "success");
	} finally {
		await server.close();
	}
}

function extractOptions<F extends FeatureKeys>(node: SettingConfig<F>, t: TFunction): string[] | undefined {
	const nodeWithOptions = node as unknown as { optionsFrom?: () => { label: TSelectFunc; value: string }[] };
	const { optionsFrom } = nodeWithOptions;
	if (typeof optionsFrom !== "function") return undefined;
	try {
		const opts = optionsFrom();
		if (!Array.isArray(opts)) return undefined;
		return opts.map((opt: { label: TSelectFunc; value: string }) => safeResolve(opt.label, t)).filter(Boolean);
	} catch {
		return undefined;
	}
}

function extractSettings<F extends FeatureKeys>(metadata: FeatureMetadata<F>, t: TFunction): FeatureData[] {
	const results: FeatureData[] = [];

	const walk = (node: FeatureSettingNode<F>, section: string) => {
		if (isGroupNode<F>(node)) {
			const nextSection = "section" in node && typeof node.section === "string" ? node.section : section;
			for (const child of node.children) {
				walk(child, nextSection);
			}
			return;
		}

		if (isSettingNode<F>(node)) {
			const resolvedSection = typeof node.section === "string" && node.section.length > 0 ? node.section : sectionFallback(section);
			const isCustomCssCode = metadata.id === "customCSS" && (String(node.id) === "code" || String(node.id).endsWith(".code"));

			if (isCustomCssCode) {
				results.push({
					component: node.component,
					id: metadata.id,
					label: "CSS Code",
					missingLabel: false,
					missingTitle: false,
					options: undefined,
					section: resolvedSection || "miscellaneous",
					settingId: node.id,
					title: "Custom CSS code input"
				});
				return;
			}

			const label = safeResolve(node.label, t);
			const title = safeResolve(node.title, t);
			const options = extractOptions(node, t);

			results.push({
				component: node.component,
				id: metadata.id,
				label: label || `⚠️ missing_label (${node.id})`,
				missingLabel: !label,
				missingTitle: !title,
				options,
				section: resolvedSection || "⚠️ missing_section",
				settingId: node.id,
				title: title || `⚠️ missing_title (${node.id})`
			});
		}
	};
	for (const node of metadata.settings as FeatureSettingNode<F>[]) {
		walk(node, "");
	}
	return results;
}

function sectionFallback(section: string): string {
	return section && section.length > 0 ? section : "miscellaneous";
}

function sortSettingsByComponent(entries: FeatureData[]): FeatureData[] {
	const byComponent: Record<string, FeatureData[]> = {};
	for (const entry of entries) {
		const component = entry.component ?? "other";
		if (!byComponent[component]) {
			byComponent[component] = [];
		}
		byComponent[component].push(entry);
	}
	const result: FeatureData[] = [];
	for (const component of Object.keys(byComponent)) {
		result.push(...byComponent[component]);
	}
	return result;
}

function toTitleCase(str: string): string {
	return str.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/(?:^|\s)[a-z]/g, (c) => c.toUpperCase());
}
