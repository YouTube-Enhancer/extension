import { copyFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { cwd } from "process";
export function checkTests() {
	// Get the list of feature names
	const featureNames = getFeatureNames();
	// Loop through the feature names
	for (const featureName of featureNames) {
		// Check if the test file exists
		const testFilePath = join(cwd(), "src", "features", "__tests__", `${featureName}.spec.ts`);
		// If the test file doesn't exist, create it based on the __base__.spec.ts
		if (!existsSync(testFilePath)) {
			console.log("Creating test file for feature: " + featureName);
			copyFileSync(join(cwd(), "src", "features", "__tests__", "__base__.spec.ts"), testFilePath);
		}
	}
}
function getFeatureNames() {
	// Read the folders from src/features excluding __tests__ folder and make sure the entries are folders
	const featureFolders = readdirSync(join(cwd(), "src", "features"), { withFileTypes: true })
		.filter((dirent) => dirent.isDirectory() && dirent.name !== "__tests__")
		.map((dirent) => dirent.name);
	return featureFolders;
}
