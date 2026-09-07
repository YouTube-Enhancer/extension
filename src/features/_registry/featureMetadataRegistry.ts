import { z } from "zod/v4-mini";

import type { AllButtonNames, TSelectFunc } from "@/src/types";

import { validateFeatureMetadata } from "@/src/features/_registry/featureMetadataValidation";
import { type FeatureKeys, type FeatureMetadata, isGroupNode, isSettingNode } from "@/src/features/_registry/types";
import { DEV_MODE } from "@/src/utils/config/env";

class FeatureMetadataRegistry {
	private buttonNameToFeature = new Map<string, FeatureKeys>();
	private featureToButtonNames = new Map<FeatureKeys, string[]>();
	private metadataMap = new Map<FeatureKeys, FeatureMetadata<FeatureKeys>>();
	get<K extends FeatureKeys>(id: K): FeatureMetadata<K> | undefined {
		return this.metadataMap.get(id) as FeatureMetadata<K> | undefined;
	}
	getAll(): FeatureMetadata<FeatureKeys>[] {
		return Array.from(this.metadataMap.values());
	}
	getAllButtonNames(): AllButtonNames[] {
		return Array.from(this.buttonNameToFeature.keys()) as AllButtonNames[];
	}
	getButtonConfigPath(buttonName: string): string | undefined {
		const featureKey = this.buttonNameToFeature.get(buttonName);
		if (!featureKey) return undefined;
		const metadata = this.metadataMap.get(featureKey);
		if (!metadata?.button) return undefined;
		return metadata.button.path === "buttons" ? `buttons.${buttonName}` : "button";
	}
	getButtonFeature(buttonName: string): FeatureKeys | undefined {
		return this.buttonNameToFeature.get(buttonName);
	}
	getButtonNamesForFeature(featureKey: FeatureKeys): string[] | undefined {
		return this.featureToButtonNames.get(featureKey);
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
	/** The label of one setting of a feature, found by the setting's id anywhere in the feature's settings tree. */
	getSettingLabel(featureId: FeatureKeys, settingId: string): TSelectFunc | undefined {
		const metadata = this.metadataMap.get(featureId);
		if (!metadata) return undefined;
		const find = (nodes: readonly unknown[]): TSelectFunc | undefined => {
			for (const node of nodes) {
				if (isGroupNode(node)) {
					const found = find(node.children);
					if (found) return found;
				} else if (isSettingNode(node) && node.id === settingId) {
					return node.label;
				}
			}
			return undefined;
		};
		return find(metadata.settings);
	}
	getStateSchema<K extends FeatureKeys>(id: K) {
		const metadata = this.metadataMap.get(id) as FeatureMetadata<K> | undefined;
		if (!metadata) return undefined;
		const { stateSchemaInput } = metadata as FeatureMetadata<K> & { stateSchemaInput?: Record<string, unknown> };
		if (!stateSchemaInput) return undefined;
		return z.object(stateSchemaInput);
	}
	register<K extends FeatureKeys>(metadata: FeatureMetadata<K>) {
		// The build validates every feature's metadata before it ships (src/pipeline/steps/validateFeatureMetadata.ts);
		// a development build checks again at load, so a mistake shows up without a full build.
		if (DEV_MODE) validateFeatureMetadata(metadata);
		if (metadata.button) {
			for (const name of metadata.button.names) {
				this.buttonNameToFeature.set(name, metadata.id);
			}
			this.featureToButtonNames.set(metadata.id, metadata.button.names);
		}
		this.metadataMap.set(metadata.id, metadata);
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
