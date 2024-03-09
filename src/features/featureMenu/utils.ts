import type { ListenerType } from "@/src/features/buttonPlacement/utils";
import type { BasicIcon } from "@/src/icons";

import {
	type ButtonFeatureNames,
	type ButtonNames,
	type ButtonNamesExcludingSingleButtonNames,
	type FeatureMenuItemIconId,
	type FeatureMenuItemId,
	type FeatureMenuItemLabelId,
	type Nullable,
	type WithId
} from "@/src/types";
import eventManager from "@/src/utils/EventManager";
import { findKeyByValue, waitForAllElements } from "@/src/utils/utilities";

export const featuresInMenu = new Set<ButtonNames>();

function featureMenuClickListener<Toggle extends boolean = false>(menuItem: HTMLDivElement, listener: ListenerType<Toggle>, isToggle: boolean) {
	if (isToggle) {
		menuItem.ariaChecked = menuItem.ariaChecked ? (!JSON.parse(menuItem.ariaChecked)).toString() : "false";
		listener(JSON.parse(menuItem.ariaChecked) as boolean);
	} else {
		listener();
	}
}
/**
 * Adds a feature item to the feature menu.
 * @param buttonName The name of the button
 * @param label The label for the feature
 * @param icon The icon for the feature
 * @param listener The listener for the feature
 * @param isToggle Whether the feature is a toggle
 */
export async function addFeatureItemToMenu<Name extends ButtonNames, Toggle extends boolean>(
	buttonName: Name,
	label: string,
	icon: BasicIcon,
	listener: ListenerType<Toggle>,
	isToggle: boolean
) {
	const featureName = findKeyByValue(buttonName as ButtonNamesExcludingSingleButtonNames) ?? (buttonName as ButtonFeatureNames);
	// Add the feature name to the set of features in the menu
	featuresInMenu.add(buttonName);

	// Wait for the feature menu to exist
	await waitForAllElements(["#yte-feature-menu"]);

	// Get the feature menu
	const featureMenu = document.querySelector<HTMLDivElement>("#yte-feature-menu");
	if (!featureMenu) return;

	// Check if the feature item already exists in the menu
	const featureExistsInMenu = featureMenu.querySelector<HTMLDivElement>(`#${getFeatureIds(buttonName).featureMenuItemId}`);
	if (featureExistsInMenu) {
		const menuItem = getFeatureMenuItem(buttonName);
		if (!menuItem) return;
		eventManager.removeEventListener(menuItem, "click", featureName);
		eventManager.addEventListener(menuItem, "click", () => featureMenuClickListener(menuItem, listener, isToggle), featureName);
		return;
	}

	// Get the feature menu panel
	const featureMenuPanel = document.querySelector<HTMLDivElement>("#yte-panel-menu");
	if (!featureMenuPanel) return;

	// Get the IDs for the feature item
	const { featureMenuItemIconId, featureMenuItemId, featureMenuItemLabelId } = getFeatureIds(buttonName);

	// Create a menu item element
	const menuItem = document.createElement("div");
	menuItem.classList.add("ytp-menuitem");
	menuItem.id = featureMenuItemId;

	// Create the menu item icon element
	const menuItemIcon = document.createElement("div");
	menuItemIcon.id = featureMenuItemIconId;
	menuItemIcon.classList.add("ytp-menuitem-icon");
	menuItemIcon.appendChild(icon);
	menuItem.appendChild(menuItemIcon);

	// Create the menu item label element
	const menuItemLabel = document.createElement("div");
	menuItemLabel.classList.add("ytp-menuitem-label");
	menuItemLabel.textContent = label;
	menuItemLabel.id = featureMenuItemLabelId;
	eventManager.addEventListener(menuItem, "click", () => featureMenuClickListener(menuItem, listener, isToggle), featureName);
	menuItem.appendChild(menuItemLabel);

	// If it's a toggle item, create the toggle elements
	if (isToggle) {
		const menuItemContent = document.createElement("div");
		menuItemContent.classList.add("ytp-menuitem-content");
		const menuItemToggle = document.createElement("div");
		menuItemToggle.classList.add("ytp-menuitem-toggle-checkbox");
		menuItemContent.appendChild(menuItemToggle);
		menuItem.appendChild(menuItemContent);
		menuItem.ariaChecked = "false";
	} else {
		const menuItemContent = document.createElement("div");
		menuItemContent.classList.add("ytp-menuitem-content");
		menuItem.appendChild(menuItemContent);
	}

	// Add the item to the feature menu panel
	featureMenuPanel.appendChild(menuItem);

	// Adjust the height and width of the feature menu
	featureMenu.style.height = `${40 * featureMenuPanel.childElementCount + 16}px`;
	featureMenu.style.width = "fit-content";
	// Show the feature menu button since an item has been added
	const featureMenuButton = document.querySelector<HTMLDivElement>("#yte-feature-menu-button");
	if (featureMenuButton) {
		featureMenuButton.style.display = "initial";
	}
}
/**
 * Removes a feature item from the feature menu.
 * @param buttonName - The name of the button to remove.
 */
