import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { dirname, isAbsolute, join, resolve } from "path";
import { cwd } from "process";
import { fileURLToPath } from "url";

/** Replaced with the feature id in the generated spec's metadata import and enabled key. */
const FEATURE_ID_PLACEHOLDER = "__FEATURE_ID__";
const TEMPLATE_NAME = "base.spec.ts.template";

export function generateMissingFeatureTests() {
	const featuresDir = getFeaturesDir();
	if (!featuresDir) return;
	const templatePath = join(featuresDir, "__tests__", TEMPLATE_NAME);
	if (!existsSync(templatePath)) return;
	const template = readFileSync(templatePath, "utf8");
	// Get the list of feature names
	const featureNames = getFeatureNames(featuresDir);
	// Loop through the list of feature names
	for (const featureName of featureNames) {
		// Check if the test file exists
		const testFilePath = join(featuresDir, "__tests__", `${featureName}.spec.ts`);
		// Create the spec from the template when it is missing or a zero-byte leftover that
		// asserts nothing, so a registered feature always has a spec carrying the contract.
		const usable = existsSync(testFilePath) && statSync(testFilePath).size > 0;
		if (!usable) {
			console.log("Creating test file for feature: " + featureName);
			writeFileSync(testFilePath, template.replaceAll(FEATURE_ID_PLACEHOLDER, featureName));
		}
	}
}

function getFeatureNames(featuresDir: string) {
	// Read the folders from src/features and keep only registered features (those with an index.metadata.ts).
	// Internal helpers such as _registry, buttonController, featureMenu and scrollWheelController have no
	// metadata of their own and are covered by the specs of the features that use them.
	const featureFolders = readdirSync(featuresDir, { withFileTypes: true })
		.filter(
			(dirent) =>
				dirent.isDirectory() &&
				dirent.name !== "__tests__" &&
				existsSync(join(featuresDir, dirent.name, "index.metadata.ts"))
		)
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
