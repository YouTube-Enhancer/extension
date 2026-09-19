import { existsSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { pathToFileURL } from "url";

import type { FeatureKeys, FeatureMetadata } from "@/src/features/_registry/types";

export type LoadedFeatureMetadata = {
	folder: string;
	metadata: FeatureMetadata<FeatureKeys> | undefined;
};

let loaded: Promise<LoadedFeatureMetadata[]> | undefined;

/**
 * Loads every feature's `index.metadata.ts` through the running TypeScript loader, in folder order, which is the order
 * the runtime registry's glob yields. The registry itself cannot be imported here because it relies on
 * `import.meta.glob`, which only a bundler understands; booting Vite just to evaluate it cost the README step one to
 * two seconds per build. The result is cached so the validation and README steps share one load.
 */
export function loadFeatureMetadata(): Promise<LoadedFeatureMetadata[]> {
	loaded ??= (async () => {
		const featuresDir = resolve(process.cwd(), "src", "features");
		const folders = readdirSync(featuresDir, { withFileTypes: true })
			.filter((entry) => entry.isDirectory() && existsSync(join(featuresDir, entry.name, "index.metadata.ts")))
			.map((entry) => entry.name)
			.sort();
		const features: LoadedFeatureMetadata[] = [];
		for (const folder of folders) {
			const modulePath = join(featuresDir, folder, "index.metadata.ts");
			const { metadata } = (await import(pathToFileURL(modulePath).href)) as { metadata?: FeatureMetadata<FeatureKeys> };
			features.push({ folder, metadata });
		}
		return features;
	})();
	return loaded;
}
