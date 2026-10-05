export { getButtonConfig } from "./buttonConfig";
export type { ButtonConfigSlice } from "./buttonConfig";

export {
	addButton,
	addButton as addFeatureButton,
	addFeatureItemToMenu,
	checkIfFeatureButtonExists,
	enableFeatureMenu,
	enableFeatureMenuButton,
	getFeatureButton,
	getFeatureButtonId,
	getFeatureIds,
	getFeatureMenuItem,
	getFeatureMenuItemIcon,
	getFeatureMenuItemLabel,
	hasFeaturesInMenu,
	modifyIconForLightTheme,
	refreshAllLabels,
	removeButton,
	removeButton as removeFeatureButton,
	removeFeatureItemFromMenu,
	setupFeatureMenuEventListeners,
	updateButtonsIconColor,
	updateFeatureButtonChecked,
	updateFeatureButtonIcon,
	updateFeatureButtonIconByName,
	updateFeatureButtonTitle,
	updateFeatureMenuItemLabel,
	updateFeatureMenuTitle
} from "./ButtonController";

export { buttonPlacement } from "./buttonPlacement";
export type { PlacementOutcome, PlacementStateSnapshot } from "./buttonPlacement";

export type { FeatureMenuOpenType, ListenerType } from "./types";

export { featureMenuOpenTypes } from "./types";
