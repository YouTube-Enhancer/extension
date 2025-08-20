import { toggleElementVisibility } from "@/src/utils/utilities";
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

export function hideShorts() {
	// Hide the shorts tab on the channel page
	hideShortsTabOnChannelPage();
	// Hide the shorts tab on the search results page
	hideShortsTabOnSearchResultsPage();
	// Hide the shorts grid shelves on the search results page
	hideShortsGridShelves();
	// Hide the shorts section on the homepage
	hideShortsSectionOnHomePage();
	// Hide the shorts section on the channel home page
	hideShortsSectionOnChannelHomePage();
	//  Hide the shorts sidebar items
	hideSideBarShortsButton();
	// Hide the shorts video renderers
	hideShortsVideoRenderers();
}

export function observeShortsElements() {
	const observerOptions: MutationObserverInit = {
		childList: true,
		subtree: true
	};

	const observer = new MutationObserver((mutations) => {
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
			hideShorts();
		}
	});

	observer.observe(document.body, observerOptions);

	// Return the observer so it can be disconnected later
	return observer;
}

export function showShorts() {
	// Show the shorts sidebar items
	showSideBarShortsButton();
	// Show the shorts section on the homepage
	showShortsSectionOnHomePage();
	// Show the shorts section on the channel home page
	showShortsSectionOnChannelHomePage();
	// Show the shorts tab on the channel page
	showShortsTabOnChannelPage();
	// Show the shorts tab on the search results page
	showShortsTabOnSearchResultsPage();
	// Show the shorts grid shelves on the search results page
	showShortsGridShelves();
	// Show the shorts video renderers
	showShortsVideoRenderers();
}

function hideElement(element: HTMLElement) {
	element.classList.add("yte-hide-shorts");
}

function hideShortsGridShelves() {
	toggleElementVisibility(searchResultsShortsGridShelfSelector, hideElement);
}
function hideShortsSectionOnChannelHomePage() {
	toggleElementVisibility(channelHomePageShortsSectionSelector, hideElement);
}
function hideShortsSectionOnHomePage() {
	toggleElementVisibility(homePageShortsSectionSelector, hideElement);
}
function hideShortsTabOnChannelPage() {
	toggleElementVisibility(channelPageShortsTabSelector, hideElement);
}
function hideShortsTabOnSearchResultsPage() {
	toggleElementVisibility(searchResultsShortsTabSelector, hideElement);
}

function hideShortsVideoRenderers() {
	toggleElementVisibility(shortsVideoRendererSelector, hideElement);
}

function hideSideBarShortsButton() {
	toggleElementVisibility(sideBarOpenedShortsButtonSelector, hideElement);
	toggleElementVisibility(sideBarClosedShortsButtonSelector, hideElement);
}

function showElement(element: HTMLElement) {
	element.classList.remove("yte-hide-shorts");
}

function showShortsGridShelves() {
	toggleElementVisibility(searchResultsShortsGridShelfSelector, showElement);
}

function showShortsSectionOnChannelHomePage() {
	toggleElementVisibility(channelHomePageShortsSectionSelector, showElement);
}
function showShortsSectionOnHomePage() {
	toggleElementVisibility(homePageShortsSectionSelector, showElement);
}
function showShortsTabOnChannelPage() {
	toggleElementVisibility(channelPageShortsTabSelector, showElement);
}
function showShortsTabOnSearchResultsPage() {
	toggleElementVisibility(searchResultsShortsTabSelector, showElement);
}
function showShortsVideoRenderers() {
	toggleElementVisibility(shortsVideoRendererSelector, showElement);
}
function showSideBarShortsButton() {
	toggleElementVisibility(sideBarOpenedShortsButtonSelector, showElement);
	toggleElementVisibility(sideBarClosedShortsButtonSelector, showElement);
}
