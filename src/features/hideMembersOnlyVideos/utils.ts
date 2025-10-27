import { isChannelHomePage, isChannelVideosPage, isHomePage, isWatchPage, modifyElementsClassList, waitForAllElements } from "@/src/utils/utilities";

const membersOnlyVideoHomePageAndChannelVideosPageSelector =
	"ytd-rich-item-renderer:has(path[d='M12 23c6.075 0 11-4.925 11-11S18.075 1 12 1 1 5.925 1 12s4.925 11 11 11Zm2.351-14.236 4.054.59a.6.6 0 01.333 1.023l-2.934 2.86.692 4.038a.6.6 0 01-.87.632L12 16l-3.627 1.906a.6.6 0 01-.87-.632l.693-4.037-2.934-2.86a.6.6 0 01.333-1.024l4.054-.589 1.813-3.674a.6.6 0 011.076 0l1.813 3.674Z'])";
const membersOnlyVideosChannelHomePageSelector =
	"ytd-item-section-renderer:has(path[d='M12 23c6.075 0 11-4.925 11-11S18.075 1 12 1 1 5.925 1 12s4.925 11 11 11Zm2.351-14.236 4.054.59a.6.6 0 01.333 1.023l-2.934 2.86.692 4.038a.6.6 0 01-.87.632L12 16l-3.627 1.906a.6.6 0 01-.87-.632l.693-4.037-2.934-2.86a.6.6 0 01.333-1.024l4.054-.589 1.813-3.674a.6.6 0 011.076 0l1.813 3.674Z'])";
const membersOnlyVideoWatchPageSelector =
	"yt-lockup-view-model:has(path[d='M6 .5a5.5 5.5 0 100 11 5.5 5.5 0 000-11Zm.27 2.045.906 1.837 2.027.295a.3.3 0 01.166.511l-1.467 1.43.346 2.019a.3.3 0 01-.435.316L6 8l-1.813.953a.3.3 0 01-.435-.316l.346-2.019-1.467-1.43a.3.3 0 01.166-.511l2.027-.295.907-1.837a.3.3 0 01.539 0Z'])";

export async function hideMembersOnlyVideos() {
	await hideMembersOnlyVideosOnHomePageAndChannelVideosPage();
	await hideMembersOnlyVideosChannelHomePage();
	await hideMembersOnlyVideosWatchPage();
}
export function observeMembersOnlyVideosElements() {
	const selectors = [
		membersOnlyVideoHomePageAndChannelVideosPageSelector,
		membersOnlyVideosChannelHomePageSelector,
		membersOnlyVideoWatchPageSelector
	];
	const selectorString = selectors.map((s) => `${s}:not(.yte-hide-members-only-videos)`).join(",");
	let debounceId: null | number = null;
	const checkAndHide = () => {
		debounceId = null;
		if (document.querySelector(selectorString)) void hideMembersOnlyVideos();
	};
	const scheduleCheck = (delay = 150) => {
		if (debounceId) clearTimeout(debounceId);
		debounceId = window.setTimeout(checkAndHide, delay);
	};
	const observer = new MutationObserver((mutations) => {
		for (const { addedNodes, type } of mutations) {
			if ((type === "childList" && addedNodes.length) || type === "attributes") {
				scheduleCheck();
				break;
			}
		}
	});
	observer.observe(document.body, {
		attributeFilter: ["class", "style", "hidden", "aria-hidden"],
		attributes: true,
		childList: true,
		subtree: true
	});
	return {
		disconnect: () => {
			observer.disconnect();
			if (debounceId) clearTimeout(debounceId);
		},
		observer
	};
}

export async function showMembersOnlyVideos() {
	await showMembersOnlyVideosOnHomePageAndChannelVideosPage();
	await showMembersOnlyVideosChannelHomePage();
	await showMembersOnlyVideosWatchPage();
}
async function hideMembersOnlyVideosChannelHomePage() {
	if (!isChannelHomePage()) return;
	await waitForAllElements([membersOnlyVideosChannelHomePageSelector]);
	modifyElementsClassList("add", "yte-hide-members-only-videos", document.querySelectorAll(membersOnlyVideosChannelHomePageSelector));
}
async function hideMembersOnlyVideosOnHomePageAndChannelVideosPage() {
	if (!(isHomePage() || isChannelVideosPage())) return;
	await waitForAllElements([membersOnlyVideoHomePageAndChannelVideosPageSelector]);
	modifyElementsClassList("add", "yte-hide-members-only-videos", document.querySelectorAll(membersOnlyVideoHomePageAndChannelVideosPageSelector));
}
async function hideMembersOnlyVideosWatchPage() {
	if (!isWatchPage()) return;
	await waitForAllElements([membersOnlyVideoWatchPageSelector]);
	modifyElementsClassList("add", "yte-hide-members-only-videos", document.querySelectorAll(membersOnlyVideoWatchPageSelector));
}
async function showMembersOnlyVideosChannelHomePage() {
	if (!isChannelHomePage()) return;
	await waitForAllElements([membersOnlyVideosChannelHomePageSelector]);
	modifyElementsClassList("remove", "yte-hide-members-only-videos", document.querySelectorAll(membersOnlyVideosChannelHomePageSelector));
}
async function showMembersOnlyVideosOnHomePageAndChannelVideosPage() {
	if (!(isHomePage() || isChannelVideosPage())) return;
	await waitForAllElements([membersOnlyVideoHomePageAndChannelVideosPageSelector]);
	modifyElementsClassList("remove", "yte-hide-members-only-videos", document.querySelectorAll(membersOnlyVideoHomePageAndChannelVideosPageSelector));
}
async function showMembersOnlyVideosWatchPage() {
	if (!isWatchPage()) return;
	await waitForAllElements([membersOnlyVideoWatchPageSelector]);
	modifyElementsClassList("remove", "yte-hide-members-only-videos", document.querySelectorAll(membersOnlyVideoWatchPageSelector));
}
