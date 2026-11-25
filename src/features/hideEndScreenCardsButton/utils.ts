import type { ToggleIcon } from "@/src/icons";

import { getEndScreenCardsButtonIcon } from "@/src/utils/player/endScreenCardsButton";

/**
 * Re-keys the toggle icon pair by checked state, so the icon the shared button controller swaps to on click
 * (`on` while checked, `off` while unchecked) is the one this feature's convention asks for.
 */
export function toCheckedStateIcons(icons: ToggleIcon): ToggleIcon {
	return {
		off: getEndScreenCardsButtonIcon(icons, false),
		on: getEndScreenCardsButtonIcon(icons, true)
	};
}
