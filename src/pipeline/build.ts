import { config } from "dotenv";

import checkLocalesForMissingKeys from "../utils/checkLocalesForMissingKeys";
import { emptyOutputFolder } from "../utils/plugins/utils";
import updateAvailableLocales from "../utils/updateAvailableLocales";
import updateLocalePercentages from "../utils/updateLocalePercentages";
import { buildContentScripts } from "./steps/buildContentScripts";
import { copyOutputs } from "./steps/copyOutputs";
import { generateManifests } from "./steps/generateManifests";
import { makeReleaseZips } from "./steps/makeReleaseZips";
import generateReadmeFeatures from "./steps/updateReadmeFeatures";

config();

const command = process.argv[2] || "all";

export async function runPostBuildPipeline(): Promise<void> {
	console.log("[Build Pipeline] Running post-build steps...");
	await buildContentScripts();
	console.log("[Build Pipeline] Content scripts built");
	generateManifests();
	console.log("[Build Pipeline] Manifests generated");
	copyOutputs();
	console.log("[Build Pipeline] Outputs copied");
	await generateReadmeFeatures();
	console.log("[Build Pipeline] README features generated");
	await makeReleaseZips();
	console.log("[Build Pipeline] Release ZIPs created");
	console.log("[Build Pipeline] Post-build complete!");
}

export async function runPreBuildPipeline(): Promise<void> {
	console.log("[Build Pipeline] Running pre-build steps...");
	emptyOutputFolder();
	console.log("[Build Pipeline] Output folder cleared");
	updateAvailableLocales();
	console.log("[Build Pipeline] Locales updated");
	if (process.env.NODE_ENV !== "development" && process.env.BYPASS_LOCALE_CHECK !== "true") {
		checkLocalesForMissingKeys();
		await updateLocalePercentages();
		console.log("[Build Pipeline] Locale validation complete");
	}
	console.log("[Build Pipeline] Pre-build complete!");
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
