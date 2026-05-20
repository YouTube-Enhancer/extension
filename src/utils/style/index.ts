import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { OnScreenDisplayPosition } from "@/src/ui/OnScreenDisplayManager/types";

export function calculateCanvasPosition(displayPosition: OnScreenDisplayPosition, displayPadding: number, paddingTop: number, paddingBottom: number) {
	let styles: Partial<CSSStyleDeclaration> = {};

	switch (displayPosition) {
		case "bottom_left":
			styles = { bottom: `${displayPadding + paddingBottom}px`, left: `${displayPadding}px` };
			break;
		case "bottom_right":
			styles = { bottom: `${displayPadding + paddingBottom}px`, right: `${displayPadding}px` };
			break;
		case "center":
			styles = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
			break;
		case "top_left":
			styles = { left: `${displayPadding}px`, top: `${displayPadding + paddingTop}px` };
			break;
		case "top_right":
			styles = { right: `${displayPadding}px`, top: `${displayPadding + paddingTop}px` };
			break;
		default:
			console.error("[calculateCanvasPosition] Invalid display position:", displayPosition);
			break;
	}

	return styles;
}

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function conditionalStyles(...input: (Partial<CSSStyleDeclaration> & { condition: boolean })[]) {
	return input.reduce((acc, { condition, ...style }) => (condition ? { ...acc, ...style } : acc), {} as Partial<CSSStyleDeclaration>);
}
