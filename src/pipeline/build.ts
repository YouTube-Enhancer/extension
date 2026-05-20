import { config } from "dotenv";

import checkLocalesForMissingKeys from "@/src/i18n/checkLocalesForMissingKeys";
import updateAvailableLocales from "@/src/i18n/updateAvailableLocales";
import updateLocalePercentages from "@/src/i18n/updateLocalePercentages";
import { emptyOutputFolder } from "@/src/utils/plugins/utils";

import { copyOutputs, generateManifests, makeReleaseZips, updateReadmeFeatures } from "./steps";

config();

const command = process.argv[2] || "all";

export async function runPostBuildPipeline(retries = 3): Promise<void> {
	console.log("[Build Pipeline] Running post-build steps...");
	const start = Date.now();

	let lastError: Error | null = null;
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			await timedStep("Generating manifests", () => generateManifests());
			await timedStep("Copying outputs", () => copyOutputs());
			await timedStep("Updating README features", () => updateReadmeFeatures());
			await timedStep("Creating release ZIPs", () => makeReleaseZips());
			const elapsed = ((Date.now() - start) / 1000).toFixed(2);
			console.log(`[Build Pipeline] Post-build complete! (${elapsed}s total)`);
			return;
		} catch (err) {
			lastError = err as Error;
			console.error(`[Build Pipeline] Attempt ${attempt}/${retries} failed:`, lastError.message);
			if (attempt < retries) {
				console.log("[Build Pipeline] Retrying in 2 seconds...");
				await new Promise((resolve) => setTimeout(resolve, 2000));
			}
		}
	}
	throw new Error(lastError?.message ?? "Unknown error");
}

export async function runPreBuildPipeline(): Promise<void> {
	console.log("[Build Pipeline] Running pre-build steps...");
	const start = Date.now();
	await timedStep("Clearing output folder", () => emptyOutputFolder());
	await timedStep("Updating available locales", () => updateAvailableLocales());
	const isDevelopment = process.env.NODE_ENV === "development";
	const shouldBypass = process.env.BYPASS_LOCALE_CHECK === "true";

	if (!isDevelopment && !shouldBypass) {
		checkLocalesForMissingKeys();
		await timedStep("Updating locale percentages", () => updateLocalePercentages());
		console.log("[Build Pipeline] Locale validation complete");
	} else {
		console.log(`[Build Pipeline] Skipping locale check`);
	}
	const elapsed = ((Date.now() - start) / 1000).toFixed(2);
	console.log(`[Build Pipeline] Pre-build complete! (${elapsed}s total)`);
}

async function timedStep<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
	const start = Date.now();
	console.log(`[Build Pipeline] [Step] ${name}...`);
	const result = await fn();
	const elapsed = ((Date.now() - start) / 1000).toFixed(2);
	console.log(`[Build Pipeline] [Step] ${name} (${elapsed}s)`);
	return result;
}

void (async () => {
	try {
		if (command === "pre") {
			await runPreBuildPipeline();
			return;
		}
		if (command === "post") {
			await runPostBuildPipeline();
			return;
		}
		if (command === "all") {
			console.log("[Build Pipeline] Running full build pipeline...");
			await runPreBuildPipeline();
			await runPostBuildPipeline();
			console.log("[Build Pipeline] All done!");
			return;
		}
		console.error("[Build Pipeline] Invalid command. Use 'pre', 'post', or 'all'");
		process.exit(1);
	} catch (err) {
		console.error("[Build Pipeline] Failed:", err);
		process.exit(1);
	}
})();
