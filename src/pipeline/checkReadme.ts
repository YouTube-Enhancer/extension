import { isReadmeUpToDate } from "./steps/updateReadmeFeatures";

/**
 * `npm run lint:readme`: fails when README.md's feature list no longer matches the feature metadata, so a feature
 * commit without a regenerated README is caught locally and in CI. `npm run build` regenerates the list.
 */
void (async () => {
	try {
		if (await isReadmeUpToDate()) {
			console.log("[Build Pipeline] README.md feature list is up to date");
			return;
		}
		console.error("[Build Pipeline] README.md feature list is stale. Run `npm run build` and commit README.md.");
		process.exit(1);
	} catch (error) {
		console.error("[Build Pipeline] README check failed:", error);
		process.exit(1);
	}
})();
