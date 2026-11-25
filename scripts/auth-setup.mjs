import { join } from "node:path";
import { chromium } from "playwright";

const AUTH_PROFILE = join(process.cwd(), "playwright", ".auth-profile");

const context = await chromium.launchPersistentContext(AUTH_PROFILE, {
	args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
	channel: "chrome",
	headless: false
});

try {
	const page = context.pages()[0] ?? (await context.newPage());

	if (!page.url().startsWith("https://www.youtube.com")) {
		await page.goto("https://www.youtube.com", {
			waitUntil: "domcontentloaded"
		});
	}

	console.log("Log into YouTube, then press Enter or close the browser.");

	process.stdin.resume();

	await Promise.race([
		new Promise((resolve) => process.stdin.once("data", resolve)),
		new Promise((resolve) => context.browser()?.once("disconnected", resolve))
	]);
} finally {
	process.stdin.pause();
	await context.close().catch(() => {});
}
