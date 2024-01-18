import type { ButtonPlacement, FeaturesThatHaveButtons } from "./types";

import { createSVGElement } from "./utils/utilities";
export type ToggleIcon = { off: SVGSVGElement; on: SVGSVGElement };
export type BasicIcon = SVGSVGElement;
export const toggleFeatures = Object.keys({ loopButton: "", maximizePlayerButton: "", volumeBoostButton: "" } satisfies Partial<
	Record<FeaturesThatHaveButtons, "">
>);
export type ToggleFeatures = (typeof toggleFeatures)[number];
export type IconType<T extends FeaturesThatHaveButtons | ToggleFeatures> = T extends ToggleFeatures ? ToggleIcon : BasicIcon;
export type GetPlacementKey<Placement extends ButtonPlacement> = Placement extends "feature_menu" ? "feature_menu" : "shared_position_icon";
export type GetIconType<Name extends FeaturesThatHaveButtons, Placement extends ButtonPlacement> = FeatureIconsType[Name][GetPlacementKey<Placement>];
export type FeatureIconsType = {
	[Feature in FeaturesThatHaveButtons]: {
		feature_menu: BasicIcon;
		shared_position_icon: IconType<Feature>;
	};
};

const loopOnSVG = createSVGElement(
	"svg",
	{
		fill: "white",
		height: "36",
		stroke: "white",
		"stroke-width": "1.5",
		viewBox: "0 0 36 36",
		width: "36"
	},
	createSVGElement(
		"g",
		{
			transform: "matrix(0.0943489,0,0,-0.09705882,-1.9972187,36.735291)"
		},
		createSVGElement("path", {
			d: "m 120.59273,172.42419 v 20.60606 20.60606 l -1e-5,20.60608 v 20.60606 h 40.55254 40.55253 40.55255 40.55253 v 30.9091 l 50.69068,-41.21213 -50.69068,-51.51516 v 30.9091 h -32.94893 -32.94893 -32.94895 -32.94893 v -12.8788 -12.87879 -12.87879 -12.87879 h -7.6036 -7.6036 -7.6036 z",
			transform: "matrix(1.0454545,0,0,0.99999979,-14.814644,20.606103)"
		}),
		createSVGElement("path", {
			d: "m 313.21727,172.4242 1e-5,-82.42427 H 151.00712 V 59.09087 l -50.69065,41.21209 50.69065,51.51516 v -30.90909 h 131.79575 v 51.51517 z",
			transform: "matrix(1.0454545,0,0,0.99999979,-14.814644,20.606103)"
		})
	)
);
const loopOffSVG = createSVGElement(
	"svg",
	{
		fill: "white",
		height: "36",
		stroke: "white",
		"stroke-width": "1.5",
		viewBox: "0 0 36 36",
		width: "36"
	},
	createSVGElement(
		"g",
		{
			transform: "matrix(0.09863748,0,0,-0.0970588,-3.3949621,34.735285)"
		},
		createSVGElement("path", {
			d: "M 282.80287,285.75755 V 270.303 254.84845 h -81.10508 -57.44282 l 35.48347,-30.9091 h 103.06443 v -15.45454 -15.45455 l 25.34533,25.75758 25.34534,25.75758 -25.34534,20.60607 z M 151.00712,211.73026 v -39.30607 h -15.2072 -15.2072 v 65.93941 z"
		}),
		createSVGElement("path", {
			d: "m 282.80287,172.42419 v -25.75758 -12.51658 l 30.4144,-26.48201 v 23.54404 41.21213 h -15.2072 z M 151.00712,151.81812 125.66179,126.06054 100.31645,100.30296 125.66179,79.696895 151.00712,59.090829 v 15.45455 15.454549 h 81.10508 58.45648 l -35.48347,30.909102 h -38.18022 -65.89787 v 15.45455 z"
		}),
		createSVGElement("path", {
			d: "M 7,10 28,28 29.981167,25.855305 8.9811674,7.8553045 Z",
			transform: "matrix(10.138134,0,0,-10.303033,29.349514,357.87878)"
		})
	)
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
const volumeBoostSVG = createSVGElement(
	"svg",
	{
		fill: "white",
		height: "24px",
		stroke: "white",
		viewBox: "0 0 24 24",
		width: "24px"
	},
	createSVGElement("path", {
		d: "M3 9v6h4l5 5V4L7 9H3zm7-.17v6.34L7.83 13H5v-2h2.83L10 8.83zM16.5 12A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77",
		stroke: "none"
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
		height: "100%",
		stroke: "white",
		"stroke-width": "1.5",
		viewBox: "0 0 36 36",
		width: "100%"
	},
	createSVGElement("path", {
		d: "M 26.171872,26.171876 H 9.8281282 V 9.8281241 H 26.171872 Z m -16.3437437,0 V 9.8281241 H 26.171872 V 26.171876 Z",
		"stroke-linecap": "round",
		"stroke-linejoin": "round",
		"stroke-width": "1.5"
	}),
	createSVGElement("path", {
		d: "m 18,14.497768 v 7.004464 M 21.502231,18 h -7.004462",
		"stroke-linecap": "round",
		"stroke-linejoin": "round",
		"stroke-width": "1.5"
	})
);
const minimizePlayerSVG = createSVGElement(
	"svg",
	{
		fill: "none",
		height: "100%",
		stroke: "white",
		"stroke-width": "1.5",
		viewBox: "0 0 36 36",
		width: "100%"
	},
	createSVGElement("path", {
		d: "M 26.171872,26.171876 H 9.8281282 V 9.8281241 H 26.171872 Z m -16.3437437,0 V 9.8281241 H 26.171872 V 26.171876 Z",
		"stroke-linecap": "round",
		"stroke-linejoin": "round",
		"stroke-width": "1.5"
	}),
	createSVGElement("path", {
		d: "M 21.502231,18 H 14.497769",
		"stroke-linecap": "round",
		"stroke-linejoin": "round",
		"stroke-width": "1.5"
	})
);
export const featureIcons = {
	loopButton: {
		feature_menu: loopOnSVG,
		shared_position_icon: {
			off: loopOffSVG,
			on: loopOnSVG
		}
	},
	maximizePlayerButton: {
		feature_menu: maximizePlayerSVG,
		shared_position_icon: {
			off: maximizePlayerSVG,
			on: minimizePlayerSVG
		}
	},
	openTranscriptButton: {
		feature_menu: openTranscriptSVG,
		shared_position_icon: openTranscriptSVG
	},
	screenshotButton: {
		feature_menu: screenshotButtonSVG,
		shared_position_icon: screenshotButtonSVG
	},
	volumeBoostButton: {
		feature_menu: volumeBoostSVG,
		shared_position_icon: {
			off: volumeBoostSVG, // TODO: replace with different icon
			on: volumeBoostSVG
		}
	}
} satisfies FeatureIconsType;
// TODO: finish moving icon definitions to here
export function getIcon<Name extends FeaturesThatHaveButtons, Placement extends ButtonPlacement>(
	featureName: Name,
	placement: GetPlacementKey<Placement>
) {
	return featureIcons[featureName][placement];
}
