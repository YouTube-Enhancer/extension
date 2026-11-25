// Generates coverage/report/coverage-details.md (the per-file companion table) from
// coverage/report/coverage-summary.json. The monocart output-dir cleanup deletes the
// previous copy on every regeneration, so run this right after scripts/coverage-report.mjs:
//   node scripts/coverage-details.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const summaryPath = join(root, "coverage", "report", "coverage-summary.json");
const outPath = join(root, "coverage", "report", "coverage-details.md");
const summary = JSON.parse(readFileSync(summaryPath, "utf8"));

const AREAS = [
	"src/features",
	"src/utils",
	"src/components",
	"src/pages",
	"src/ui",
	"src/hooks",
	"src/_setup",
	"src/validation",
	"src/i18n"
];

const areaOf = (path) => AREAS.find((area) => path.startsWith(`${area}/`)) ?? "other";

const rows = Object.entries(summary)
	.filter(([path]) => path !== "total")
	.map(([path, m]) => ({
		area: areaOf(path),
		branches: m.branches,
		functions: m.functions,
		path,
		stmts: m.statements
	}));

const byArea = new Map();
for (const row of rows) {
	if (!byArea.has(row.area)) byArea.set(row.area, []);
	byArea.get(row.area).push(row);
}

const fmt = (m) => `${m.covered}/${m.total} (${m.pct.toFixed(1)}%)`;
const lines = [
	"# Coverage details",
	"",
	`Per-file tables generated from \`coverage-summary.json\` (${rows.length} files).`,
	""
];

const orderedAreas = [...AREAS, "other"].filter((area) => byArea.has(area));
for (const area of orderedAreas) {
	const files = byArea.get(area).sort((a, b) => a.stmts.pct - b.stmts.pct);
	lines.push(
		`## ${area}`,
		"",
		"| File | Statements | Branches | Functions |",
		"| ---- | ---------- | -------- | --------- |"
	);
	for (const file of files) {
		lines.push(
			`| \`${file.path.slice(area.length + 1)}\` | ${fmt(file.stmts)} | ${fmt(file.branches)} | ${fmt(file.functions)} |`
		);
	}
	lines.push("");
}

writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`details: ${outPath} (${rows.length} files across ${orderedAreas.length} areas)`);
