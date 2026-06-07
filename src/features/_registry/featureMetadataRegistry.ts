import { z } from "zod/v4-mini";

import type { FeatureKeys, FeatureMetadata } from "@/src/features/_registry/types";

interface ValidationError {
	message: string;
	path: string[];
}

class FeatureMetadataRegistry {
	private metadataMap = new Map<FeatureKeys, FeatureMetadata<FeatureKeys>>();
	get<K extends FeatureKeys>(id: K): FeatureMetadata<K> | undefined {
		return this.metadataMap.get(id) as FeatureMetadata<K> | undefined;
	}
	getAll(): FeatureMetadata<FeatureKeys>[] {
		return Array.from(this.metadataMap.values());
	}
	getDefaults(): Partial<Record<FeatureKeys, unknown>> {
		const result: Partial<Record<FeatureKeys, unknown>> = {};
		for (const { defaults, id } of this.metadataMap.values()) {
			result[id] = defaults;
		}
		return result;
	}
	getImportSchemaShape() {
		const shape: Record<string, any> = {};
		for (const { id, schemaInput } of this.metadataMap.values()) {
			shape[id] = z.object(schemaInput);
		}
		return shape;
	}
	getSchema<K extends FeatureKeys>(id: K) {
		const metadata = this.metadataMap.get(id) as FeatureMetadata<K> | undefined;
		if (!metadata) return undefined;
		return z.object(metadata.schemaInput);
	}
	getStateSchema<K extends FeatureKeys>(id: K) {
		const metadata = this.metadataMap.get(id) as FeatureMetadata<K> | undefined;
		if (!metadata) return undefined;
		if (!metadata.stateSchemaInput) return undefined;
		return z.object(metadata.stateSchemaInput);
	}
	register<K extends FeatureKeys>(metadata: FeatureMetadata<K>) {
		validateDefaults(metadata);
		validateSettingsIds(metadata);
		validateSettingsStructure(metadata);
		validateStateSchemaInput(metadata);
		this.metadataMap.set(metadata.id, metadata);
	}
}

function parseZodError(error: unknown): ValidationError[] {
	const issues = (error as { issues?: unknown[] })?.issues;
	if (!Array.isArray(issues)) return [];
	return issues.map((issue: unknown) => {
		const issueObj = issue as { message?: unknown; path?: unknown[] };
		const msg = issueObj?.message;
		return {
			message: typeof msg === "string" ? msg : "Unknown error",
			path: (issueObj?.path ?? []).map(String)
		};
	});
}

function validateDefaults<K extends FeatureKeys>(metadata: FeatureMetadata<K>): void {
	const schema = z.object(metadata.schemaInput);
	const result = schema.safeParse(metadata.defaults);
	if (!result.success) {
		const errors = parseZodError(result.error)
			.map((e) => `  - ${e.path.join(".")}: ${e.message}`)
			.join("\n");
		throw new Error(`Feature "${metadata.id}" defaults validation failed:\n${errors}`);
	}
}

function validateSettingsIds<K extends FeatureKeys>(metadata: FeatureMetadata<K>): void {
	const schema = z.object(metadata.schemaInput);

	function pathExists(path: string): boolean {
		const keys = path.split(".");
		try {
			const parseResult = schema.safeParse(keys.reduce((acc: Record<string, unknown>, key) => ({ ...acc, [key]: true }), {}));
			if (parseResult.success) return true;
			const hasExtraKeys = parseZodError(parseResult.error).some((e) => e.message.includes("Unrecognized key") || e.message.includes("not allowed"));
			return !hasExtraKeys;
		} catch {
			return false;
		}
	}

	function validateNode(node: unknown): void {
		if (!node || typeof node !== "object") return;
		const n = node as Record<string, unknown>;
		if (n.type === "group" && Array.isArray(n.children)) {
			for (const child of n.children) {
				validateNode(child);
			}
		} else if (n.id && typeof n.id === "string") {
			if (!pathExists(n.id)) {
				throw new Error(`Setting ID "${n.id}" in feature "${metadata.id}" does not exist in schemaInput`);
			}
		}
	}

	for (const node of metadata.settings) {
		validateNode(node);
	}
}

