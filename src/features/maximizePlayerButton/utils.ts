import type { YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/utils/EventManager";

let wasInTheatreMode = false;
let setToTheatreMode = false;

export function maximizePlayer() {
	// Get the video element
	const videoElement = document.querySelector<HTMLVideoElement>("video.video-stream.html5-main-video");
	// If video element is not available, return
	if (!videoElement) return;
	const videoContainer = document.querySelector<YouTubePlayerDiv>("#movie_player");
	if (!videoContainer) return;
	const controlsElement = document.querySelector<HTMLDivElement>("div.ytp-chrome-bottom");
	if (!controlsElement) return;
	const sizeElement = document.querySelector("button.ytp-button.ytp-size-button");
	if (!sizeElement) return;
	const featureMenu = document.querySelector<HTMLDivElement>("#yte-feature-menu");
	if (!featureMenu) return;
	const {
		childNodes: [svgElement]
	} = sizeElement;
	if (!svgElement || !(svgElement instanceof SVGElement)) return;
	const theaterModeVariables = {
		ariaLabel: "Theater mode keyboard shortcut t",
		dataTitleNoTooltip: "Theater mode",
		pathD: "m 28,11 0,14 -20,0 0,-14 z m -18,2 16,0 0,10 -16,0 0,-10 z",
		title: "Theater mode (t)"
	};
	// const defaultModeVariables = {
	// 	ariaLabel: "Default view keyboard shortcut t",
	// 	dataTitleNoTooltip: "Default view",
	// 	pathD: "m 26,13 0,10 -16,0 0,-10 z m -14,2 12,0 0,6 -12,0 0,-6 z",
	// 	title: "Default view (t)"
	// };
	const {
		childNodes: [, svgPath]
	} = svgElement;
	if (!svgPath || !(svgPath instanceof SVGPathElement)) return;
	if (svgPath.getAttribute("d") === theaterModeVariables.pathD) wasInTheatreMode = true;
	else wasInTheatreMode = false;
	if (wasInTheatreMode) setToTheatreMode = false;
	else setToTheatreMode = true;
	// TODO: finish this code to make the maximize player button work properly. (implement ytp-scrubber-container adjustment) if all else fails revert to using the theatre mode button to get the tooltips in the correct place
	console.log(`setToTheatreMode && wasInTheatreMode: ${setToTheatreMode && wasInTheatreMode}`);
	console.log(`setToTheatreMode && !wasInTheatreMode: ${setToTheatreMode && !wasInTheatreMode}`);
	console.log(`!setToTheatreMode && wasInTheatreMode: ${!setToTheatreMode && wasInTheatreMode}`);
	console.log(`!setToTheatreMode && !wasInTheatreMode: ${!setToTheatreMode && !wasInTheatreMode}`);
	if (
		videoContainer.classList.contains("maximized_video_container") &&
		videoElement.classList.contains("maximized_video") &&
		controlsElement.classList.contains("maximized_controls")
	) {
		// sizeElement.click();
		// if (setToTheatreMode && wasInTheatreMode) {
		// 	const { dataTitleNoTooltip, title, ariaLabel, pathD } = defaultModeVariables;
		// 	svgPath.setAttributeNS(null, "d", pathD);
		// 	sizeElement.setAttributeNS(null, "aria-label", ariaLabel);
		// 	sizeElement.dataset.titleNoTooltip = dataTitleNoTooltip;
		// 	sizeElement.title = title;
		// } else if (setToTheatreMode && !wasInTheatreMode) {
		// 	const { dataTitleNoTooltip, title, ariaLabel, pathD } = theaterModeVariables;
		// 	svgPath.setAttributeNS(null, "d", pathD);
		// 	sizeElement.setAttributeNS(null, "aria-label", ariaLabel);
		// 	sizeElement.dataset.titleNoTooltip = dataTitleNoTooltip;
		// 	sizeElement.title = title;
		// }
		document.body.style.overflow = "";
		videoElement.classList.remove("maximized_video");
		videoContainer.classList.remove("maximized_video_container");
		controlsElement.classList.remove("maximized_controls");
		featureMenu.style.bottom = "";
	} else {
		// sizeElement.click();

		// if (!setToTheatreMode && wasInTheatreMode) {
		// 	const { dataTitleNoTooltip, title, ariaLabel, pathD } = defaultModeVariables;
		// 	svgPath.setAttributeNS(null, "d", pathD);
		// 	sizeElement.setAttributeNS(null, "aria-label", ariaLabel);
		// 	sizeElement.dataset.titleNoTooltip = dataTitleNoTooltip;
		// 	sizeElement.title = title;
		// } else if (setToTheatreMode && !wasInTheatreMode) {
		// 	const { dataTitleNoTooltip, title, ariaLabel, pathD } = theaterModeVariables;
		// 	svgPath.setAttributeNS(null, "d", pathD);
		// 	sizeElement.setAttributeNS(null, "aria-label", ariaLabel);
		// 	sizeElement.dataset.titleNoTooltip = dataTitleNoTooltip;
		// 	sizeElement.title = title;
		// }
		document.body.style.overflow = "hidden";
		videoElement.classList.add("maximized_video");
		videoContainer.classList.add("maximized_video_container");
		controlsElement.classList.add("maximized_controls");
		featureMenu.style.bottom = "-14px";
	}
}
export function setupVideoPlayerTimeUpdate() {
	const videoElement = document.querySelector<HTMLVideoElement>("video.video-stream.html5-main-video");
	if (!videoElement) return;
	const videoPlayerTimeUpdateListener = () => {
		updateProgressBarPositions();
	};
	eventManager.addEventListener(videoElement, "timeupdate", videoPlayerTimeUpdateListener, "maximizePlayerButton");
}
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

	const scrubberPosition = parseFloat(Math.min((elapsedTime / duration) * seekBarWidth, seekBarWidth).toFixed(3));
	// TODO: get this working when video is playing
	scrubber.style.transform = `translateX(${scrubberPosition}px)`;
	// TODO: get all progress bar lists updated when video is playing
	hoverProgress.style.left = `${scrubberPosition}px`;
}
