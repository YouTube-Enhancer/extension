import type { ListenerType } from "@/src/features/buttonPlacement/utils";
import type { BasicIcon } from "@/src/icons";

import {
	type AllButtonNames,
	type FeatureMenuItemIconId,
	type FeatureMenuItemId,
	type FeatureMenuItemLabelId,
	type MultiButtonNames,
	type Nullable,
	type SingleButtonFeatureNames,
	type WithId
} from "@/src/types";
import eventManager from "@/src/utils/EventManager";
import { findKeyByValue, waitForAllElements } from "@/src/utils/utilities";

export const featuresInMenu = new Set<AllButtonNames>();
const MENU_ID = "#yte-feature-menu";
const PANEL_ID = "#yte-panel-menu";
const MENU_BUTTON_ID = "#yte-feature-menu-button";
const ITEM_HEIGHT = 40;
const MENU_PADDING = 16;

/**
 * Adds a feature item to the feature menu.
 * @param buttonName The name of the button
 * @param label The label for the feature
 * @param icon The icon for the feature
 * @param listener The listener for the feature
 * @param isToggle Whether the feature is a toggle
 * @param initialChecked The initial checked state of the feature
 */
export async function addFeatureItemToMenu<Name extends AllButtonNames, Toggle extends boolean>(
	buttonName: Name,
	label: string,
	icon: BasicIcon,
	listener: ListenerType<Toggle>,
	isToggle: boolean,
	initialChecked = false
) {
	const featureName = findKeyByValue(buttonName as MultiButtonNames) ?? (buttonName as SingleButtonFeatureNames);
	// Add the feature name to the set of features in the menu
	featuresInMenu.add(buttonName);
	// Wait for the feature menu to exist
	await waitForAllElements([MENU_ID]);
	// Get the feature menu
	const featureMenu = getMenu();
	if (!featureMenu) return;
	const panel = getMenuPanel(featureMenu);
	if (!panel) return;
	const { featureMenuItemIconId, featureMenuItemId, featureMenuItemLabelId } = getFeatureIds(buttonName);
	let menuItem = panel.querySelector<HTMLDivElement>(`#${featureMenuItemId}`);
	// If item exists, just refresh listener + label
	if (menuItem) {
		const labelEl = menuItem.querySelector<HTMLDivElement>(`#${featureMenuItemLabelId}`);
		if (labelEl) labelEl.textContent = label;
		eventManager.removeEventListener(menuItem, "click", featureName);
		eventManager.addEventListener(menuItem, "click", () => featureMenuClickListener(menuItem!, listener, isToggle), featureName);
		return;
	}
	menuItem = document.createElement("div");
	menuItem.className = "ytp-menuitem";
	menuItem.id = featureMenuItemId;
	menuItem.style.height = `${ITEM_HEIGHT}px`;
	menuItem.setAttribute("role", "menuitemcheckbox");
	const menuItemIcon = document.createElement("div");
	menuItemIcon.id = featureMenuItemIconId;
	menuItemIcon.className = "ytp-menuitem-icon";
	menuItemIcon.appendChild(icon);
	menuItem.appendChild(menuItemIcon);
	const menuItemLabel = document.createElement("div");
	menuItemLabel.className = "ytp-menuitem-label";
	menuItemLabel.textContent = label;
	menuItemLabel.id = featureMenuItemLabelId;
	menuItem.appendChild(menuItemLabel);
	const menuItemContent = document.createElement("div");
	menuItemContent.className = "ytp-menuitem-content";
	menuItem.appendChild(menuItemContent);
	if (isToggle) {
		const menuItemToggle = document.createElement("div");
		menuItemToggle.className = "ytp-menuitem-toggle-checkbox";
		menuItemContent.appendChild(menuItemToggle);
		setMenuItemChecked(menuItem, initialChecked);
	}
	eventManager.addEventListener(menuItem, "click", () => featureMenuClickListener(menuItem!, listener, isToggle), featureName);
	panel.appendChild(menuItem);
	updateMenuSize(featureMenu, panel);
	const featureMenuButton = document.querySelector<HTMLDivElement>(MENU_BUTTON_ID);
	if (featureMenuButton) featureMenuButton.style.display = "flex";
}
/**
 * Gets the IDs for a feature item.
 * @param buttonName the name of the button
 * @returns { featureMenuItemIconId, featureMenuItemId, featureMenuItemLabelId}
 */