export function removeFeatureItemFromMenu(buttonName: ButtonNames) {
	// Remove the feature name from the set of features in the menu
	featuresInMenu.delete(buttonName);

	// Get the unique ID for the feature item
	const { featureMenuItemId } = getFeatureIds(buttonName);
	// Find the feature menu
	const featureMenu = document.querySelector<HTMLDivElement>("#yte-feature-menu");
	if (!featureMenu) return;
	// Find the feature menu panel
	const featureMenuPanel = featureMenu.querySelector<HTMLDivElement>("#yte-panel-menu");
	if (!featureMenuPanel) return;

	// Find the specific feature menu item
	const featureMenuItem = featureMenuPanel.querySelector<HTMLDivElement>(`#${featureMenuItemId}`);
	if (!featureMenuItem) return;

	// Remove the feature menu item
	featureMenuItem.remove();

	// Check if there are any items left in the menu
	if (featureMenuPanel.childElementCount === 0) {
		// If no items are left, hide the menu
		featureMenu.style.display = "none";

		// Find the feature menu button
		const featureMenuButton = document.querySelector<HTMLButtonElement>("#yte-feature-menu-button");
		if (!featureMenuButton) return;

		// Hide the feature menu button since the menu is empty
		featureMenuButton.style.display = "none";
	}

	// Adjust the height and width of the feature menu panel
	featureMenu.style.height = `${40 * featureMenuPanel.childElementCount + 16}px`;
}
/**
 * Updates the label for a feature item.
 * @param buttonName the name of the button
 * @param label the label to set
 * @returns
 */
export function updateFeatureMenuItemLabel(buttonName: ButtonNames, label: string) {
	const featureMenuItemLabel = getFeatureMenuItemLabel(buttonName);
	if (!featureMenuItemLabel) return;
	featureMenuItemLabel.textContent = label;
}
/**
 *	Updates the title for the feature menu button.
 * @param title the title to set
 * @returns
 */
export function updateFeatureMenuTitle(title: string) {
	const featureMenuButton = document.querySelector<HTMLButtonElement>("#yte-feature-menu-button");
	if (!featureMenuButton) return;
	featureMenuButton.dataset.title = title;
}
/**
 * Gets the IDs for a feature item.
 * @param buttonName the name of the button
 * @returns { featureMenuItemIconId, featureMenuItemId, featureMenuItemLabelId}
 */
export function getFeatureIds(buttonName: ButtonNames): {
	featureMenuItemIconId: FeatureMenuItemIconId;
	featureMenuItemId: FeatureMenuItemId;
	featureMenuItemLabelId: FeatureMenuItemLabelId;
} {
	const featureMenuItemIconId: FeatureMenuItemIconId = `yte-${buttonName}-icon`;
	const featureMenuItemId: FeatureMenuItemId = `yte-feature-${buttonName}-menuitem`;
	const featureMenuItemLabelId: FeatureMenuItemLabelId = `yte-${buttonName}-label`;
	return {
		featureMenuItemIconId,
		featureMenuItemId,
		featureMenuItemLabelId
	};
}
export function getFeatureMenuItemIcon(buttonName: ButtonNames): Nullable<HTMLDivElement> {
	const selector: WithId<FeatureMenuItemIconId> = `#yte-${buttonName}-icon`;
	return document.querySelector(selector);
}
export function getFeatureMenuItemLabel(buttonName: ButtonNames): Nullable<HTMLDivElement> {
	const selector: WithId<FeatureMenuItemLabelId> = `#yte-${buttonName}-label`;
	return document.querySelector(selector);
}
export function getFeatureMenuItem(buttonName: ButtonNames): Nullable<HTMLDivElement> {
	const selector: WithId<FeatureMenuItemId> = `#yte-feature-${buttonName}-menuitem`;
	return document.querySelector(`#yte-panel-menu > ${selector}`);
}
