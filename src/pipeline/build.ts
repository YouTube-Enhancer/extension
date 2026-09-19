import { execFileSync } from "child_process";
import { config } from "dotenv";
import { existsSync, statSync } from "fs";
import { resolve } from "path";
import { build as viteBuild } from "vite";

import type { Nullable } from "@/src/types";

import checkLocalesForMissingKeys from "@/src/i18n/checkLocalesForMissingKeys";
import updateAvailableLocales from "@/src/i18n/updateAvailableLocales";
import updateLocalePercentages from "@/src/i18n/updateLocalePercentages";
import { emptyOutputFolder, rootDir } from "@/src/utils/plugins/utils";

import { copyOutputs, generateManifests, makeReleaseZips, updateReadmeFeatures, validateFeatureMetadata } from "./steps";
import { buildContentScripts } from "./steps/buildContentScripts";

config();

/**
 * The whole pipeline runs in this one process. It used to be four `npm run` steps that spawned four more, plus three
 * `tsx` starts, which cost about 15 s of process start-up per build on Windows before any work happened.
 */
const command = process.argv[2] || "all";
const isDevelopment = process.env.NODE_ENV === "development";

export async function runBundles(): Promise<void> {
	console.log("[Build Pipeline] Bundling pages and content scripts in parallel...");
	const start = Date.now();
	await Promise.all([
		timedStep("Pages bundle", () => viteBuild({ configFile: resolve(rootDir, "vite.config.ts"), logLevel: "warn" })),
		timedStep("Content-script bundles", () => buildContentScripts({ logLevel: "warn" }))
	]);
	console.log(`[Build Pipeline] Bundling complete! (${elapsedSince(start)}s total)`);
}

export async function runPostBuildPipeline(retries = 3): Promise<void> {
	console.log("[Build Pipeline] Running post-build steps...");
	const start = Date.now();

	let lastError: Nullable<Error> = null;
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			await timedStep("Generating manifests", () => generateManifests());
			await timedStep("Copying outputs", () => copyOutputs());
			await timedStep("Updating README features", () => updateReadmeFeatures());
			await timedStep("Generating locale types", () => generateLocaleTypes());
			if (isDevelopment) {
				console.log("[Build Pipeline] Skipping release ZIPs in development");
			} else {
				await timedStep("Creating release ZIPs", () => makeReleaseZips());
			}
			console.log(`[Build Pipeline] Post-build complete! (${elapsedSince(start)}s total)`);
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
	await timedStep("Validating feature metadata", () => validateFeatureMetadata());
	await timedStep("Updating available locales", () => updateAvailableLocales());
	const shouldBypass = process.env.BYPASS_LOCALE_CHECK === "true";

	if (!isDevelopment && !shouldBypass) {
		try {
			checkLocalesForMissingKeys();
		} catch (error) {
			const details = error instanceof Error ? error.message : String(error);
			console.error(localeCheckFailureMessage(details));
			throw error;
		}
		await timedStep("Updating locale percentages", () => updateLocalePercentages());
		console.log("[Build Pipeline] Locale validation complete");
	} else {
		console.log(`[Build Pipeline] Skipping locale check`);
	}
	console.log(`[Build Pipeline] Pre-build complete! (${elapsedSince(start)}s total)`);
}

function elapsedSince(start: number): string {
	return ((Date.now() - start) / 1000).toFixed(2);
}

/**
 * `public/locales/en-US.json.d.ts` is what `npm run typecheck` and the editor read; the bundles do not need it. It is
 * regenerated only when the source locale is newer, because `ts-json-as-const` is a CLI and costs a Node start.
 */
function generateLocaleTypes(): void {
	const source = resolve(rootDir, "public/locales/en-US.json");
	const output = `${source}.d.ts`;
	if (existsSync(output) && statSync(output).mtimeMs >= statSync(source).mtimeMs) return;
	execFileSync(process.execPath, [resolve(rootDir, "node_modules/ts-json-as-const/index.js"), source], { stdio: "inherit" });
}

function localeCheckFailureMessage(details: string): string {
	return [
		"",
		"=====================================================================================",
		"!!! LOCALE CHECK FAILED — TRANSLATION FILES ARE MISSING KEYS !!!",
		"=====================================================================================",
		"",
		details,
		"",
		"The build cannot continue with incomplete translations.",
		"",
		"To BYPASS this check and continue the build anyway, set the environment variable:",
		"",
		"    BYPASS_LOCALE_CHECK=true",
		"",
		"Examples:",
		"    Unix:   BYPASS_LOCALE_CHECK=true npm run build",
		"    cmd:    set BYPASS_LOCALE_CHECK=true && npm run build",
		"    Powershell: $env:BYPASS_LOCALE_CHECK = 'true'; npm run build",
		"",
		"=====================================================================================",
		""
	].join("\n");
}

async function timedStep<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
	const start = Date.now();
	console.log(`[Build Pipeline] [Step] ${name}...`);
	const result = await fn();
	console.log(`[Build Pipeline] [Step] ${name} (${elapsedSince(start)}s)`);
	return result;
}

void (async () => {
	try {
		const start = Date.now();
		switch (command) {
			case "all": {
				console.log(`[Build Pipeline] Running full ${isDevelopment ? "development" : "production"} build...`);
				await runPreBuildPipeline();
				await runBundles();
				await runPostBuildPipeline();
				console.log(`[Build Pipeline] All done! (${elapsedSince(start)}s total)`);
				return;
			}
			case "bundle": {
				await runBundles();
				return;
			}
			case "post": {
				await runPostBuildPipeline();
				return;
			}
			case "pre": {
				await runPreBuildPipeline();
				return;
			}
			default: {
				console.error("[Build Pipeline] Invalid command. Use 'pre', 'bundle', 'post', or 'all'");
				process.exit(1);
			}
		}
	} catch (err) {
		console.error("[Build Pipeline] Failed:", err);
		process.exit(1);
	}
})();
