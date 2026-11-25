import type { Page } from "@playwright/test";

import { pageTypeRecord } from "@/src/utils/_tests/constants";
import { reloadPage } from "@/src/utils/_tests/navigation";
import { expect } from "@/tests/harness";

const { watch } = pageTypeRecord;

/**
 * Switches YouTube's own autoplay off, so an ended video stays on screen. A click aimed at a player YouTube has
 * not finished wiring up is dropped and leaves the toggle on, so the click is repeated a few times instead of
 * trusting the first one. When YouTube's newer control bar has folded the toggle away (inline `display: none`)
 * the button is inert; the player's own autonav API is tried then, and a fresh load, which usually unfolds it,
 * is the fallback after that.
 */
export async function turnOffAutoPlay(page: Page): Promise<void> {
	const toggleState = page.locator(".ytp-autonav-toggle-button");
	for (let load = 0; load < 3; load++) {
		await expect(toggleState).toHaveAttribute("aria-checked", /^(true|false)$/);
		for (let attempt = 0; attempt < 4; attempt++) {
			if ((await toggleState.getAttribute("aria-checked")) === "false") return;
			await page.locator(".ytp-autonav-toggle").evaluate((el) => {
				const toggle = el as HTMLButtonElement;
				const player = document.querySelector<
					HTMLElement & { setAutonav?: (enabled: boolean) => void }
				>("#movie_player");
				if (toggle.style.display === "none" && typeof player?.setAutonav === "function")
					player.setAutonav(false);
				else toggle.click();
			});
			const off = await expect(toggleState)
				.toHaveAttribute("aria-checked", "false", { timeout: 2500 })
				.then(() => true)
				.catch(() => false);
			if (off) return;
		}
		await reloadPage(page, watch);
	}
	await expect(toggleState).toHaveAttribute("aria-checked", "false");
}
