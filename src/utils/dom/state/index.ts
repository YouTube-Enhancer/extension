export function IsDarkMode() {
	const darkMode = document.documentElement.hasAttribute("dark");
	return darkMode;
}
