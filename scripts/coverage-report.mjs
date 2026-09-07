// Turns the raw V8 coverage written by a PLAYWRIGHT_COVERAGE=1 run (coverage/raw) into a report under
// coverage/report, mapped back to the TypeScript sources through the source maps of the build in dist/Chrome.
// Run from the repo root after building with COVERAGE_BUILD=true: node scripts/coverage-report.mjs
import { existsSync, readdirSync, readFileSync } from "fs";
import MCR from "monocart-coverage-reports";
import { join } from "path";
import { gunzipSync } from "zlib";

const root = process.cwd();
const rawDir = join(root, "coverage", "raw");
const distDir = join(root, "dist", "Chrome");
const sources = new Map();
const maps = new Map();

function mapFor(url) {
	const { pathname } = new URL(url);
	if (!maps.has(pathname)) {
		const mapPath = join(distDir, `${pathname}.map`);
		maps.set(pathname, existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, "utf8")) : undefined);
	}
	return maps.get(pathname);
}
/**
 * Trims a source map path to its repository-relative form. Libraries bundled with their own source maps come
 * through as well; they keep a vendor marker so the filter can drop them, and whatever remains must exist on disk.
 */
function normalise(filePath) {
	const unified = filePath.replace(/\\/g, "/");
	const vendor = unified.lastIndexOf("node_modules/");
	if (vendor >= 0) return `vendor/${unified.slice(vendor + "node_modules/".length)}`;
	const index = unified.lastIndexOf("src/");
	return index >= 0 ? unified.slice(index) : unified;
}
function sourceFor(hash) {
	if (!sources.has(hash)) sources.set(hash, readFileSync(join(rawDir, "sources", `${hash}.js`), "utf8"));
	return sources.get(hash);
}

/**
 * Left out of the report: tests, the build pipeline and the manifest, and code that only runs in development builds (the
 * registry's performance tracker is switched by DEV_MODE), like the devtools pages themselves.
 */
const EXCLUDED = /__tests__|_tests|\.spec\.|\.d\.ts$|src[\\/]pipeline|src[\\/]manifest|featurePerformanceTracker/;

const mcr = MCR({
	// Every product file counts, executed or not, so an untested module reads as 0 rather than going missing.
	all: {
		dir: ["src"],
		filter: (filePath) => /\.(ts|tsx)$/.test(filePath) && !EXCLUDED.test(filePath)
	},
	name: "YouTube Enhancer end-to-end coverage",
	outputDir: join(root, "coverage", "report"),
	reports: ["console-summary", "json-summary", "v8", "lcovonly"],
	sourceFilter: (sourcePath) => sourcePath.startsWith("src/") && !EXCLUDED.test(sourcePath) && existsSync(join(root, sourcePath)),
	sourcePath: (filePath) => normalise(filePath)
});

const files = readdirSync(rawDir).filter((name) => name.endsWith(".json.gz"));
let attempts = 0;
for (const file of files) {
	const records = JSON.parse(gunzipSync(readFileSync(join(rawDir, file))).toString("utf8"));
	// One record per script per document; the reporter merges them by url with a range tree, which is the only sound way.
	const entries = records.map((entry) => ({
		functions: entry.functions,
		source: sourceFor(entry.sourceHash),
		sourceMap: mapFor(entry.url),
		url: entry.url
	}));
	await mcr.add(entries);
	attempts++;
}
console.log(`merged ${attempts} test attempts`);
const results = await mcr.generate();
console.log(`report: ${results.reportPath}`);
