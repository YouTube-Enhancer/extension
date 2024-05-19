import type { AllButtonNames, ButtonPlacement } from "./types";

import { createSVGElement } from "./utils/utilities";
export type ToggleIcon = { off: SVGSVGElement; on: SVGSVGElement };
export type BasicIcon = SVGSVGElement;
export const toggleFeatures = Object.keys({
	hideEndScreenCardsButton: "",
	loopButton: "",
	maximizePlayerButton: "",
	volumeBoostButton: ""
} satisfies Partial<Record<AllButtonNames, "">>);
export type ToggleFeatures = (typeof toggleFeatures)[number];
export type IconType<T extends AllButtonNames> = T extends ToggleFeatures ? ToggleIcon : BasicIcon;
export type GetPlacementKey<Placement extends ButtonPlacement> = Placement extends "feature_menu" ? "feature_menu" : "shared_icon_position";
export type GetIconType<Name extends AllButtonNames, Placement extends ButtonPlacement> = FeatureIconMap[Name][GetPlacementKey<Placement>];
export type FeatureIconMap = {
	[ButtonName in AllButtonNames]: {
		feature_menu: BasicIcon;
		shared_icon_position: IconType<ButtonName>;
	};
};

const loopOnSVG = createSVGElement(
	"svg",
	{
		fill: "white",
		height: "24px",
		stroke: "white",
		viewBox: "0 0 24 24",
		width: "24px"
	},
	createSVGElement("path", {
		d: "m 2.4999994,12.000002 v -1.999999 -2 l -1e-6,-2.000001 v -2 h 4.0000004 3.9999992 4.000001 4 V 1.0000021 L 23.5,5.000002 l -5.000001,5 V 7.000001 h -3.25 H 12 8.7499986 5.4999992 v 1.250001 1.25 1.25 1.25 h -0.75 -0.7499999 -0.7499999 z",
		"stroke-width": 0
	}),
	createSVGElement("path", {
		d: "m 21.499999,12.000001 1e-6,8.000001 H 5.4999982 v 2.999996 l -4.99999798,-3.999996 4.99999798,-5 v 3 H 18.499999 v -5.000001 z",
		"stroke-width": 0
	})
);
const loopOffSVG = createSVGElement(
	"svg",
	{
		fill: "white",
		height: "24px",
		stroke: "white",
		viewBox: "0 0 24 24",
		width: "24px"
	},
	createSVGElement("path", {
		d: "M 221.97407,347.57575 V 332.1212 316.66665 H 140.86899 83.426168 l 35.483472,-30.9091 h 103.06443 v -15.45454 -15.45455 l 25.34533,25.75758 25.34534,25.75758 -25.34534,20.60607 z M 90.178318,273.54846 v -39.30607 h -15.2072 -15.2072 v 65.93941 z",
		"stroke-width": 0,
		transform: "matrix(0.09863748,0,0,-0.0970588,-3.3949621,34.735285)"
	}),
	createSVGElement("path", {
		d: "m 221.97407,234.24239 v -25.75758 -12.51658 l 30.4144,-26.48201 v 23.54404 41.21213 h -15.2072 z m -131.795752,-20.60607 -25.34533,-25.75758 -25.34534,-25.75758 25.34534,-20.60607 25.34533,-20.60606 v 15.45455 15.45455 h 81.105082 58.45648 l -35.48347,30.9091 H 156.07619 90.178318 v 15.45455 z",
		"stroke-width": 0,
		transform: "matrix(0.09863748,0,0,-0.0970588,-3.3949621,34.735285)"
	}),
	createSVGElement("path", {
		d: "M 39.48765,316.66665 252.38846,131.21205 272.4738,153.30892 59.57299,338.76352 Z",
		"stroke-width": 0,
		transform: "matrix(0.09863748,0,0,-0.0970588,-3.3949621,34.735285)"
	})
);
const screenshotButtonSVG = createSVGElement(
	"svg",
	{
		fill: "none",
		height: "24px",
		stroke: "white",
		"stroke-width": "1.5",
		viewBox: "0 0 24 24",
		width: "24px"
	},
	createSVGElement("path", {
		d: "M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316",
		"stroke-linecap": "round",
		"stroke-linejoin": "round"
	}),
	createSVGElement("path", {
		d: "M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z",
		"stroke-linecap": "round",
		"stroke-linejoin": "round"
	})
);
const volumeBoostOnSVG = createSVGElement(
	"svg",
	{
		fill: "white",
		height: "24px",
		stroke: "white",
		viewBox: "0 0 24 24",
		width: "24px"
	},
	createSVGElement("path", {
		d: "m 18.678443,19.914783 c -0.237137,0 -0.474274,-0.0902 -0.654617,-0.27176 -0.361886,-0.36192 -0.361886,-0.94868 0,-1.31064 1.690919,-1.69112 2.62223,-3.9406 2.62223,-6.33336 0,-2.3927605 -0.931311,-4.6409929 -2.62223,-6.3333449 -0.361886,-0.36194 -0.361886,-0.948708 0,-1.310648 0.361885,-0.36194 0.948589,-0.36194 1.310476,0 C 21.376027,6.3969701 22.5,9.1109055 22.5,11.997783 c 0,2.88688 -1.123973,5.60084 -3.165698,7.64276 -0.180304,0.18036 -0.417482,0.2718 -0.654618,0.2718 z m -3.290446,-1.74668 c -0.237138,0 -0.474274,-0.0902 -0.654617,-0.27176 -0.361886,-0.36196 -0.361886,-0.94872 0,-1.31068 2.528358,-2.52864 2.528358,-6.6434005 0,-9.1720449 -0.361886,-0.36194 -0.361886,-0.948704 0,-1.310648 0.361885,-0.36194 0.948589,-0.36194 1.310514,0 1.57481,1.575 2.441888,3.6688124 2.441888,5.8960529 0,2.22724 -0.867078,4.32108 -2.441888,5.89608 -0.180343,0.18036 -0.41748,0.27176 -0.654657,0.27176 v 0 z m -3.291647,-1.74796 c -0.237177,0 -0.474314,-0.0902 -0.654657,-0.27176 -0.361886,-0.36192 -0.361886,-0.94872 0,-1.31064 1.564971,-1.56512 1.564971,-4.11228 0,-5.6774055 -0.361886,-0.361955 -0.361886,-0.9487194 0,-1.3106594 0.361925,-0.36194 0.948629,-0.36194 1.310515,0 2.287503,2.2877849 2.287503,6.0097049 0,8.2987049 -0.180343,0.18036 -0.41748,0.27176 -0.654618,0.27176 z",
		"stroke-width": 0
	}),
	createSVGElement("path", {
		d: "m 9.5297155,20.647343 c -0.160584,0 -0.318688,-0.063 -0.437243,-0.18036 L 4.3321986,15.706143 H 2.1175737 c -0.3408996,0 -0.6175732,-0.27668 -0.6175732,-0.61764 V 8.9120255 c 0,-0.340933 0.2766736,-0.6176434 0.6175732,-0.6176434 h 2.2146249 l 4.7602739,-4.760824 c 0.176625,-0.176644 0.442162,-0.229764 0.67314,-0.133408 0.230978,0.096358 0.3816835,0.321176 0.3816835,0.570704 V 20.029663 c 0,0.24956 -0.1507055,0.4756 -0.3816835,0.57072 -0.07639,0.032 -0.156865,0.0468 -0.235897,0.0468 z",
		"stroke-width": 0
	})
);
const volumeBoostOffSVG = createSVGElement(
	"svg",
	{
		fill: "white",
		height: "24px",
		stroke: "white",
		viewBox: "0 0 24 24",
		width: "24px"
	},
	createSVGElement("path", {
		d: "m 12.09635,16.420143 c -0.237177,0 -0.474314,-0.0902 -0.654657,-0.27176 -0.361886,-0.36192 -0.361886,-0.94872 0,-1.31064 1.564971,-1.56512 1.564971,-4.11228 0,-5.6774055 -0.361886,-0.361955 -0.361886,-0.9487194 0,-1.3106594 0.361925,-0.36194 0.948629,-0.36194 1.310515,0 2.287503,2.2877849 2.287503,6.0097049 0,8.2987049 -0.180343,0.18036 -0.41748,0.27176 -0.654618,0.27176 z",
		"stroke-width": 0
	}),
	createSVGElement("path", {
		d: "m 9.5297155,20.647343 c -0.160584,0 -0.318688,-0.063 -0.437243,-0.18036 L 4.3321986,15.706143 H 2.1175737 c -0.3408996,0 -0.6175732,-0.27668 -0.6175732,-0.61764 V 8.9120255 c 0,-0.340933 0.2766736,-0.6176434 0.6175732,-0.6176434 h 2.2146249 l 4.7602739,-4.760824 c 0.176625,-0.176644 0.442162,-0.229764 0.67314,-0.133408 0.230978,0.096358 0.3816835,0.321176 0.3816835,0.570704 V 20.029663 c 0,0.24956 -0.1507055,0.4756 -0.3816835,0.57072 -0.07639,0.032 -0.156865,0.0468 -0.235897,0.0468 z",
		"stroke-width": 0
	})
);
const openTranscriptSVG = createSVGElement(
	"svg",
	{
		height: "24px",
		stroke: "white",
		"stroke-width": "0",
		viewBox: "0 0 24 24",
		width: "24px"
	},
	createSVGElement("path", {
		d: "M5 16C5 15.4477 5.44772 15 6 15H14C14.5523 15 15 15.4477 15 16C15 16.5523 14.5523 17 14 17H6C5.44772 17 5 16.5523 5 16Z",
		fill: "white"
	}),
	createSVGElement("path", {
		d: "M18 11C18.5523 11 19 11.4477 19 12C19 12.5523 18.5523 13 18 13H10C9.44772 13 9 12.5523 9 12C9 11.4477 9.44772 11 10 11H18Z",
		fill: "white"
	}),
	createSVGElement("path", {
		d: "M16 16C16 15.4477 16.4477 15 17 15H18C18.5523 15 19 15.4477 19 16C19 16.5523 18.5523 17 18 17H17C16.4477 17 16 16.5523 16 16Z",
		fill: "white"
	}),
	createSVGElement("path", {
		d: "M7 11C7.55228 11 8 11.4477 8 12C8 12.5523 7.55228 13 7 13H6C5.44772 13 5 12.5523 5 12C5 11.4477 5.44772 11 6 11H7Z",
		fill: "white"
	}),
	createSVGElement("path", {
		"clip-rule": "evenodd",
		d: "M4 3C2.34315 3 1 4.34315 1 6V18C1 19.6569 2.34315 21 4 21H20C21.6569 21 23 19.6569 23 18V6C23 4.34315 21.6569 3 20 3H4ZM20 5H4C3.44772 5 3 5.44772 3 6V18C3 18.5523 3.44772 19 4 19H20C20.5523 19 21 18.5523 21 18V6C21 5.44771 20.5523 5 20 5Z",
		fill: "white",
		"fill-rule": "evenodd"
	})
);
const maximizePlayerSVG = createSVGElement(
	"svg",
	{
		fill: "none",
		height: "24px",
		stroke: "white",
		"stroke-width": "1.5",
		viewBox: "0 0 24 24",
		width: "24px"
	},
	createSVGElement("path", {
		d: "M 21.788344,21.788346 H 2.2116561 V 2.2116538 H 21.788344 Z m -19.5766878,0 V 2.2116538 H 21.788344 V 21.788346 Z",
		"stroke-linecap": "round",
		"stroke-linejoin": "round",
		"stroke-width": "1.5"
	}),
	createSVGElement("path", {
		d: "m 12.000002,7.804995 v 8.39001 m 4.195002,-4.195006 H 7.8049961",
		"stroke-linecap": "round",
		"stroke-linejoin": "round",
		"stroke-width": "1.5"
	})
);
const minimizePlayerSVG = createSVGElement(
	"svg",
	{
		fill: "none",
		height: "24px",
		stroke: "white",
		"stroke-width": "1.5",
		viewBox: "0 0 24 24",
		width: "24px"
	},
	createSVGElement("path", {
		d: "M 21.788346,21.788346 H 2.2116542 V 2.2116541 H 21.788346 Z m -19.5766917,0 V 2.2116541 H 21.788346 V 21.788346 Z",
		"stroke-linecap": "round",
		"stroke-linejoin": "round",
		"stroke-width": "1.5"
	}),
	createSVGElement("path", {
		d: "M 16.195005,12 H 7.804995",
		"stroke-linecap": "round",
		"stroke-linejoin": "round",
		"stroke-width": "1.5"
	})
);
const decreasePlaybackSpeedButtonSVG = createSVGElement(
	"svg",
	{
		height: "24px",
		stroke: "white",
		"stroke-width": "1",
		viewBox: "0 0 24 24",
		width: "24px"
	},
	createSVGElement("path", {
		d: "M10,8v8l6-4L10,8L10,8z M6.3,5L5.7,4.2C7.2,3,9,2.2,11,2l0.1,1C9.3,3.2,7.7,3.9,6.3,5z M5,6.3L4.2,5.7C3,7.2,2.2,9,2,11 l1,.1C3.2,9.3,3.9,7.7,5,6.3z M5,17.7c-1.1-1.4-1.8-3.1-2-4.8L2,13c0.2,2,1,3.8,2.2,5.4L5,17.7z M11.1,21c-1.8-0.2-3.4-0.9-4.8-2 l-0.6,.8C7.2,21,9,21.8,11,22L11.1,21z M22,12c0-5.2-3.9-9.4-9-10l-0.1,1c4.6,.5,8.1,4.3,8.1,9s-3.5,8.5-8.1,9l0.1,1 C18.2,21.5,22,17.2,22,12z",
		fill: "white"
	}),
	createSVGElement("path", {
		d: "M16 4.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z",
		fill: "white"
	})
);
const increasePlaybackSpeedButtonSVG = createSVGElement(
	"svg",
	{
		height: "24px",
		stroke: "white",
		"stroke-width": "1",
		viewBox: "0 0 24 24",
		width: "24px"
	},
	createSVGElement("path", {
		d: "M10,8v8l6-4L10,8L10,8z M6.3,5L5.7,4.2C7.2,3,9,2.2,11,2l0.1,1C9.3,3.2,7.7,3.9,6.3,5z M5,6.3L4.2,5.7C3,7.2,2.2,9,2,11 l1,.1C3.2,9.3,3.9,7.7,5,6.3z M5,17.7c-1.1-1.4-1.8-3.1-2-4.8L2,13c0.2,2,1,3.8,2.2,5.4L5,17.7z M11.1,21c-1.8-0.2-3.4-0.9-4.8-2 l-0.6,.8C7.2,21,9,21.8,11,22L11.1,21z M22,12c0-5.2-3.9-9.4-9-10l-0.1,1c4.6,.5,8.1,4.3,8.1,9s-3.5,8.5-8.1,9l0.1,1 C18.2,21.5,22,17.2,22,12z",
		fill: "white"
	}),
	createSVGElement("path", {
		d: "M20 2a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z",
		fill: "white"
	})
);
const hideEndScreenCardsButtonSVG = createSVGElement(
	"svg",
	{
		height: "24px",
		"stroke-width": "1",
		viewBox: "0 0 24 24",
		width: "24px"
	},
	createSVGElement("path", {
		d: "M 19.615385,7.7692309 V 19.615385 a 1.6923077,1.6923077 0 0 1 -1.692308,1.692307 H 2.6923077 A 1.6923077,1.6923077 0 0 1 1,19.615385 V 7.7692309 A 1.6923077,1.6923077 0 0 1 2.6923077,6.0769232 H 17.923077 a 1.6923077,1.6923077 0 0 1 1.692308,1.6923077 z m 1.692307,-5.076923 H 5.2307692 a 0.84615385,0.84615385 0 0 0 0,1.6923077 H 21.307692 V 17.076923 a 0.846154,0.846154 0 0 0 1.692308,0 V 4.3846156 A 1.6923077,1.6923077 0 0 0 21.307692,2.6923079 Z",
		fill: "white"
	})
);
const showEndScreenCardsButtonSVG = createSVGElement(
	"svg",
	{
		height: "24px",
		"stroke-width": "1",
		viewBox: "0 0 24 24",
		width: "24px"
	},
	createSVGElement("path", {
		d: "M 17.894749,6.1105233 H 2.7368227 A 1.684214,1.6827074 0 0 0 1.0526086,7.793231 v 11.778954 a 1.684214,1.6827074 0 0 0 1.6842141,1.682707 H 17.894749 a 1.684214,1.6827074 0 0 0 1.684215,-1.682707 V 7.793231 A 1.684214,1.6827074 0 0 0 17.894749,6.1105233 Z m 0,13.4616617 H 2.7368227 V 7.793231 H 17.894749 Z M 22.947391,4.4278159 V 17.048122 a 0.84210706,0.84135374 0 0 1 -1.684213,0 V 4.4278159 H 5.2631439 a 0.84210707,0.84135375 0 0 1 0,-1.6827074 H 21.263178 a 1.684214,1.6827074 0 0 1 1.684213,1.6827074 z",
		fill: "white"
	})
);
export const featureIcons = {
	decreasePlaybackSpeedButton: {
		feature_menu: decreasePlaybackSpeedButtonSVG,
		shared_icon_position: decreasePlaybackSpeedButtonSVG
	},
	hideEndScreenCardsButton: {
		feature_menu: hideEndScreenCardsButtonSVG,
		shared_icon_position: {
			off: showEndScreenCardsButtonSVG,
			on: hideEndScreenCardsButtonSVG
		}
	},
	increasePlaybackSpeedButton: {
		feature_menu: increasePlaybackSpeedButtonSVG,
		shared_icon_position: increasePlaybackSpeedButtonSVG
	},
	loopButton: {
		feature_menu: loopOnSVG,
		shared_icon_position: {
			off: loopOffSVG,
			on: loopOnSVG
		}
	},
	maximizePlayerButton: {
		feature_menu: maximizePlayerSVG,
		shared_icon_position: {
			off: maximizePlayerSVG,
			on: minimizePlayerSVG
		}
	},
	openTranscriptButton: {
		feature_menu: openTranscriptSVG,
		shared_icon_position: openTranscriptSVG
	},
	screenshotButton: {
		feature_menu: screenshotButtonSVG,
		shared_icon_position: screenshotButtonSVG
	},
	volumeBoostButton: {
		feature_menu: volumeBoostOnSVG,
		shared_icon_position: {
			off: volumeBoostOffSVG,
			on: volumeBoostOnSVG
		}
	}
} satisfies FeatureIconMap;
export function getFeatureIcon<Name extends AllButtonNames>(featureName: Name, placement: ButtonPlacement): IconType<Name> {
	return featureIcons[featureName][placement !== "feature_menu" ? "shared_icon_position" : "feature_menu"] as IconType<Name>;
}
