import type { ToggleIcon } from "@/src/icons";

/**
 * Single convention shared by the hideEndScreenCardsButton button, its feature menu item and
 * hideEndScreenCards.onConfigChange:
 * `aria-checked="true"` means the end screen cards are hidden, i.e. the hideEndScreenCards feature is active.
 *
 * The label and the icon advertise the action the next click performs, so the checked (cards hidden) state
 * reads "Show end screen cards" and the unchecked (cards visible) state reads "Hide end screen cards".
 *
 * Lives in `src/utils/` because two registered features share it (AGENTS.md: shared logic must not be
 * imported from another feature's internals).
 */
export function getEndScreenCardsButtonIcon(
	icons: ToggleIcon,
	cardsAreHidden: boolean
): SVGSVGElement {
	return cardsAreHidden ? icons.off : icons.on;
}
export function getEndScreenCardsButtonTitle(cardsAreHidden: boolean): string {
	return window.i18nextInstance.t(
		(translations) =>
			translations.pages.content.features.hideEndScreenCardsButton.button.toggle[
				cardsAreHidden ? "on" : "off"
			]
	);
}
