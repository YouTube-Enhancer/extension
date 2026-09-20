#!/usr/bin/env node
/**
 * Refuses `pnpm install` from WSL when the project sits on a Windows drive (/mnt/<drive>/...).
 *
 * One checkout on a Windows drive is often shared between a Windows shell and WSL. pnpm-workspace.yaml installs the
 * native binaries for both platforms, so a node_modules created from Windows works from both sides: Windows makes
 * junctions, which WSL reads as symlinks. The reverse is not true: symlinks pnpm creates from WSL on a /mnt path are
 * reparse points Windows cannot follow, the .bin shims lack their .cmd variants, and pnpm keeps a separate store per
 * side, so Windows tools (Node, VS Code's TypeScript server, a running `pnpm run dev`) break until the next install
 * from Windows. Installing from Windows only avoids that flip-flop.
 *
 * From WSL you can still run every script, and `pnpm install --lockfile-only` updates pnpm-lock.yaml without touching
 * node_modules. Set ALLOW_WSL_INSTALL=1 to bypass this check for a checkout that is only ever used from WSL.
 */
import { release } from "node:os";

const onWsl = process.platform === "linux" && /microsoft/i.test(release());
const onWindowsDrive = /^\/mnt\/[a-z]\//i.test(process.cwd());

if (onWsl && onWindowsDrive && !process.env.ALLOW_WSL_INSTALL) {
	console.error(
		[
			"",
			"This checkout is on a Windows drive and pnpm is running inside WSL.",
			"An install from here creates symlinks and a node_modules layout that Windows cannot use,",
			"so run `pnpm install` from a Windows shell (PowerShell, cmd or Git Bash) instead.",
			"",
			"From WSL you can still run scripts (`pnpm run build`, `pnpm run lint`, ...) against the",
			"node_modules created from Windows, and `pnpm install --lockfile-only` updates pnpm-lock.yaml",
			"after a package.json change. Set ALLOW_WSL_INSTALL=1 to bypass this check.",
			""
		].join("\n")
	);
	process.exit(1);
}
