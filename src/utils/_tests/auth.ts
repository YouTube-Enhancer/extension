import { existsSync } from "fs";
import { join } from "path";

export function hasAuthState(): boolean {
	return existsSync(join(process.cwd(), "playwright", ".auth-profile"));
}
