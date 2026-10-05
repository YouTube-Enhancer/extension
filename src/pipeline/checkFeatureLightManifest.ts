import {
	generateFeatureLightManifest,
	isFeatureLightManifestUpToDate
} from "./steps/generateFeatureLightManifest";

/**
 * `pnpm run lint:manifest`: fails when generatedFeatureLightManifest.ts does not match
 * a fresh emit from feature metadata. Wired into lint, typecheck, pre-build, and pre-commit
 * so the content-script catalog cannot drift from index.metadata.ts.
 */
void (async () => {
	const write = process.argv.includes("--write");
	try {
		if (write) {
			await generateFeatureLightManifest();
			console.log("[Build Pipeline] Feature light manifest regenerated");
			return;
		}
		if (await isFeatureLightManifestUpToDate()) {
			console.log("[Build Pipeline] Feature light manifest is up to date");
			return;
		}
		console.error(
			[
				"[Build Pipeline] Feature light manifest is stale.",
				"Run `pnpm run lint:manifest -- --write` (or `pnpm run build:pre`) and commit",
				"src/features/_registry/generatedFeatureLightManifest.ts.",
				"Source of truth: each feature's index.metadata.ts."
			].join("\n")
		);
		process.exit(1);
	} catch (error) {
		console.error("[Build Pipeline] Feature light manifest check failed:", error);
		process.exit(1);
	}
})();
