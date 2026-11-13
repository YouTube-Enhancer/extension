import { defineConfig, devices } from "@playwright/test";

// Five keeps the suite ~36% faster than three without tripping YouTube's per-IP
// throttle, which starts showing "video unavailable" error pages somewhere
// between five and eight concurrent workers and corrupts results.
const workers = process.env.PLAYWRIGHT_WORKERS ? Number(process.env.PLAYWRIGHT_WORKERS) : 5;
export default defineConfig({
	// Bare expects default to Playwright's 5s, which live YouTube pages under
	// full-suite load routinely exceed; 10s matches the real render times.
	expect: { timeout: 15_000 },
	fullyParallel: true,
	globalSetup: "./tests/globalSetup.ts",
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				permissions: ["clipboard-read", "clipboard-write"]
			}
		},
		{
			name: "firefox",
			use: {
				...devices["Desktop Firefox"]
			}
		}
	],
	reporter: [["list"], ["html", { host: "0.0.0.0", open: "on-failure", port: 9323 }]],
	retries: 1,
	testDir: ".",
	timeout: 120_000,
	use: {
		actionTimeout: 15_000,
		navigationTimeout: 30_000,
		screenshot: {
			fullPage: true,
			mode: "only-on-failure",
			omitBackground: true
		},
		trace: {
			attachments: true,
			mode: "retain-on-failure",
			screenshots: true,
			snapshots: true
		},
		video: {
			mode: "retain-on-failure",
			size: {
				height: 720,
				width: 1280
			}
		},
		viewport: {
			height: 720,
			width: 1280
		}
	},
	workers
});
