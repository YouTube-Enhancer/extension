import { modifyElementsClassList } from "@/src/utils/utilities";
export const sideBarOpenedShortsButtonSelector = "ytd-guide-entry-renderer:has(a[title=Shorts])";
export const sideBarClosedShortsButtonSelector = "ytd-mini-guide-entry-renderer:has(a[title=Shorts])";
export const homePageShortsSectionSelector = "ytd-rich-shelf-renderer[is-shorts]";
export const channelHomePageShortsSectionSelector = "ytd-reel-shelf-renderer:has(#title-container)";
export const channelPageShortsTabSelector = "yt-tab-shape[tab-title=Shorts]";
export const searchResultsShortsTabSelector = "yt-chip-cloud-chip-renderer:has(yt-formatted-string[title=Shorts])";
const shortsIconD =
	"m19.45,3.88c1.12,1.82.48,4.15-1.42,5.22l-1.32.74.94.41c1.36.58,2.27,1.85,2.35,3.27.08,1.43-.68,2.77-1.97,3.49l-8,4.47c-1.91,1.06-4.35.46-5.48-1.35-1.12-1.82-.48-4.15,1.42-5.22l1.33-.74-.94-.41c-1.36-.58-2.27-1.85-2.35-3.27-.08-1.43.68-2.77,1.97-3.49l8-4.47c1.91-1.06,4.35-.46,5.48,1.35Z";
export const searchResultsShortsGridShelfSelector = `grid-shelf-view-model:has([d='${shortsIconD}'])`;
export const shortsVideoRendererSelector = "ytd-video-renderer:has([overlay-style=SHORTS])";

export async function hideShorts() {
	// Hide the shorts tab on the channel page
	await hideShortsTabOnChannelPage();
	// Hide the shorts tab on the search results page
	await hideShortsTabOnSearchResultsPage();
	// Hide the shorts grid shelves on the search results page
	await hideShortsGridShelves();
	// Hide the shorts section on the homepage
	await hideShortsSectionOnHomePage();
	// Hide the shorts section on the channel home page
	await hideShortsSectionOnChannelHomePage();
	//  Hide the shorts sidebar items
	await hideSideBarShortsButton();
	// Hide the shorts video renderers
	await hideShortsVideoRenderers();
}

export function observeShortsElements() {
	const observerOptions: MutationObserverInit = {
		childList: true,
		subtree: true
	};

	const observer = new MutationObserver(async (mutations) => {
		// Check if any mutation contains one of the specified selectors
		const containsShortsSelector = mutations.some((mutation) => {
			return (
				mutation.target instanceof Element &&
				(mutation.target.matches(sideBarOpenedShortsButtonSelector) ||
					mutation.target.matches(sideBarClosedShortsButtonSelector) ||
					mutation.target.matches(homePageShortsSectionSelector) ||
					mutation.target.matches(channelHomePageShortsSectionSelector) ||
					mutation.target.matches(channelPageShortsTabSelector) ||
					mutation.target.matches(searchResultsShortsTabSelector) ||
					mutation.target.matches(shortsVideoRendererSelector) ||
					mutation.target.matches(searchResultsShortsGridShelfSelector))
			);
		});

		// Only call hideShorts if one of the mutations contains one of the selectors
		if (containsShortsSelector) {
			await hideShorts();
		}
	});

	observer.observe(document.body, observerOptions);

	// Return the observer so it can be disconnected later
	return observer;
}