export function getFeatureIds(buttonName: AllButtonNames): {
	featureMenuItemIconId: FeatureMenuItemIconId;
	featureMenuItemId: FeatureMenuItemId;
	featureMenuItemLabelId: FeatureMenuItemLabelId;
} {
	return {
		featureMenuItemIconId: `yte-${buttonName}-icon`,
		featureMenuItemId: `yte-feature-${buttonName}-menuitem`,
		featureMenuItemLabelId: `yte-${buttonName}-label`
	};
}
export function getFeatureMenuItem(buttonName: AllButtonNames): Nullable<HTMLDivElement> {
	const selector: WithId<FeatureMenuItemId> = `#yte-feature-${buttonName}-menuitem`;
	return document.querySelector(`#yte-panel-menu > ${selector}`);
}
export function getFeatureMenuItemIcon(buttonName: AllButtonNames): Nullable<HTMLDivElement> {
	const selector: WithId<FeatureMenuItemIconId> = `#yte-${buttonName}-icon`;
	return document.querySelector(selector);
}
export function getFeatureMenuItemLabel(buttonName: AllButtonNames): Nullable<HTMLDivElement> {
	const selector: WithId<FeatureMenuItemLabelId> = `#yte-${buttonName}-label`;
	return document.querySelector(selector);
}
/**
 * Removes a feature item from the feature menu.
 * @param buttonName - The name of the button to remove.
 */
export function removeFeatureItemFromMenu(buttonName: AllButtonNames) {
	// Remove the feature name from the set of features in the menu
	featuresInMenu.delete(buttonName);
	const featureMenu = getMenu();
	if (!featureMenu) return;
	const featureMenuPanel = getMenuPanel(featureMenu);
	if (!featureMenuPanel) return;
	const { featureMenuItemId } = getFeatureIds(buttonName);
	const featureMenuItem = featureMenuPanel.querySelector<HTMLDivElement>(`#${featureMenuItemId}`);
	if (!featureMenuItem) return;
	featureMenuItem.remove();
	updateMenuSize(featureMenu, featureMenuPanel);

	if (featureMenuPanel.childElementCount === 0) {
		featureMenu.style.display = "none";
		const featureMenuButton = document.querySelector<HTMLButtonElement>(MENU_BUTTON_ID);
		if (featureMenuButton) featureMenuButton.style.display = "none";
	}
}
export function updateFeatureMenuItemLabel(buttonName: AllButtonNames, label: string) {
	const featureMenuItemLabel = getFeatureMenuItemLabel(buttonName);
	if (featureMenuItemLabel) featureMenuItemLabel.textContent = label;
}
/**
 *	Updates the title for the feature menu button.
 * @param title the title to set
 * @returns
 */
export function updateFeatureMenuTitle(title: string) {
	const featureMenuButton = document.querySelector<HTMLButtonElement>(MENU_BUTTON_ID);
	if (featureMenuButton) featureMenuButton.dataset.title = title;
}

function featureMenuClickListener<Toggle extends boolean>(menuItem: HTMLDivElement, listener: ListenerType<Toggle>, isToggle: boolean) {
	if (!isToggle) return listener();

	const newState = !getMenuItemChecked(menuItem);
	setMenuItemChecked(menuItem, newState);
	listener(newState as any);
}

function getMenu(): HTMLDivElement | null {
	return document.querySelector<HTMLDivElement>(MENU_ID);
}

function getMenuItemChecked(item: HTMLDivElement) {
	return item.getAttribute("aria-checked") === "true";
}

function getMenuPanel(menu: HTMLDivElement): HTMLDivElement | null {
	return menu.querySelector<HTMLDivElement>(PANEL_ID);
}

function setMenuItemChecked(item: HTMLDivElement, value: boolean) {
	item.setAttribute("aria-checked", String(value));
	item.classList.toggle("ytp-menuitem-checked", value);
}

function updateMenuSize(menu: HTMLDivElement, panel: HTMLDivElement) {
	menu.style.height = `${ITEM_HEIGHT * panel.childElementCount + MENU_PADDING}px`;
	menu.style.width = "fit-content";
}
