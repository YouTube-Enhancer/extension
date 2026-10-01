import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { cwd } from "process";

/**
 * Ensures the extension dist contains production HTML before tests run.
 * During `pnpm run dev`, hmrServer.ts rewrites the page HTML to load scripts from a
 * localhost Vite dev server for HMR. If that dev-mode HTML is left in dist/Chrome and
 * the dev server is not running, the Options (and other) pages load the HTML shell but
 * no JavaScript executes, so React never mounts and every UI assertion fails.
 */
export default function ensureProductionBuild(): void {
	const optionsHtml = join(cwd(), "dist", "Chrome", "src", "pages", "options", "index.html");
	if (!existsSync(optionsHtml)) {
		console.log("[globalSetup] dist/Chrome not found, running production build...");
		execSync("pnpm run build", { cwd: cwd(), stdio: "inherit" });
		return;
	}
	const html = readFileSync(optionsHtml, "utf8");
	if (html.includes("127.0.0.1") || html.includes("@vite/client")) {
		console.log("[globalSetup] dev-mode HTML detected in dist/Chrome, running production build...");
		execSync("pnpm run build", { cwd: cwd(), stdio: "inherit" });
	}
}
