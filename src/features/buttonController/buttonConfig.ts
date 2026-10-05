import type { ButtonPlacement, FullscreenPlacement } from "@/src/types";

export type ButtonConfigSlice = {
	enabled?: boolean;
	fullscreenPlacement?: FullscreenPlacement;
	placement?: ButtonPlacement;
};

/**
 * Resolves one button's settings from a feature config object.
 * Shared by placement and removal so both probe `"buttons"` / `"button"` the same way.
 */
export function getButtonConfig(cfg: unknown, name: string): ButtonConfigSlice | null {
	if (!cfg || typeof cfg !== "object") return null;
	if ("buttons" in cfg) {
		const {
			buttons: { [name]: btnCfg }
		} = cfg as { buttons: Record<string, ButtonConfigSlice> };
		return btnCfg ?? null;
	}
	if ("button" in cfg) {
		const { button: btnCfg } = cfg as { button?: ButtonConfigSlice };
		return btnCfg ?? null;
	}
	return null;
}
