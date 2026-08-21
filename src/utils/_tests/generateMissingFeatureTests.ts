import { copyFileSync, existsSync, readdirSync } from "fs";
import { dirname, isAbsolute, join, resolve } from "path";
import { cwd } from "process";
import { fileURLToPath } from "url";

export function generateMissingFeatureTests() {
	const featuresDir = getFeaturesDir();
	if (!featuresDir) return;
	// Get the list of feature names
	const featureNames = getFeatureNames(featuresDir);
	// Loop through the feature names
	for (const featureName of featureNames) {
		// Check if the test file exists
		const testFilePath = join(featuresDir, "__tests__", `${featureName}.spec.ts`);
		// If the test file doesn't exist, create it based on the __base__.spec.ts
		if (!existsSync(testFilePath)) {
			console.log("Creating test file for feature: " + featureName);
			copyFileSync(join(featuresDir, "__tests__", "__base__.spec.ts"), testFilePath);
		}
	}
}

function getFeatureNames(featuresDir: string) {
	// Read the folders from src/features excluding __tests__ folder and make sure the entries are folders
	const featureFolders = readdirSync(featuresDir, { withFileTypes: true })
		.filter((dirent) => dirent.isDirectory() && dirent.name !== "__tests__")
		.map((dirent) => dirent.name);
	return featureFolders;
}
function getFeaturesDir(): null | string {
	try {
		const filePath = fileURLToPath(import.meta.url);
		if (isAbsolute(filePath)) {
			const candidate = resolve(dirname(filePath), "../../features");
			if (existsSync(candidate)) return candidate;
		}
	} catch {}
	const cwdCandidate = join(cwd(), "src", "features");
	return existsSync(cwdCandidate) ? cwdCandidate : null;
}
