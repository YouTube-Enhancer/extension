import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { cwd } from "process";
import { pathToFileURL } from "url";

import type { FeatureKeys, FeatureMetadata } from "@/src/features/_registry/types";
import type { TFunction } from "@/src/pipeline/utils";
import type { AllButtonNames, configuration, FeatureButtonId, Path, TSelectFunc } from "@/src/types";
import type { FilterKeysByValueType } from "@/src/utils/_tests/types";

const FEATURES_DIR = join(cwd(), "src", "features");
let allMetadata: Promise<FeatureMetadata<FeatureKeys>[]> | undefined;

export type FeatureButtonEntry = {
	/** The element id the button controller gives the button. */
	buttonId: FeatureButtonId;
	/** The switch that puts the button on the page: the button's own, or the feature's when the button has none. */
	enabledKey: FilterKeysByValueType<configuration, boolean>;
	featureId: FeatureKeys;
	fullscreenPlacementKey: Path<configuration>;
	name: AllButtonNames;
	placementKey: Path<configuration>;
};

/** The label of one setting, by its id, as the options page renders it from the feature's metadata. */
export function featureSettingLabel(all: FeatureMetadata<FeatureKeys>[], settingId: string, t: TFunction): string {
	const [featureId] = settingId.split(".");
	const metadata = all.find((entry) => entry.id === featureId);
	if (!metadata) throw new Error(`no feature metadata for ${settingId}`);
	const find = (nodes: unknown[]): TSelectFunc | undefined => {
		for (const node of nodes) {
			if (!node || typeof node !== "object") continue;
			if ("children" in node && Array.isArray(node.children)) {
				const found = find(node.children);
				if (found) return found;
			} else if ("id" in node && node.id === settingId && "label" in node && typeof node.label === "function") {
				return node.label as TSelectFunc;
			}
		}
		return undefined;
	};
	const label = find(metadata.settings);
	if (!label) throw new Error(`no setting ${settingId} in the metadata of ${featureId}`);
	return label(t);
}

/** One entry per button the features declare, with the configuration keys that place it. */
export function listFeatureButtons(all: FeatureMetadata<FeatureKeys>[]): FeatureButtonEntry[] {
	const entries: FeatureButtonEntry[] = [];
	for (const metadata of all) {
		if (!metadata.button) continue;
		const defaults = metadata.defaults as Record<string, unknown>;
		for (const name of metadata.button.names) {
			const configPath = metadata.button.path === "button" ? "button" : `buttons.${name}`;
			const buttonDefaults = (metadata.button.path === "button" ? defaults.button : (defaults.buttons as Record<string, unknown>)[name]) as Record<
				string,
				unknown
			>;
			entries.push({
				buttonId: `yte-feature-${name}-button`,
				enabledKey: ("enabled" in buttonDefaults ?
					`${metadata.id}.${configPath}.enabled`
				:	`${metadata.id}.enabled`) as FeatureButtonEntry["enabledKey"],
				featureId: metadata.id,
				fullscreenPlacementKey: `${metadata.id}.${configPath}.fullscreenPlacement` as Path<configuration>,
				name,
				placementKey: `${metadata.id}.${configPath}.placement` as Path<configuration>
			});
		}
	}
	return entries;
}

/**
 * The metadata of every registered feature, read from the same index.metadata.ts files the extension registers, so
 * a spec that loops over features cannot fall behind a feature being added, renamed or removed.
 */
export function loadAllFeatureMetadata(): Promise<FeatureMetadata<FeatureKeys>[]> {
	allMetadata ??= (async () => {
		const folders = readdirSync(FEATURES_DIR, { withFileTypes: true })
			.filter((entry) => entry.isDirectory() && existsSync(join(FEATURES_DIR, entry.name, "index.metadata.ts")))
			.map((entry) => entry.name);
		const modules = await Promise.all(
			folders.map(
				(folder) => import(pathToFileURL(join(FEATURES_DIR, folder, "index.metadata.ts")).href) as Promise<{ metadata: FeatureMetadata<FeatureKeys> }>
			)
		);
		return modules.map(({ metadata }) => metadata).sort((a, b) => a.id.localeCompare(b.id));
	})();
	return allMetadata;
}
