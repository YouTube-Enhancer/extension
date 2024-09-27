export function hideScrollBar() {
	const style = document.createElement("style");
	style.textContent = `
		::-webkit-scrollbar {
			width: 0px;
			height: 0px;
		}
		html {
			scrollbar-width: none;
		}
	`;
	style.id = "yte-hide-scroll-bar";
	document.head.appendChild(style);
}
export function showScrollBar() {
	let style = document.getElementById("yte-hide-scroll-bar");
	while (style) {
		style.remove();
		style = document.getElementById("yte-hide-scroll-bar");
	}
}