export async function showShorts() {
	// Show the shorts sidebar items
	await showSideBarShortsButton();
	// Show the shorts section on the homepage
	await showShortsSectionOnHomePage();
	// Show the shorts section on the channel home page
	await showShortsSectionOnChannelHomePage();
	// Show the shorts tab on the channel page
	await showShortsTabOnChannelPage();
	// Show the shorts tab on the search results page
	await showShortsTabOnSearchResultsPage();
	// Show the shorts grid shelves on the search results page
	await showShortsGridShelves();
	// Show the shorts video renderers
	await showShortsVideoRenderers();
}
async function hideShortsGridShelves() {
	modifyElementsClassList(
		"add",
		Array.from(document.querySelectorAll(searchResultsShortsGridShelfSelector)).map((element) => ({ className: "yte-hide-shorts", element }))
	);
}
async function hideShortsSectionOnChannelHomePage() {
	modifyElementsClassList(
		"add",
		Array.from(document.querySelectorAll(channelHomePageShortsSectionSelector)).map((element) => ({ className: "yte-hide-shorts", element }))
	);
}
async function hideShortsSectionOnHomePage() {
	modifyElementsClassList(
		"add",
		Array.from(document.querySelectorAll(homePageShortsSectionSelector)).map((element) => ({ className: "yte-hide-shorts", element }))
	);
}
async function hideShortsTabOnChannelPage() {
	modifyElementsClassList(
		"add",
		Array.from(document.querySelectorAll(channelPageShortsTabSelector)).map((element) => ({ className: "yte-hide-shorts", element }))
	);
}
async function hideShortsTabOnSearchResultsPage() {
	modifyElementsClassList(
		"add",
		Array.from(document.querySelectorAll(searchResultsShortsTabSelector)).map((element) => ({ className: "yte-hide-shorts", element }))
	);
}

async function hideShortsVideoRenderers() {
	modifyElementsClassList(
		"add",
		Array.from(document.querySelectorAll(shortsVideoRendererSelector)).map((element) => ({ className: "yte-hide-shorts", element }))
	);
}

async function hideSideBarShortsButton() {
	modifyElementsClassList(
		"add",
		Array.from(document.querySelectorAll(sideBarOpenedShortsButtonSelector)).map((element) => ({ className: "yte-hide-shorts", element }))
	);
	modifyElementsClassList(
		"add",
		Array.from(document.querySelectorAll(sideBarClosedShortsButtonSelector)).map((element) => ({ className: "yte-hide-shorts", element }))
	);
}
async function showShortsGridShelves() {
	modifyElementsClassList(
		"remove",
		Array.from(document.querySelectorAll(searchResultsShortsGridShelfSelector)).map((element) => ({ className: "yte-hide-shorts", element }))
	);
}

async function showShortsSectionOnChannelHomePage() {
	modifyElementsClassList(
		"remove",
		Array.from(document.querySelectorAll(channelHomePageShortsSectionSelector)).map((element) => ({ className: "yte-hide-shorts", element }))
	);
}
async function showShortsSectionOnHomePage() {
	modifyElementsClassList(
		"remove",
		Array.from(document.querySelectorAll(homePageShortsSectionSelector)).map((element) => ({ className: "yte-hide-shorts", element }))
	);
}
async function showShortsTabOnChannelPage() {
	modifyElementsClassList(
		"remove",
		Array.from(document.querySelectorAll(channelPageShortsTabSelector)).map((element) => ({ className: "yte-hide-shorts", element }))
	);
}
async function showShortsTabOnSearchResultsPage() {
	modifyElementsClassList(
		"remove",
		Array.from(document.querySelectorAll(searchResultsShortsTabSelector)).map((element) => ({ className: "yte-hide-shorts", element }))
	);
}
async function showShortsVideoRenderers() {
	modifyElementsClassList(
		"remove",
		Array.from(document.querySelectorAll(shortsVideoRendererSelector)).map((element) => ({ className: "yte-hide-shorts", element }))
	);
}
async function showSideBarShortsButton() {
	modifyElementsClassList(
		"remove",
		Array.from(document.querySelectorAll(sideBarOpenedShortsButtonSelector)).map((element) => ({ className: "yte-hide-shorts", element }))
	);
	modifyElementsClassList(
		"remove",
		Array.from(document.querySelectorAll(sideBarClosedShortsButtonSelector)).map((element) => ({ className: "yte-hide-shorts", element }))
	);
}
