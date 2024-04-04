import { navigateToOptionsPage, test } from "playwright.config";
test.beforeEach(async ({ extensionId, page }) => {
	await navigateToOptionsPage(page, extensionId);
});

// TODO: Implement tests
