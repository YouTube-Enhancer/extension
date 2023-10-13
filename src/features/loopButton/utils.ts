import eventManager from "@/src/utils/EventManager";
import { createTooltip } from "@/src/utils/utilities";

async function loopButtonClickListener() {
	const videoElement = document.querySelector("video.html5-main-video") as HTMLVideoElement | null;
	if (!videoElement) return;
	const loopButton = document.querySelector("button#yte-loop-button") as HTMLButtonElement | null;
	if (!loopButton) return;
	const loop = videoElement.hasAttribute("loop");
	if (loop) {
		loopButton.dataset.title = "Loop Off";
		videoElement.removeAttribute("loop");
	} else {
		videoElement.setAttribute("loop", "");
		loopButton.dataset.title = "Loop On";
	}
	const loopButtonSVG = loop ? makeLoopOffSVG() : makeLoopOnSVG();
	loopButton.removeChild(loopButton.firstChild as Node);
	loopButton.appendChild(loopButtonSVG);
}
export function makeLoopOnButton() {
	const loopOnButton = document.createElement("button");
	loopOnButton.classList.add("ytp-button");
	loopOnButton.id = "yte-loop-button";
	loopOnButton.dataset.title = "Loop On";
	loopOnButton.style.padding = "0px";
	loopOnButton.style.display = "flex";
	loopOnButton.style.alignItems = "center";
	loopOnButton.style.justifyContent = "center";
	const loopOnButtonSVG = makeLoopOnSVG();
	loopOnButton.appendChild(loopOnButtonSVG);
	const { listener: loopOnButtonMouseOverListener, update } = createTooltip({
		element: loopOnButton,
		id: "yte-loop-button-tooltip",
		featureName: "loopButton"
	});
	eventManager.addEventListener(
		loopOnButton,
		"click",
		() => {
			loopButtonClickListener();
			update();
		},
		"loopButton"
	);
	eventManager.addEventListener(loopOnButton, "mouseover", loopOnButtonMouseOverListener, "loopButton");
	return loopOnButton;
}
export function makeLoopOffButton() {
	const loopOffButton = document.createElement("button");
	loopOffButton.classList.add("ytp-button");
	loopOffButton.id = "yte-loop-button";
	loopOffButton.dataset.title = "Loop Off";
	loopOffButton.style.padding = "0px";
	loopOffButton.style.display = "flex";
	loopOffButton.style.alignItems = "center";
	loopOffButton.style.justifyContent = "center";
	const loopOffButtonSVG = makeLoopOffSVG();
	loopOffButton.appendChild(loopOffButtonSVG);
	const { listener: loopOffButtonListener, update } = createTooltip({
		element: loopOffButton,
		id: "yte-loop-button-tooltip",
		featureName: "loopButton"
	});
	eventManager.addEventListener(
		loopOffButton,
		"click",
		() => {
			loopButtonClickListener();
			update();
		},
		"loopButton"
	);
	eventManager.addEventListener(loopOffButton, "mouseover", loopOffButtonListener, "loopButton");
	return loopOffButton;
}
function makeLoopOnSVG(): SVGElement {
	const loopOnSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	loopOnSVG.setAttributeNS(null, "stroke", "currentColor");
	loopOnSVG.setAttributeNS(null, "stroke-width", "1.5");
	loopOnSVG.setAttributeNS(null, "fill", "currentColor");
	loopOnSVG.setAttributeNS(null, "height", "36");
	loopOnSVG.setAttributeNS(null, "width", "36");
	loopOnSVG.setAttributeNS(null, "viewBox", "0 0 36 36");
	const loopOnGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
	loopOnGroup.setAttributeNS(null, "transform", "matrix(0.0943489,0,0,-0.09705882,-1.9972187,36.735291)");
	const loopOnTopArrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	loopOnTopArrowPath.setAttributeNS(
		null,
		"d",
		"m 120.59273,172.42419 v 20.60606 20.60606 l -1e-5,20.60608 v 20.60606 h 40.55254 40.55253 40.55255 40.55253 v 30.9091 l 50.69068,-41.21213 -50.69068,-51.51516 v 30.9091 h -32.94893 -32.94893 -32.94895 -32.94893 v -12.8788 -12.87879 -12.87879 -12.87879 h -7.6036 -7.6036 -7.6036 z"
	);
	loopOnTopArrowPath.setAttributeNS(null, "transform", "matrix(1.0454545,0,0,0.99999979,-14.814644,20.606103)");
	const loopOnBottomArrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	loopOnBottomArrowPath.setAttributeNS(
		null,
		"d",
		"m 313.21727,172.4242 1e-5,-82.42427 H 151.00712 V 59.09087 l -50.69065,41.21209 50.69065,51.51516 v -30.90909 h 131.79575 v 51.51517 z"
	);
	loopOnBottomArrowPath.setAttributeNS(null, "transform", "matrix(1.0454545,0,0,0.99999979,-14.814644,20.606103)");
	loopOnGroup.appendChild(loopOnTopArrowPath);
	loopOnGroup.appendChild(loopOnBottomArrowPath);
	loopOnSVG.appendChild(loopOnGroup);
	return loopOnSVG;
}
function makeLoopOffSVG(): SVGElement {
	const loopOffSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	loopOffSVG.setAttributeNS(null, "stroke", "currentColor");
	loopOffSVG.setAttributeNS(null, "stroke-width", "1.5");
	loopOffSVG.setAttributeNS(null, "fill", "currentColor");
	loopOffSVG.setAttributeNS(null, "height", "36");
	loopOffSVG.setAttributeNS(null, "width", "36");
	loopOffSVG.setAttributeNS(null, "viewBox", "0 0 36 36");
	const loopOffG = document.createElementNS("http://www.w3.org/2000/svg", "g");
	loopOffG.setAttributeNS(null, "transform", "matrix(0.09863748,0,0,-0.0970588,-3.3949621,34.735285)");
	const loopOffTopArrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	loopOffTopArrowPath.setAttributeNS(
		null,
		"d",
		"M 282.80287,285.75755 V 270.303 254.84845 h -81.10508 -57.44282 l 35.48347,-30.9091 h 103.06443 v -15.45454 -15.45455 l 25.34533,25.75758 25.34534,25.75758 -25.34534,20.60607 z M 151.00712,211.73026 v -39.30607 h -15.2072 -15.2072 v 65.93941 z"
	);
	const loopOffBottomArrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	loopOffBottomArrowPath.setAttributeNS(
		null,
		"d",
		"m 282.80287,172.42419 v -25.75758 -12.51658 l 30.4144,-26.48201 v 23.54404 41.21213 h -15.2072 z M 151.00712,151.81812 125.66179,126.06054 100.31645,100.30296 125.66179,79.696895 151.00712,59.090829 v 15.45455 15.454549 h 81.10508 58.45648 l -35.48347,30.909102 h -38.18022 -65.89787 v 15.45455 z"
	);
	const loopOffLinePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	loopOffLinePath.setAttributeNS(null, "d", "M 7,10 28,28 29.981167,25.855305 8.9811674,7.8553045 Z");
	loopOffLinePath.setAttributeNS(null, "transform", "matrix(10.138134,0,0,-10.303033,29.349514,357.87878)");
	loopOffG.appendChild(loopOffTopArrowPath);
	loopOffG.appendChild(loopOffBottomArrowPath);
	loopOffG.appendChild(loopOffLinePath);
	loopOffSVG.appendChild(loopOffG);
	return loopOffSVG;
}
