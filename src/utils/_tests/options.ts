import { expect, type Locator, type Page } from "@playwright/test";

/** How long the settings round trip is given before the checkbox is expected to render the new state. */
const CHECKBOX_SETTLE_TIMEOUT = 15000;

/**
 * Drives a checkbox on the options page and waits for the new state to be rendered back.
 *
 * The options page renders every checkbox as a controlled React input whose `checked` prop comes from the
 * settings query (`src/components/Settings/Settings.tsx`), and the change handler only writes to
 * `chrome.storage.local` - the query is refetched afterwards. React therefore restores the pre-click DOM state
 * as soon as the change event has been handled, which is what Playwright's `check()`/`uncheck()` report as
 * "Clicking the checkbox did not change its state" because they verify the flip synchronously. Clicking once
 * and then polling the rendered state waits for that storage round trip instead, so a settled `toBeChecked()`
 * doubles as proof that the write landed.
 */
export async function setCheckbox(page: Page, label: string, checked: boolean, timeout = CHECKBOX_SETTLE_TIMEOUT): Promise<Locator> {
	const checkbox = page.getByLabel(label, { exact: true });
	await expect(checkbox, `checkbox "${label}" has to be interactable before it can be toggled`).toBeEnabled({ timeout });
	if ((await checkbox.isChecked()) !== checked) {
		await checkbox.click();
	}
	await expect(checkbox, `checkbox "${label}" should have settled on ${checked ? "checked" : "unchecked"}`).toBeChecked({ checked, timeout });
	return checkbox;
}
