import { deepDarkCSSExists } from "@/src/features/deepDarkCSS/utils";
import { resolveContrastColor } from "@/src/utils/color";
import { getDeepDarkData } from "@/src/utils/deep-dark-theme/dom";
import { fallback, resolveDeepDarkColors, resolveFromCSS } from "@/src/utils/deep-dark-theme/utils";
import { IsDarkMode } from "@/src/utils/dom/state";

export const buttonColorCache: ButtonColorCache = {
	_value: undefined,
	clear() {
		this._value = undefined;
	},
	get() {
		return this._value;
	},
	set(value: string) {
		this._value = value;
	}
};
type ButtonColorCache = {
	_value: string | undefined;
	clear(): void;
	get(): string | undefined;
	set(value: string): void;
};

export async function getButtonColor() {
	const cached = buttonColorCache.get();
	if (cached !== undefined) return cached;
	const isDarkMode = IsDarkMode();
	const deepDarkData = getDeepDarkData();
	if (deepDarkData) {
		const colors = resolveDeepDarkColors(deepDarkData);
		const result = colors ? resolveContrastColor(colors) : fallback(isDarkMode);
		buttonColorCache.set(result);
		return result;
	}
	if (deepDarkCSSExists()) {
		const result = await resolveFromCSS();
		buttonColorCache.set(result);
		return result;
	}
	const result = fallback(isDarkMode);
	buttonColorCache.set(result);
	return result;
}
