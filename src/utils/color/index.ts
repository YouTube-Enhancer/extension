export function getContrast(color1: string, color2: string): number {
	const color1Rgb = hexToRgb(color1);
	const color2Rgb = hexToRgb(color2);
	if (!color1Rgb || !color2Rgb) {
		return 0;
	}
	const lum1 = getLuminance(color1Rgb);
	const lum2 = getLuminance(color2Rgb);

	const brightest = Math.max(lum1, lum2);
	const darkest = Math.min(lum1, lum2);

	return (brightest + 0.05) / (darkest + 0.05);
}
export function resolveContrastColor(cssText: string): string {
	const background = parseMainBackgroundColor(cssText);
	const white = getContrast(background, "#FFFFFF");
	const black = getContrast(background, "#000000");
	return white > black ? "#FFFFFF" : "#000000";
}
function getLuminance(rgb: { b: number; g: number; r: number }): number {
	const r = rgb.r / 255;
	const g = rgb.g / 255;
	const b = rgb.b / 255;

	const r2 = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
	const g2 = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
	const b2 = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

	return 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2;
}
function hexToRgb(hex: string) {
	// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
	const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
	hex = hex.replace(shorthandRegex, (_match: string, r: string, g: string, b: string): string => {
		return r + r + g + g + b + b;
	});

	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ?
			{
				b: parseInt(result[3], 16),
				g: parseInt(result[2], 16),
				r: parseInt(result[1], 16)
			}
		:	null;
}
function parseMainBackgroundColor(text: string) {
	const match = text.match(/--main-background:\s*([^;]+);/);
	return match ? match[1].trim() : "";
}
