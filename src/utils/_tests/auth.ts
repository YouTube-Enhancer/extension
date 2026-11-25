import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

/**
 * True when a logged-in profile exists AND will be used: playwright.config.ts only copies the profile into the
 * test context outside CI mode, so under CI=1 the specs must treat the session as logged out.
 *
 * The directory only proves the credentials were SAVED, not that YouTube still honours them: cookies sit
 * unexpired while the session is dead server-side (401/403 answered by a logged-out UI — bucket 2 of
 * `plans/FULL-SUITE-2026-11-17.md`), which let the login-required tests run and fail as eight product
 * failures. So a saved profile has to prove a live session against a logged-in indicator before it counts;
 * a session the server refuses fails fast here, with an unmistakable auth error, instead of timing out
 * inside every server-write/read assertion.
 */
export function hasAuthState(): boolean {
	if (process.env.CI) return false;
	const profile = join(process.cwd(), "playwright", ".auth-profile");
	if (!existsSync(profile)) return false;
	if (!isSessionAlive(profile)) {
		throw new Error(
			"Auth session is dead: playwright/.auth-profile exists but YouTube no longer honours it. " +
				"Run `pnpm run test:auth` to refresh the session, then re-run the tests."
		);
	}
	return true;
}

/** One probe per process — `hasAuthState()` is called from every auth-guarded test body. */
let sessionAlive: boolean | undefined;

function isSessionAlive(profile: string): boolean {
	sessionAlive ??= probeSession(profile);
	return sessionAlive;
}

/**
 * The probe itself: open the saved profile in a throwaway copy and read where `youtube.com/account`
 * lands — YouTube serves that page to a live session and bounces a dead one to accounts.google.com
 * (ServiceLogin), exactly the logged-out UI the dead session produced. Headless, so no probe window
 * can steal the foreground the fullscreen toggles need, and cookie files only, so the copy is cheap.
 * Any probe that cannot run fails OPEN (reports alive): only a session the server provably refuses
 * may block the suite, and a broken probe must not.
 */
function probeSession(profile: string): boolean {
	try {
		const verdict = execFileSync(process.execPath, ["-e", SESSION_PROBE, profile], {
			cwd: process.cwd(),
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
			timeout: 75_000,
			windowsHide: true
		});
		return verdict.trim() !== "dead";
	} catch {
		return true;
	}
}

/** Body of `node -e <this> <profileDir>`; prints `alive` or `dead` — see `probeSession`. */
const SESSION_PROBE = `
const { chromium } = require("playwright");
const { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } = require("fs");
const { dirname, join } = require("path");
const { tmpdir } = require("os");

const COPIES = ["Local State", "Default/Preferences", "Default/Network/Cookies", "Default/Network/TransportSecurity"];

(async () => {
	const probeDir = mkdtempSync(join(tmpdir(), "yte-auth-probe-"));
	try {
		for (const relative of COPIES) {
			const source = join(process.argv[1], relative);
			if (!existsSync(source)) continue;
			const target = join(probeDir, relative);
			mkdirSync(dirname(target), { recursive: true });
			cpSync(source, target);
		}
		const context = await chromium.launchPersistentContext(probeDir, {
			headless: true,
			args: ["--mute-audio", "--no-sandbox"],
			serviceWorkers: "block"
		});
		try {
			const page = context.pages()[0] || (await context.newPage());
			await page.goto("https://www.youtube.com/account", {
				waitUntil: "domcontentloaded",
				timeout: 45000
			});
			let state = { host: new URL(page.url()).host };
			if (state.host.endsWith("youtube.com")) {
				await page.waitForSelector("ytd-masthead", { timeout: 15000 }).catch(() => null);
				state = await page.evaluate(() => ({
					host: location.hostname,
					masthead: !!document.querySelector("ytd-masthead"),
					avatar: !!document.querySelector("ytd-masthead #avatar-btn"),
					serviceLogin: !!document.querySelector('a[href*="ServiceLogin"]')
				}));
			}
			// Dead when YouTube refused to serve the account page (redirected to Google sign-in),
			// or when a YouTube page renders its logged-out masthead (sign-in link, no avatar).
			const dead =
				state.host === "accounts.google.com" ||
				(state.masthead && !state.avatar && state.serviceLogin);
			process.stdout.write(dead ? "dead" : "alive");
		} finally {
			await context.close().catch(() => {});
		}
	} finally {
		rmSync(probeDir, { recursive: true, force: true });
	}
})().catch(() => process.exit(1));
`;
