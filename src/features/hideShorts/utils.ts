export const sideBarOpenedShortsButtonSelector = "ytd-guide-entry-renderer:has(a[title=Shorts])";
export const sideBarClosedShortsButtonSelector = "ytd-mini-guide-entry-renderer:has(a[title=Shorts])";
export const homePageShortsSectionSelector = "ytd-rich-section-renderer:has(#rich-shelf-header)";
export const channelHomePageShortsSectionSelector = "ytd-reel-shelf-renderer:has(#title-container)";
export const channelPageShortsTabSelector = "yt-tab-shape[tab-title=Shorts]";
export const searchResultsShortsTabSelector = "yt-chip-cloud-chip-renderer:has(yt-formatted-string[title=Shorts])";
export const shortsVideoRendererSelector = "ytd-video-renderer:has([overlay-style=SHORTS])";

type ElementVisibilityAction = (element: HTMLElement) => void;

function toggleElementVisibility(selector: string, action: ElementVisibilityAction) {
	const elements = document.querySelectorAll<HTMLDivElement>(selector);
	elements.forEach((element) => action(element));
}

function hideElement(element: HTMLElement) {
	element.classList.add("yte-hide-shorts");
}

function showElement(element: HTMLElement) {
	element.classList.remove("yte-hide-shorts");
}

function hideSideBarShortsButton() {
	toggleElementVisibility(sideBarOpenedShortsButtonSelector, hideElement);
	toggleElementVisibility(sideBarClosedShortsButtonSelector, hideElement);
}

function showSideBarShortsButton() {
	toggleElementVisibility(sideBarOpenedShortsButtonSelector, showElement);
	toggleElementVisibility(sideBarClosedShortsButtonSelector, showElement);
}
function hideShortsTabOnSearchResultsPage() {
	toggleElementVisibility(searchResultsShortsTabSelector, hideElement);
}
function showShortsTabOnSearchResultsPage() {
	toggleElementVisibility(searchResultsShortsTabSelector, showElement);
}
function hideShortsSectionOnHomePage() {
	toggleElementVisibility(homePageShortsSectionSelector, hideElement);
}

function showShortsSectionOnHomePage() {
	toggleElementVisibility(homePageShortsSectionSelector, showElement);
}

function hideShortsSectionOnChannelHomePage() {
	toggleElementVisibility(channelHomePageShortsSectionSelector, hideElement);
}

function showShortsSectionOnChannelHomePage() {
	toggleElementVisibility(channelHomePageShortsSectionSelector, showElement);
}

function hideShortsTabOnChannelPage() {
	toggleElementVisibility(channelPageShortsTabSelector, hideElement);
}

function showShortsTabOnChannelPage() {
	toggleElementVisibility(channelPageShortsTabSelector, showElement);
}
function hideShortsVideoRenderers() {
	toggleElementVisibility(shortsVideoRendererSelector, hideElement);
}
function showShortsVideoRenderers() {
	toggleElementVisibility(shortsVideoRendererSelector, showElement);
}
export function hideShorts() {
	// Hide the shorts tab on the channel page
	hideShortsTabOnChannelPage();
	// Hide the shorts tab on the search results page
	hideShortsTabOnSearchResultsPage();
	// Hide the shorts section on the homepage
	hideShortsSectionOnHomePage();
	// Hide the shorts section on the channel home page
	hideShortsSectionOnChannelHomePage();
	//  Hide the shorts sidebar items
	hideSideBarShortsButton();
	// Hide the shorts video renderers
	hideShortsVideoRenderers();
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
	// Show the shorts video renderers
	showShortsVideoRenderers();
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
					mutation.target.matches(shortsVideoRendererSelector))
			);
		});

		// Only call hideShorts if one of the mutations contains one of the selectors
		if (containsShortsSelector) hideShorts();
	});

	observer.observe(document.body, observerOptions);

	// Return the observer so it can be disconnected later
	return observer;
}
