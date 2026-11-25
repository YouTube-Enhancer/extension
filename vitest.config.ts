import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRepoRoot = (relativePath: string): string =>
	fileURLToPath(new URL(relativePath, import.meta.url));

/**
 * Unit-test runner configuration.
 *
 * Only `*.test.ts` is collected so the `*.spec.ts` files on `playwright-testing` are never picked
 * up if the branches ever merge. The `resolve.alias` entries mirror tsconfig's `paths` so tests can
 * import product modules through the same `@/...` specifiers the source uses.
 */
export default defineConfig({
	resolve: {
		alias: {
			"@/public/locales": fromRepoRoot("./public/locales"),
			"@/src": fromRepoRoot("./src")
		}
	},
	test: {
		include: ["**/*.test.ts"]
	}
});
