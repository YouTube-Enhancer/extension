import { YouTubePlayerDiv } from "@/src/types";
import eventManager from "@/src/utils/EventManager";
let wasInTheatreMode = false;
let setToTheatreMode = false;
export function makeMaximizeSVG(): SVGElement {
	const maximizeSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	maximizeSVG.setAttributeNS(null, "stroke", "currentColor");
	maximizeSVG.setAttributeNS(null, "height", "100%");
	maximizeSVG.setAttributeNS(null, "width", "100%");
	maximizeSVG.setAttributeNS(null, "fill", "none");
	maximizeSVG.setAttributeNS(null, "stroke-width", "1.5");
	maximizeSVG.setAttributeNS(null, "viewBox", "0 0 36 36");
	const maximize_SVG_FirstPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	maximize_SVG_FirstPath.setAttributeNS(
		null,
		"d",
		"M 26.171872,26.171876 H 9.8281282 V 9.8281241 H 26.171872 Z m -16.3437437,0 V 9.8281241 H 26.171872 V 26.171876 Z"
	);
	maximize_SVG_FirstPath.setAttributeNS(null, "stroke-linecap", "round");
	maximize_SVG_FirstPath.setAttributeNS(null, "stroke-linejoin", "round");
	maximize_SVG_FirstPath.style.strokeWidth = "1.5";
	maximize_SVG_FirstPath.style.strokeLinejoin = "round";
	const maximize_SVG_SecondPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	maximize_SVG_SecondPath.setAttributeNS(null, "d", "m 18,14.497768 v 7.004464 M 21.502231,18 h -7.004462");
	maximize_SVG_SecondPath.setAttributeNS(null, "stroke-linecap", "round");
	maximize_SVG_SecondPath.setAttributeNS(null, "stroke-linejoin", "round");
	maximize_SVG_SecondPath.style.strokeWidth = "1.5";
	maximize_SVG_SecondPath.style.strokeLinejoin = "round";
	maximizeSVG.appendChild(maximize_SVG_FirstPath);
	maximizeSVG.appendChild(maximize_SVG_SecondPath);
	return maximizeSVG;
}
export function makeMinimizeSVG(): SVGElement {
	const minimizeSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	minimizeSVG.setAttributeNS(null, "stroke", "currentColor");
	minimizeSVG.setAttributeNS(null, "height", "100%");
	minimizeSVG.setAttributeNS(null, "width", "100%");
	minimizeSVG.setAttributeNS(null, "fill", "none");
	minimizeSVG.setAttributeNS(null, "stroke-width", "1.5");
	minimizeSVG.setAttributeNS(null, "viewBox", "0 0 36 36");
	const minimize_SVG_FirstPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	minimize_SVG_FirstPath.setAttributeNS(
		null,
		"d",
		"M 26.171872,26.171876 H 9.8281282 V 9.8281241 H 26.171872 Z m -16.3437437,0 V 9.8281241 H 26.171872 V 26.171876 Z"
	);
	minimize_SVG_FirstPath.setAttributeNS(null, "stroke-linecap", "round");
	minimize_SVG_FirstPath.setAttributeNS(null, "stroke-linejoin", "round");
	minimize_SVG_FirstPath.style.strokeWidth = "1.5";
	minimize_SVG_FirstPath.style.strokeLinejoin = "round";
	const minimize_SVG_SecondPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	minimize_SVG_SecondPath.setAttributeNS(null, "d", "M 21.502231,18 H 14.497769");
	minimize_SVG_SecondPath.setAttributeNS(null, "stroke-linecap", "round");
	minimize_SVG_SecondPath.setAttributeNS(null, "stroke-linejoin", "round");
	minimize_SVG_SecondPath.style.strokeWidth = "1.5";
	minimize_SVG_SecondPath.style.strokeLinejoin = "round";
	minimizeSVG.appendChild(minimize_SVG_FirstPath);
	minimizeSVG.appendChild(minimize_SVG_SecondPath);
	return minimizeSVG;
} // TODO: get played progress bar to be accurate when maximized from default view
// TODO: Add event listener that updates scrubber position when maximize button is clicked
export function updateProgressBarPositions() {
	const seekBar = document.querySelector("div.ytp-progress-bar") as HTMLDivElement | null;
	const scrubber = document.querySelector("div.ytp-scrubber-container") as HTMLDivElement | null;
	const hoverProgress = document.querySelector("div.ytp-hover-progress") as HTMLDivElement | null;
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
export function setupVideoPlayerTimeUpdate() {
	const videoElement = document.querySelector("video.video-stream.html5-main-video") as HTMLVideoElement | null;
	if (!videoElement) return;
	const videoPlayerTimeUpdateListener = () => {
		updateProgressBarPositions();
	};
	eventManager.addEventListener(videoElement, "timeupdate", videoPlayerTimeUpdateListener, "maximizePlayerButton");
}
export function maximizePlayer(maximizePlayerButton: HTMLButtonElement) {
	// Get the video element
	const videoElement = document.querySelector("video.video-stream.html5-main-video") as HTMLVideoElement | null;
	// If video element is not available, return
	if (!videoElement) return;
	const videoContainer = document.querySelector("#movie_player") as YouTubePlayerDiv | null;
	if (!videoContainer) return;
	const controlsElement = document.querySelector("div.ytp-chrome-bottom") as HTMLDivElement | null;
	if (!controlsElement) return;
	const sizeElement = document.querySelector("button.ytp-button.ytp-size-button") as HTMLButtonElement | null;
	if (!sizeElement) return;
	const {
		childNodes: [svgElement]
	} = sizeElement;
	if (!svgElement || !(svgElement instanceof SVGElement)) return;
	const theaterModeVariables = {
		pathD: "m 28,11 0,14 -20,0 0,-14 z m -18,2 16,0 0,10 -16,0 0,-10 z",
		dataTitleNoTooltip: "Theater mode",
		ariaLabel: "Theater mode keyboard shortcut t",
		title: "Theater mode (t)"
	};
	const defaultModeVariables = {
		pathD: "m 26,13 0,10 -16,0 0,-10 z m -14,2 12,0 0,6 -12,0 0,-6 z",
		dataTitleNoTooltip: "Default view",
		ariaLabel: "Default view keyboard shortcut t",
		title: "Default view (t)"
	};
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

		maximizePlayerButton.dataset.title = "Maximize Player";
		videoElement.classList.remove("maximized_video");
		videoContainer.classList.remove("maximized_video_container");
		controlsElement.classList.remove("maximized_controls");
		maximizePlayerButton.removeChild(maximizePlayerButton.firstChild as Node);
		maximizePlayerButton.appendChild(makeMaximizeSVG());
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

		maximizePlayerButton.dataset.title = "Minimize Player";
		videoElement.classList.add("maximized_video");
		videoContainer.classList.add("maximized_video_container");
		controlsElement.classList.add("maximized_controls");
		maximizePlayerButton.removeChild(maximizePlayerButton.firstChild as Node);
		maximizePlayerButton.appendChild(makeMinimizeSVG());
	}
}
