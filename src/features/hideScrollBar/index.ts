export function hideScrollBar() {
	const style = document.createElement("style");
	style.innerHTML = `
		::-webkit-scrollbar {
			width: 0px;
			height: 0px;
		}
	`;
	style.id = "yte-hide-scroll-bar";
	document.head.appendChild(style);
}
export function showScrollBar() {
	const style = document.getElementById("yte-hide-scroll-bar");
	if (style) {
		style.remove();
	}
}
