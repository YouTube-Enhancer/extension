import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
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
