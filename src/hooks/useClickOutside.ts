import type { Nullable } from "@/src/types";

import { type RefObject, useEffect } from "react";

// Improved version of https://usehooks.com/useOnClickOutside/

const useClickOutside = <ElementType extends HTMLElementTagNameMap[keyof HTMLElementTagNameMap]>(
	ref: RefObject<ElementType>,

	handler: (event: FocusEvent | MouseEvent | TouchEvent) => void
) => {
	useEffect(() => {
		let startedInside: Nullable<RefObject<ElementType> | boolean> = false;

		let startedWhenMounted: Nullable<RefObject<ElementType>["current"] | boolean> = false;

		const listener = (event: FocusEvent | MouseEvent | TouchEvent) => {
			// Do nothing if `mousedown` or `touchstart` started inside ref element

			if (startedInside || !startedWhenMounted) return;

			// Do nothing if clicking ref's element or descendent elements

			if (!ref.current || ref.current.contains(event.target as Node)) return;

			handler(event);
		};

		const validateEventStart = (event: FocusEvent | MouseEvent | TouchEvent) => {
			({ current: startedWhenMounted } = ref);

			startedInside = event.target && ref.current && ref.current.contains(event.target as Node);
		};

		document.addEventListener("mousedown", validateEventStart);

		document.addEventListener("touchstart", validateEventStart);

		document.addEventListener("click", listener);

		return () => {
			document.removeEventListener("mousedown", validateEventStart);

			document.removeEventListener("touchstart", validateEventStart);

			document.removeEventListener("click", listener);
		};
	}, [ref, handler]);
};

export default useClickOutside;
