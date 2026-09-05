export {
	addButton,
	addButton as addFeatureButton,
	addFeatureItemToMenu,
	checkIfFeatureButtonExists,
	enableFeatureMenu,
	enableFeatureMenuButton,
	featuresInMenu,
	getEffectivePlacement,
	getFeatureButton,
	getFeatureButtonId,
	getFeatureIds,
	getFeatureMenuItem,
	getFeatureMenuItemIcon,
	getFeatureMenuItemLabel,
	modifyIconForLightTheme,
	removeButton,
	removeButton as removeFeatureButton,
	removeFeatureItemFromMenu,
	setupFeatureMenuEventListeners,
	updateButtonsIconColor,
	updateFeatureButtonChecked,
	updateFeatureButtonIcon,
	updateFeatureButtonTitle,
	updateFeatureMenuTitle,
	updateTrackedButtonConfig
} from "./ButtonController";

export type { FeatureMenuOpenType, ListenerType } from "./types";

export { featureMenuOpenTypes } from "./types";