function validateSettingsStructure<K extends FeatureKeys>(metadata: FeatureMetadata<K>): void {
	const validComponents = ["checkbox", "color-picker", "css-editor", "number", "select", "slider", "text-input"] as const;
	type ValidComponent = (typeof validComponents)[number];

	const validSectionIds = [
		"automaticBehaviors",
		"buttonPlacement",
		"contentFiltering",
		"customCSS",
		"deepDarkCSS",
		"featureMenu",
		"globalVolume",
		"hideShorts",
		"language",
		"loopButton",
		"maximizePlayerButton",
		"miniPlayer",
		"miscellaneous",
		"onScreenDisplaySettings",
		"openTranscriptButton",
		"playbackControls",
		"playerQuality",
		"playerSpeed",
		"playlistLength",
		"playlistManagementButtons",
		"scrollWheelSpeedControl",
		"scrollWheelVolumeControl",
		"screenshotButton",
		"shareShortener",
		"videoHistory",
		"volumeBoost",
		"youTubeDataApiV3Key"
	] as const;

	function validateSetting(setting: unknown, path: string): void {
		if (!setting || typeof setting !== "object") {
			throw new Error(`Setting at "${path}" in feature "${metadata.id}" is not an object`);
		}

		const {
			component: comp,
			disabledWhen,
			id,
			input_type: inpType,
			label,
			max,
			min,
			parentSetting,
			section: sect,
			step,
			title,
			visibleWhen
		} = setting as Record<string, unknown>;

		if (!validComponents.includes(comp as ValidComponent)) {
			throw new Error(`Setting at "${path}" in feature "${metadata.id}" has invalid component: ${comp}`);
		}

		if (typeof label !== "function") {
			throw new Error(`Setting at "${path}" in feature "${metadata.id}" must have a label function`);
		}

		if (typeof title !== "function") {
			throw new Error(`Setting at "${path}" in feature "${metadata.id}" must have a title function`);
		}

		if (id && typeof id !== "string") {
			throw new Error(`Setting at "${path}" in feature "${metadata.id}" has invalid id type`);
		}

		if (sect !== undefined) {
			if (typeof sect !== "string") {
				throw new Error(`Setting at "${path}" in feature "${metadata.id}" section must be a string`);
			}
			if (!validSectionIds.includes(sect as (typeof validSectionIds)[number])) {
				throw new Error(`Setting at "${path}" in feature "${metadata.id}" has invalid section: ${sect}`);
			}
		}

		if (disabledWhen !== undefined) {
			if (!Array.isArray(disabledWhen)) {
				throw new Error(`Setting at "${path}" in feature "${metadata.id}" disabledWhen must be an array`);
			}
			for (const condition of disabledWhen) {
				validateSettingCondition(condition, path, "disabledWhen");
			}
		}

		if (visibleWhen !== undefined) {
			if (!Array.isArray(visibleWhen)) {
				throw new Error(`Setting at "${path}" in feature "${metadata.id}" visibleWhen must be an array`);
			}
			for (const condition of visibleWhen) {
				validateSettingCondition(condition, path, "visibleWhen");
			}
		}

		if (comp === "number" || comp === "slider") {
			if (typeof max !== "number") {
				throw new Error(`Setting at "${path}" in feature "${metadata.id}" component "${comp}" must have max number`);
			}
			if (typeof min !== "number") {
				throw new Error(`Setting at "${path}" in feature "${metadata.id}" component "${comp}" must have min number`);
			}
			if (typeof step !== "number") {
				throw new Error(`Setting at "${path}" in feature "${metadata.id}" component "${comp}" must have step number`);
			}
		}

		if (comp === "text-input" && inpType !== undefined) {
			if (typeof inpType !== "string") {
				throw new Error(`Setting at "${path}" in feature "${metadata.id}" input_type must be a string`);
			}
			if (inpType !== "password" && inpType !== "text") {
				throw new Error(`Setting at "${path}" in feature "${metadata.id}" text-input has invalid input_type: ${inpType}`);
			}
		}

		if (parentSetting !== undefined) {
			validateParentSetting(parentSetting, path, metadata.id);
		}
	}

	function validateSettingCondition(condition: unknown, settingPath: string, conditionType: string): void {
		if (!condition || typeof condition !== "object") {
			throw new Error(`Condition in ${conditionType} at "${settingPath}" in feature "${metadata.id}" is not an object`);
		}
		const c = condition as Record<string, unknown>;
		if (typeof c.setting !== "string") {
			throw new Error(`Condition in ${conditionType} at "${settingPath}" in feature "${metadata.id}" must have a setting string`);
		}
	}

	function validateParentSetting(parentSetting: unknown, settingPath: string, featureId: string): void {
		if (typeof parentSetting === "function") return;

		if (!parentSetting || typeof parentSetting !== "object") {
			throw new Error(`ParentSetting at "${settingPath}" in feature "${featureId}" is not an object or function`);
		}

		const { type, value } = parentSetting as Record<string, unknown>;
		if (type === undefined) {
			throw new Error(`ParentSetting at "${settingPath}" in feature "${featureId}" must have a type`);
		}
		if (typeof type !== "string") {
			throw new Error(`ParentSetting at "${settingPath}" in feature "${featureId}" type must be a string`);
		}
		if (type === "singular" || type === "specificOption") {
			if (typeof value !== "function") {
				throw new Error(`ParentSetting at "${settingPath}" in feature "${featureId}" ${type} type must have a value function`);
			}
		} else if (type === "either" || type === "plural") {
			if (!Array.isArray(value)) {
				throw new Error(`ParentSetting at "${settingPath}" in feature "${featureId}" ${type} type must have a value array`);
			}
		} else {
			throw new Error(`ParentSetting at "${settingPath}" in feature "${featureId}" has invalid type: ${type}`);
		}
	}

	function validateGroup(group: unknown, path: string): void {
		if (!group || typeof group !== "object") {
			throw new Error(`Group at "${path}" in feature "${metadata.id}" is not an object`);
		}
		const g = group as Record<string, unknown>;
		if (g.type !== "group") {
			throw new Error(`Node at "${path}" in feature "${metadata.id}" has invalid type: ${g.type}`);
		}
		if (!Array.isArray(g.children)) {
			throw new Error(`Group at "${path}" in feature "${metadata.id}" must have children array`);
		}
		let index = 0;
		for (const child of g.children) {
			const childPath = `${path}.children[${index}]`;
			validateSettingNode(child, childPath);
			index++;
		}
	}

	function validateSettingNode(node: unknown, path: string): void {
		if (!node || typeof node !== "object") return;
		const n = node as Record<string, unknown>;
		if (n.type === "divider") return;
		if (n.type === "text") {
			if (typeof n.content !== "function") {
				throw new Error(`Text node at "${path}" in feature "${metadata.id}" must have content function`);
			}
			return;
		}
		if (n.type === "group") {
			validateGroup(node, path);
			return;
		}
		if (n.id && typeof n.id === "string") {
			validateSetting(node, path);
		}
	}

	let index = 0;
	for (const node of metadata.settings) {
		validateSettingNode(node, `settings[${index}]`);
		index++;
	}
}

function validateStateSchemaInput<K extends FeatureKeys>(metadata: FeatureMetadata<K>): void {
	if (!metadata.stateSchemaInput) return;
	try {
		z.object(metadata.stateSchemaInput);
	} catch (e) {
		throw new Error(`Feature "${metadata.id}" stateSchemaInput is not a valid Zod shape: ${(e as Error).message}`);
	}
}

export const metadataRegistry = new FeatureMetadataRegistry();

const modules = import.meta.glob<{ metadata: FeatureMetadata<any> }>("/src/features/*/index.metadata.ts", { eager: true });

for (const path in modules) {
	try {
		const {
			[path]: { metadata }
		} = modules;
		if (metadata) metadataRegistry.register(metadata);
	} catch (e) {
		console.error(`Failed to register metadata from ${path}:`, e);
	}
}
