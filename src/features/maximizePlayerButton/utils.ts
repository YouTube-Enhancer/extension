import eventManager from "@/src/utils/EventManager";

// TODO: get played progress bar to be accurate when maximized from default view
// TODO: Add event listener that updates scrubber position when maximize button is clicked
export function updateProgressBarPositions() {
	const seekBar = document.querySelector<HTMLDivElement>("div.ytp-progress-bar");
	const scrubber = document.querySelector<HTMLDivElement>("div.ytp-scrubber-container");
	const hoverProgress = document.querySelector<HTMLDivElement>("div.ytp-hover-progress");
	if (!seekBar) return;
	if (!scrubber) return;
	if (!hoverProgress) return;
	const elapsedTime = parseInt(seekBar?.ariaValueNow ?? "0") ?? 0;
	const duration = parseInt(seekBar?.ariaValueMax ?? "0") ?? 0;
	const seekBarWidth = seekBar?.clientWidth ?? 0;

	const scrubberPosition = Math.ceil(parseFloat(Math.min((elapsedTime / duration) * seekBarWidth, seekBarWidth).toFixed(1)));
	scrubber.style.transform = `translateX(${scrubberPosition}px)`;
	hoverProgress.style.left = `${scrubberPosition}px`;
}

type Action = "add" | "remove";
type ElementClassPair = { className: string; selector: string };
function modifyElementClassList(action: Action, elementPair: ElementClassPair) {
	const { className, selector } = elementPair;
	const element = document.querySelector<HTMLElement>(selector);
	if (!element) return;
	element.classList[action](className);
}
function modifyElementsClassList(action: Action, elements: ElementClassPair[]) {
	elements.forEach((element) => modifyElementClassList(action, element));
}
function adjustPlayer(action: Action) {
	const elements: ElementClassPair[] = [
		{ className: "yte-maximized-video", selector: "video.html5-main-video" },
		{ className: "yte-maximized-video-container", selector: "div#movie_player" },
		{ className: "yte-maximized-chrome-bottom", selector: "div.ytp-chrome-bottom" },
		{ className: "yte-maximized-chapter-hover-container", selector: "div.ytp-chapter-hover-container" },
		{ className: "yte-maximized-storyboard-framepreview-timestamp", selector: "div.ytp-storyboard-framepreview-timestamp" }
	];
	modifyElementsClassList(action, elements);
}
function adjustTooltip(action: Action, element: ElementClassPair) {
	modifyElementClassList(action, element);
}

export function maximizePlayer() {
	const videoPlayer = document.querySelector<HTMLVideoElement>("video.html5-main-video");
	if (!videoPlayer) return;
	eventManager.addEventListener(videoPlayer, "timeupdate", updateProgressBarPositions, "maximizePlayerButton");
	const chromeBottom = document.querySelector<HTMLDivElement>("div.ytp-chrome-bottom");
	if (!chromeBottom) return;
	const leftControls = chromeBottom.querySelector<HTMLDivElement>("div.ytp-left-controls");
	if (!leftControls) return;
	const rightControls = chromeBottom.querySelector<HTMLDivElement>("div.ytp-right-controls");
	if (!rightControls) return;
	const pipElement = document.querySelector<HTMLButtonElement>("button.ytp-pip-button");
	const sizeElement = document.querySelector<HTMLButtonElement>("button.ytp-size-button");
	const miniPlayerElement = document.querySelector<HTMLButtonElement>("button.ytp-miniplayer-button");
	adjustPlayer("add");
	[pipElement, sizeElement, miniPlayerElement].forEach((element) => {
		if (element)
			eventManager.addEventListener(
				element,
				"click",
				() => {
					minimizePlayer();
					const maximizePlayerMenuItem = getFeatureMenuItem("maximizePlayerButton");
					if (!maximizePlayerMenuItem) return;
					maximizePlayerMenuItem.ariaChecked = "false";
				},
				"maximizePlayerButton"
			);
	});
	[...leftControls.childNodes, ...rightControls.childNodes].forEach((node) => {
		eventManager.addEventListener(
			node as HTMLElement,
			"mouseover",
			() => adjustTooltip("add", { className: "yte-maximized-tooltip", selector: "div#movie_player > div.ytp-tooltip" }),
			"maximizePlayerButton"
		);
	});
}

export function minimizePlayer() {
	adjustPlayer("remove");
}
