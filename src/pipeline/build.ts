import { config } from "dotenv";

import checkLocalesForMissingKeys from "../utils/checkLocalesForMissingKeys";
import { emptyOutputFolder } from "../utils/plugins/utils";
import updateAvailableLocales from "../utils/updateAvailableLocales";
import updateLocalePercentages from "../utils/updateLocalePercentages";
import copyOutputs from "./steps/copyOutputs";
import generateManifests from "./steps/generateManifests";
import makeReleaseZips from "./steps/makeReleaseZips";

config();

const command = process.argv[2] || "all";

export async function runPostBuildPipeline(): Promise<void> {
	console.log("[Build Pipeline] Running post-build steps...");
	const start = Date.now();
	await timedStep("Generating manifests", () => generateManifests());
	await timedStep("Copying outputs", () => copyOutputs());
	await timedStep("Creating release ZIPs", () => makeReleaseZips());
	const elapsed = ((Date.now() - start) / 1000).toFixed(2);
	console.log(`[Build Pipeline] Post-build complete! (${elapsed}s total)`);
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
