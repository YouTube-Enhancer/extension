import { execSync } from "child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { cwd } from "process";

/**
 * Ensures the extension dist contains a test-capable build before tests run.
 *
 * Tests need a development-mode build (`NODE_ENV=development pnpm run build`):
 * the E2E entrypoints (test_setConfigValue, yte-config-processing) are compiled
 * only when DEV_MODE is true and are dropped from release builds. Two dist states
 * are unusable:
 * - During `pnpm run dev`, hmrServer.ts rewrites the page HTML to load scripts
 *   from a localhost Vite dev server for HMR. If that HTML is left in dist and
 *   the dev server is not running, the pages load the HTML shell but no
 *   JavaScript executes, so React never mounts and every UI assertion fails.
 * - A release build compiles the E2E entrypoints out, so the config helpers
 *   cannot work at all.
 */
const E2E_MARKER = "yte-config-processing";
/**
 * Build inputs: a dist older than any of these is stale even when every presence
 * check above passes. This is how a build can ship without an entire feature
 * (sources picked up after the last build, dist still test-capable), which
 * failed every spec for the feature in ways that looked like test bugs.
 */
const SOURCE_ROOTS = ["src", "public"];
const SOURCE_FILES = [
	"package.json",
	"pnpm-lock.yaml",
	"pnpm-workspace.yaml",
	"tsconfig.json",
	"vite.config.ts"
];

export default function ensureTestCapableBuild(): void {
	const optionsHtml = join(cwd(), "dist", "Chrome", "src", "pages", "options", "index.html");
	if (!existsSync(optionsHtml)) {
		buildTestDist("dist/Chrome not found");
		return;
	}
	const html = readFileSync(optionsHtml, "utf8");
	if (html.includes("127.0.0.1") || html.includes("@vite/client")) {
		buildTestDist("dev-server HTML detected in dist/Chrome");
		return;
	}
	const contentBundle = join(cwd(), "dist", "Chrome", "src", "pages", "content", "index.js");
	if (!existsSync(contentBundle) || !readFileSync(contentBundle, "utf8").includes(E2E_MARKER)) {
		buildTestDist("E2E entrypoints missing from dist/Chrome (release build)");
		return;
	}
	// The oldest of the two build outputs, so a dist where only one bundle stage
	// was rebuilt still counts as stale against newer sources.
	const builtAt = Math.min(statSync(optionsHtml).mtimeMs, statSync(contentBundle).mtimeMs);
	if (newestSourceMtimeMs() > builtAt) {
		buildTestDist("sources are newer than dist/Chrome");
	}
}

function buildTestDist(reason: string): void {
	console.log(`[globalSetup] ${reason}, running development build for tests...`);
	execSync("pnpm run build", {
		cwd: cwd(),
		env: { ...process.env, NODE_ENV: "development" },
		stdio: "inherit"
	});
}

/** Newest mtime across the build inputs (files only, not directories). */
function newestSourceMtimeMs(): number {
	let newest = 0;
	const consider = (path: string): void => {
		try {
			const stats = statSync(path);
			if (stats.isFile() && stats.mtimeMs > newest) newest = stats.mtimeMs;
		} catch {
			// A file can vanish mid-scan; its mtime is not our problem then.
		}
	};
	for (const root of SOURCE_ROOTS) {
		const dir = join(cwd(), root);
		if (!existsSync(dir)) continue;
		for (const entry of readdirSync(dir, { encoding: "utf8", recursive: true }))
			consider(join(dir, entry));
	}
	for (const file of SOURCE_FILES) consider(join(cwd(), file));
	return newest;
}
