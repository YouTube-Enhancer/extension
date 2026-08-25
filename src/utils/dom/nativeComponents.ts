// YouTube's framework renders, themes, and animates yt-button-view-model elements. We only supply the props.
// Do not attach listeners or long-lived state to a host: YouTube can re-create it on a
// re-render, and only the props survive. Handle clicks with a delegated listener in the
// feature. Transient visual state may use the buttonOverrides prop.

import { findInObjectTree } from "@/src/utils/misc";

export type ButtonViewModelVariant = {
	buttonSize: string;
	state: string;
	style: string;
	type: string;
};

// The custom svg must be monochrome.
export type NativeButtonIcon = NativeIconName | { svg: string };

// Icon names verified against YouTube's icon set. Extend the union when you verify more names.
// A wrong name renders an empty button with no error.
export type NativeIconName = "CHECK_CIRCLE_THICK" | "WATCH_LATER";

export interface YtButtonViewModelElement extends HTMLElement {
	buttonOverrides?: Record<string, unknown>;
	rawProps?: {
		classes: string;
		data: Record<string, unknown>;
	};
}

export interface YtLockupViewModelElement extends HTMLElement {
	rawProps?: {
		data?: () => {
			contentId?: string;
			contentType?: string;
			metadata?: Record<string, unknown>;
		};
	};
}

// Innertube buttonViewModel enum values.
const FALLBACK_VARIANT: ButtonViewModelVariant = {
	buttonSize: "BUTTON_VIEW_MODEL_SIZE_DEFAULT",
	state: "BUTTON_VIEW_MODEL_STATE_ACTIVE",
	style: "BUTTON_VIEW_MODEL_STYLE_MONO",
	type: "BUTTON_VIEW_MODEL_TYPE_TEXT"
};

export function createNativeButton({
	accessibilityText,
	className,
	icon,
	tooltip,
	variant
}: {
	accessibilityText: string;
	className: string;
	icon: NativeButtonIcon;
	tooltip: string;
	variant?: Partial<ButtonViewModelVariant>;
}): YtButtonViewModelElement {
	const host = document.createElement("yt-button-view-model") as YtButtonViewModelElement;
	// A custom icon works through a stylesheet keyed on a host class. Both survive a
	// YouTube re-render: the stylesheet never leaves, and the classes prop re-applies the class.
	const classes = typeof icon === "object" ? `${className} ${ensureCustomIconClass(icon.svg)}` : className;
	// The classes prop puts the class on the host after render. Set it now as well,
	// so the caller's selectors match in the frames before the first render.
	host.className = classes;
	host.rawProps = {
		classes,
		data: {
			...FALLBACK_VARIANT,
			...variant,
			accessibilityText,
			// A custom icon needs a placeholder name, so YouTube still renders the icon wrapper.
			// The custom-icon stylesheet hides the placeholder and draws the custom svg.
			iconName: typeof icon === "object" ? "WATCH_LATER" : icon,
			tooltip
		}
	};
	return host;
}

// Use this with renderer data, e.g. a Polymer element's data property.
export function findButtonVariantInData(root: unknown): Partial<ButtonViewModelVariant> {
	return (
		findInObjectTree(
			root,
			(node) => {
				const buttonViewModel = node.buttonViewModel as Partial<ButtonViewModelVariant> | undefined;
				return buttonViewModel && (buttonViewModel.style || buttonViewModel.type) ? pickVariant(buttonViewModel) : null;
			},
			8
		) ?? {}
	);
}

export function isNativeButtonComponentAvailable(): boolean {
	return typeof customElements.get("yt-button-view-model") === "function";
}

export function readLockupData(lockup: Element) {
	const { rawProps } = lockup as YtLockupViewModelElement;
	if (!rawProps || typeof rawProps.data !== "function") return null;
	return rawProps.data();
}

// Polymer applies scoped CSS through classes on the children of a host, e.g. "style-scope ytd-menu-renderer".
// Read them from a sibling so a new element receives the same scoped styles and spacing.
// The yte- filter keeps our own marker classes off the copy.
export function readScopeClasses(sibling: Element): string {
	return [...sibling.classList].filter((name) => !name.startsWith("yte-")).join(" ");
}

export function setNativeButtonBusy(host: YtButtonViewModelElement, busy: boolean) {
	host.buttonOverrides = busy ? { state: "BUTTON_VIEW_MODEL_STATE_DISABLED" } : {};
}

// Wait for YouTube to register the component. On a slow load, it can register after us.
// Resolve false after the timeout, so the caller can degrade instead of waiting forever.
export function waitForNativeButtonComponent(timeout = 10000): Promise<boolean> {
	if (isNativeButtonComponentAvailable()) return Promise.resolve(true);
	return Promise.race([
		customElements.whenDefined("yt-button-view-model").then(() => true),
		new Promise<boolean>((resolve) => {
			window.setTimeout(() => resolve(false), timeout);
		})
	]);
}

const customIconClasses = new Map<string, string>();

function ensureCustomIconClass(svg: string): string {
	const known = customIconClasses.get(svg);
	if (known) return known;
	const iconClass = `yte-native-icon-${customIconClasses.size}`;
	customIconClasses.set(svg, iconClass);
	const style = document.createElement("style");
	// The mask uses currentcolor, so the icon follows the theme like a native icon.
	style.textContent = `
.${iconClass} .ytSpecButtonShapeNextIcon > * {
	display: none;
}
.${iconClass} .ytSpecButtonShapeNextIcon::before {
	background-color: currentcolor;
	content: "";
	display: block;
	height: 24px;
	mask-image: url("data:image/svg+xml,${encodeURIComponent(svg)}");
	mask-position: center;
	mask-repeat: no-repeat;
	mask-size: contain;
	width: 24px;
}`;
	document.head.appendChild(style);
	return iconClass;
}

// Keep only the keys that have a value. A key with an undefined value wins in an object
// spread and would wipe the defaults of the target.
function pickVariant(source: Partial<ButtonViewModelVariant>): Partial<ButtonViewModelVariant> {
	const { buttonSize, state, style, type } = source;
	return Object.fromEntries(Object.entries({ buttonSize, state, style, type }).filter(([, value]) => Boolean(value)));
}
