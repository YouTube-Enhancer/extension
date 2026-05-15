import type { Nullable } from "@/src/types";

export type ElementClassPair = { className: string; element: Nullable<Element> };
export type ModifyElementAction = "add" | "remove";
/**
 * Modifies the class list of a given element by adding or removing a class.
 * @param {ModifyElementAction} action - The action to perform on the class list.
 * @param {ElementClassPair} elementPair - An object containing the class name and the element.
 */
export function modifyElementClassList(action: ModifyElementAction, elementPair: ElementClassPair) {
	const { className, element } = elementPair;
	element?.classList[action](className);
}
/**
 * Modifies class lists on DOM elements using multiple flexible input formats.
 *
 * Accepts:
 * - ElementClassPair array
 * - className or selectors
 * - className or Elements array
 * - className or NodeList
 *
 * Internally normalizes inputs into ElementClassPair[] and applies modifyElementClassList.
 *
 * @param action The class list operation to perform.
 * @param classNameOrPairs Either ElementClassPair[] or a class name string.
 * @param selectors Optional selectors/elements depending on overload.
 */
export function modifyElementsClassList(action: ModifyElementAction, elements: ElementClassPair[]): void;
export function modifyElementsClassList(action: ModifyElementAction, className: string, selectors: string[]): void;
export function modifyElementsClassList(action: ModifyElementAction, className: string, elements: Nullable<Element>[]): void;
export function modifyElementsClassList(action: ModifyElementAction, className: string, elements: NodeListOf<Element>): void;
export function modifyElementsClassList(
	action: ModifyElementAction,
	classNameOrPairs: ElementClassPair[] | string,
	selectors?: NodeListOf<Element> | Nullable<Element>[] | string[]
): void {
	let elements: ElementClassPair[] = [];
	if (Array.isArray(classNameOrPairs) && classNameOrPairs.every((x) => "element" in x)) {
		// Case 1: Array of ElementClassPair
		elements = classNameOrPairs;
	} else if (typeof classNameOrPairs === "string") {
		if (Array.isArray(selectors) && typeof selectors[0] === "string") {
			// Case 2: Array of selector strings
			elements = (selectors as string[]).map((selector) => ({
				className: classNameOrPairs,
				element: document.querySelector(selector)
			}));
		} else if (selectors instanceof NodeList) {
			// Case 3: NodeList
			elements = Array.from(selectors).map((element) => ({
				className: classNameOrPairs,
				element
			}));
		} else if (Array.isArray(selectors) && selectors[0] instanceof Element) {
			// Case 4: Array of Elements
			elements = (selectors as Element[]).map((element) => ({
				className: classNameOrPairs,
				element
			}));
		}
	}
	elements.forEach((pair) => modifyElementClassList(action, pair));
}
