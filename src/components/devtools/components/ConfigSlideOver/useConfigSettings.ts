import { useEffect, useState } from "react";

import type { FeatureKeys, FeatureSettingNode } from "@/src/features/_registry/types";
import type { configuration, Path } from "@/src/types";

import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";
import { getPathValue } from "@/src/utils/misc";

import type { SettingItem } from "./types";

import { getSettingConfigs } from "./utils";

export function useConfigSettings<F extends FeatureKeys>(
	featureId: F,
	currentConfig: configuration[F] | null
): {
	handleChange: (id: string, value: unknown) => void;
	settings: SettingItem<F>[];
} {
	const metadata = featureId ? (metadataRegistry.get(featureId) ?? null) : null;
	const [settings, setSettings] = useState<SettingItem<F>[]>([]);

	useEffect(() => {
		if (!metadata || !featureId || !currentConfig) {
			setSettings([]);
			return;
		}

		const allSettings = (metadata.settings ?? []) as FeatureSettingNode<F>[];
		const featureSettings = getSettingConfigs<F>(allSettings);
		const ids = featureSettings.map((s) => s.id);
		const initialSettings = ids.map((id) => {
			const configPath = id.startsWith(`${featureId}.`) ? id.slice(featureId.length + 1) : id;
			const config = currentConfig;
			const value = config ? getPathValue(config, configPath as Path<configuration[F]>) : undefined;
			return {
				currentValue: value,
				id
			} satisfies SettingItem<F>;
		});

		setSettings(initialSettings);
	}, [metadata, featureId, currentConfig]);

	const handleChange = (_id: string, _value: unknown) => {
		setSettings((prev: SettingItem<F>[]) => prev.map((s: SettingItem<F>) => (s.id === _id ? { ...s, currentValue: _value } : s)));
	};

	return { handleChange, settings };
}
