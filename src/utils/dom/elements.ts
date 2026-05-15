import type { SVGElementAttributes } from "@/src/utils/SVGElementAttributes";
type SVGChildElement = SVGElement | SVGPathElement | SVGTextElement | SVGTSpanElement;
/**
 * Creates a styled HTML element.
 *
 * @param {string} classlist - List of CSS classes to apply to the element
 * @param {string} elementId - The ID to assign to the element
 * @param {string} elementType - The type of HTML element to create
 * @param {Partial<CSSStyleDeclaration>} styles - A partial object containing CSS styles
 * @returns {HTMLElementTagNameMap[K]} - The created HTML element
 */
export function createStyledElement<ID extends string, K extends keyof HTMLElementTagNameMap>({
	classlist,
	elementId,
	elementType,
	styles
}: {
	classlist?: string[];
	elementId: ID;
	elementType: K;
	styles?: Partial<CSSStyleDeclaration>;
}): HTMLElementTagNameMap[K] {
	// Check if the element already exists
	const elementExists = document.getElementById(elementId) !== null;
	// If the element exists, use it, otherwise create a new element
	const element = (elementExists ? document.getElementById(elementId) : document.createElement(elementType)) as HTMLElementTagNameMap[K];
	// If the element was newly created, set its id
	if (!element.id) element.id = elementId;
	// Apply the styles to the element
	Object.assign(element.style, styles);
	if (classlist) {
		// Add the classes to the element
		element.classList.add(...classlist);
	}
	// Return the element
	return element;
}
/**
 * Creates an SVG element.
 * @param {string} tagName - The name of the SVG element tag
 * @param {SVGElementAttributes[K]} attributes - An object containing attributes to apply to the element
 * @param {SVGChildElement[]} children - A list of child elements to add to the element
 * @returns {SVGElementTagNameMap[K]} - The created SVG element
 */
export function createSVGElement<K extends keyof SVGElementTagNameMap>(
	tagName: K,
	attributes?: SVGElementAttributes<K>,
	...children: SVGChildElement[]
): SVGElementTagNameMap[K] {
	const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);

	if (attributes) {
		Object.entries(attributes).forEach(([key, value]) => {
			element.setAttribute(key, String(value));
		});
	}

	children.forEach((child) => {
		element.appendChild(child);
	});

	return element;
}
