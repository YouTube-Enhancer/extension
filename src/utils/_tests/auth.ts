import { existsSync } from "fs";
import { join } from "path";

/**
 * True when a logged-in profile exists AND will be used: playwright.config.ts only copies the profile into the
 * test context outside CI mode, so under CI=1 the specs must treat the session as logged out.
 */
export function hasAuthState(): boolean {
	if (process.env.CI) return false;
	return existsSync(join(process.cwd(), "playwright", ".auth-profile"));
}
