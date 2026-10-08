import type { FeatureKeys } from "@/src/features/_registry/types";
import type { ButtonPlacement, FullscreenPlacement } from "@/src/types";

import { metadataRegistry } from "@/src/features/_registry/featureMetadataRegistry";

export type ButtonConfigSlice = {
	enabled?: boolean;
	fullscreenPlacement?: FullscreenPlacement;
	placement?: ButtonPlacement;
};

/**
 * Resolve one button's settings from a feature config using metadata's button path.
 * No dual-shape probe: `button` vs `buttons` is declared in feature metadata.
 */
export function resolveButtonConfig(
	config: unknown,
	featureId: FeatureKeys,
	buttonName: string
): ButtonConfigSlice | null {
	if (!config || typeof config !== "object") return null;
	const meta = metadataRegistry.get(featureId);
	if (!meta?.button) return null;
	if (meta.button.path === "buttons") {
		const { buttons } = config as { buttons?: Record<string, ButtonConfigSlice> };
		return buttons?.[buttonName] ?? null;
	}
	const { button } = config as { button?: ButtonConfigSlice };
	return button ?? null;
}
