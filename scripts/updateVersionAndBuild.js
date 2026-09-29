#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";

const version = process.argv[2];
if (!version) {
	console.error("❌ No version argument provided.");
	process.exit(1);
}

try {
	// Update package.json
	const pkgPath = "package.json";
	const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
	pkg.version = version;
	fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
	console.log(`✅ Updated package.json to version ${version}`);

	// Run build
	console.log("🏗  Running build...");
	execSync("pnpm run build", { stdio: "inherit" });
} catch (err) {
	console.error("❌ Failed to update version and build:", err);
	process.exit(1);
}
