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
const forwardButtonSVG = createSVGElement(
	"svg",
	{
		fill: "white",
		height: "24px",
		stroke: "white",
		viewBox: "0 0 24 24",
		width: "24px"
	},
	createSVGElement("path", {
		d: "M 1.0000006,19.542857 11.685714,12 1.0000006,4.457143 Z M 12.314285,4.457143 V 19.542857 L 22.999999,12 Z"
	})
);
const rewindButtonSVG = createSVGElement(
	"svg",
	{
		fill: "white",
		height: "24px",
		stroke: "white",
		viewBox: "0 0 24 24",
		width: "24px"
	},
	createSVGElement("path", {
		d: "M 11.685714,19.542856 V 4.4571438 L 1.000001,12 Z M 12.314285,12 22.999999,19.542856 V 4.4571438 Z"
	})
);
const copyURLWithTimestampSVG = createSVGElement(
	"svg",
	{
		fill: "white",
		height: "23px",
		viewBox: "0 0 21.443 23.000378",
		width: "21.442648"
	},
	createSVGElement("path", {
		d: "m 15.231937,11.02203 c -3.168022,0 -5.7334298,2.571146 -5.7334298,5.739168 0,3.168023 2.5654078,5.739172 5.7334298,5.739172 3.17376,0 5.74491,-2.571149 5.74491,-5.739172 0,-3.168022 -2.57115,-5.739168 -5.74491,-5.739168 z m 0.0057,10.330505 c -2.536712,0 -4.591336,-2.054622 -4.591336,-4.591337 0,-2.536712 2.054624,-4.591335 4.591336,-4.591335 2.536713,0 4.591336,2.054623 4.591336,4.591335 0,2.536715 -2.054623,4.591337 -4.591336,4.591337 z m 0.286972,-7.460921 h -0.860876 v 3.443503 l 3.013064,1.807837 0.430438,-0.705918 -2.582626,-1.532357 z M 6.4145673,0.50020216 C 5.3380684,0.52772093 4.4660134,1.4182478 4.4660134,2.5010665 V 16.499645 c 0,1.100008 0.9008568,2.000863 2.0008639,2.000863 h 2.7892545 c -0.00367,-0.0126 -0.0076,-0.02471 -0.011238,-0.03738 -0.013947,-0.04919 -0.026468,-0.09981 -0.039218,-0.149459 -0.012751,-0.04966 -0.025827,-0.09933 -0.037381,-0.149458 -0.011555,-0.05014 -0.021442,-0.100746 -0.031723,-0.151322 -0.010367,-0.05062 -0.020801,-0.100308 -0.029895,-0.151323 -0.00909,-0.05102 -0.018332,-0.101758 -0.026143,-0.153195 -0.00786,-0.05142 -0.013947,-0.103218 -0.020562,-0.155063 -0.00658,-0.05182 -0.013392,-0.104699 -0.018648,-0.156925 -0.0053,-0.05221 -0.00909,-0.104327 -0.013076,-0.156928 -0.00402,-0.05261 -0.00858,-0.105839 -0.011238,-0.1588 -0.00265,-0.05292 -0.00428,-0.105496 -0.00564,-0.158798 -0.00137,-0.05333 -0.00188,-0.107037 -0.00188,-0.160659 0,-0.05364 5.187e-4,-0.107362 0.00188,-0.160665 8.547e-4,-0.03388 0.00231,-0.06711 0.00376,-0.100881 H 6.4668773 V 2.5010665 H 17.466961 v 8.4611715 c 0.01179,0.0045 0.02376,0.0084 0.03547,0.01308 0.04711,0.01858 0.09544,0.03826 0.14199,0.05796 0.04655,0.01969 0.0923,0.03905 0.13825,0.05978 0.04591,0.02073 0.09103,0.04168 0.136377,0.06353 0.04536,0.02185 0.09165,0.0444 0.136376,0.06727 0.04472,0.02288 0.08855,0.04703 0.132647,0.07102 0.04409,0.02391 0.08733,0.04791 0.130773,0.07286 0.04344,0.02495 0.08613,0.05063 0.128909,0.0766 0.0428,0.02599 0.08496,0.0534 0.127043,0.08034 0.04209,0.02694 0.08378,0.05428 0.12517,0.0822 0.04138,0.02798 0.08263,0.05515 0.123305,0.08407 0.04065,0.02894 0.0815,0.05796 0.121431,0.08781 0.03993,0.02981 0.08038,0.06074 0.119566,0.09154 0.03922,0.03077 0.0774,0.0617 0.115826,0.09341 0.03841,0.03173 0.07635,0.06456 0.113963,0.09715 0.03762,0.03261 0.07525,0.06552 0.112098,0.09901 0.02041,0.01849 0.03961,0.03723 0.05978,0.05603 V 2.5010665 c 2e-5,-1.1000068 -0.898969,-2.00086434 -1.998976,-2.00086434 H 6.4668773 c -0.017186,0 -0.035224,-4.3671e-4 -0.05231,0 z M 10.257499,20.499504 H 2.4651491 V 6.5009267 H 0.46615326 V 20.499504 c 0,1.100008 0.89898954,2.000866 1.99899584,2.000866 H 12.830037 c -0.0093,-0.0038 -0.01881,-0.0073 -0.02805,-0.01124 -0.04648,-0.01969 -0.09238,-0.03906 -0.138251,-0.05978 -0.04584,-0.02073 -0.09112,-0.04169 -0.136377,-0.06353 -0.04528,-0.02185 -0.08987,-0.0444 -0.134512,-0.06727 -0.04464,-0.02288 -0.08864,-0.04703 -0.132647,-0.07102 -0.04399,-0.02391 -0.08929,-0.04791 -0.132646,-0.07286 -0.04336,-0.02495 -0.08622,-0.05062 -0.128909,-0.0766 -0.04272,-0.02599 -0.08503,-0.0534 -0.127042,-0.08033 -0.042,-0.02695 -0.08386,-0.05428 -0.12517,-0.08219 -0.04128,-0.02798 -0.08084,-0.05515 -0.121432,-0.08407 -0.04057,-0.02894 -0.08158,-0.05796 -0.121431,-0.08781 -0.03986,-0.0298 -0.0786,-0.06074 -0.117701,-0.09154 -0.03914,-0.03076 -0.07748,-0.0617 -0.115827,-0.09341 -0.03834,-0.03164 -0.07636,-0.06456 -0.113963,-0.09715 -0.03754,-0.03261 -0.07533,-0.06552 -0.112089,-0.09902 -0.03675,-0.03348 -0.07238,-0.06656 -0.108359,-0.100882 -0.03596,-0.03436 -0.07326,-0.06942 -0.108359,-0.10462 -0.03515,-0.03515 -0.06848,-0.07047 -0.102755,-0.106486 -0.03428,-0.03603 -0.06935,-0.07341 -0.102755,-0.110225 -0.0334,-0.03683 -0.06648,-0.07262 -0.09902,-0.110223 -0.03252,-0.03762 -0.06361,-0.07556 -0.09528,-0.113963 -0.03164,-0.03843 -0.06265,-0.07852 -0.09341,-0.1177 -0.02583,-0.03285 -0.05149,-0.0656 -0.0766,-0.09902 z"
	})
);
export const featureIcons = {
	copyTimestampUrlButton: {
		feature_menu: copyURLWithTimestampSVG,
		shared_icon_position: copyURLWithTimestampSVG
	},
	decreasePlaybackSpeedButton: {
		feature_menu: decreasePlaybackSpeedButtonSVG,
		shared_icon_position: decreasePlaybackSpeedButtonSVG
	},
	forwardButton: {
		feature_menu: forwardButtonSVG,
		shared_icon_position: forwardButtonSVG
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
	rewindButton: {
		feature_menu: rewindButtonSVG,
		shared_icon_position: rewindButtonSVG
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
