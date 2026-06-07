import browser from "webextension-polyfill";

export type ThemePreset = "dark" | "light" | "ocean" | "oled" | "purple" | "system";

export type UiTheme = {
	accentColor: string;
	preset: ThemePreset;
};

const STORAGE_KEY = "yte_ui_theme";

export const DEFAULT_THEME: UiTheme = {
	accentColor: "#2979ff",
	preset: "system"
};

export function applyTheme(theme: UiTheme, element: HTMLElement): void {
	if (theme.preset === "system") {
		element.removeAttribute("data-theme");
	} else {
		element.setAttribute("data-theme", theme.preset);
	}
	element.style.setProperty("--accent", theme.accentColor);
	const hsl = hexToHsl(theme.accentColor);
	if (hsl) {
		element.style.setProperty("--accent-dark", `hsl(${hsl.h}, ${hsl.s}%, ${Math.max(hsl.l - 10, 0)}%)`);
	}
}

export async function getUiTheme(): Promise<UiTheme> {
	const result = await browser.storage.local.get(STORAGE_KEY);
	const stored = result[STORAGE_KEY] as UiTheme | undefined;
	if (!stored) return DEFAULT_THEME;
	return { ...DEFAULT_THEME, ...stored };
}

export async function setUiTheme(theme: UiTheme): Promise<void> {
	await browser.storage.local.set({ [STORAGE_KEY]: theme });
}

function hexToHsl(hex: string): null | { h: number; l: number; s: number } {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) return null;
	const r = parseInt(result[1], 16) / 255;
	const g = parseInt(result[2], 16) / 255;
	const b = parseInt(result[3], 16) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;
	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case b:
				h = ((r - g) / d + 4) / 6;
				break;
			case g:
				h = ((b - r) / d + 2) / 6;
				break;
			case r:
				h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
				break;
		}
	}
	return { h: Math.round(h * 360), l: Math.round(l * 100), s: Math.round(s * 100) };
}
