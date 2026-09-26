export {
	addButton,
	addButton as addFeatureButton,
	addFeatureItemToMenu,
	checkIfFeatureButtonExists,
	enableFeatureMenu,
	enableFeatureMenuButton,
	getEffectivePlacement,
	getFeatureButton,
	getFeatureButtonId,
	getFeatureIds,
	getFeatureMenuItem,
	getFeatureMenuItemIcon,
	getFeatureMenuItemLabel,
	getTrackedButtonChecked,
	getTrackedButtonFullscreenPlacement,
	hasFeaturesInMenu,
	modifyIconForLightTheme,
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
	updateFeatureMenuTitle,
	updateTrackedButtonChecked,
	updateTrackedButtonConfig
} from "./ButtonController";

export type { FeatureMenuOpenType, ListenerType } from "./types";

export { featureMenuOpenTypes } from "./types";
