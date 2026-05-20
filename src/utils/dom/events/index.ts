export function preventScroll(event: Event) {
	event.preventDefault();
	event.stopImmediatePropagation();
	event.stopPropagation();
}

export function stopPropagation(e: Event) {
	e.stopPropagation();
}
