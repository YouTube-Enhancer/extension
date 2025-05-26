import { type RefObject, useCallback, useEffect, useState } from "react";

export default function useComponentVisible<ElementType extends HTMLElementTagNameMap[keyof HTMLElementTagNameMap]>(
	ref: RefObject<ElementType>,
	initialIsVisible: boolean
) {
	const [isComponentVisible, setIsComponentVisible] = useState(initialIsVisible);
	const handleClickOutside = useCallback(
		(event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				setIsComponentVisible(false);
			}
		},
		[ref]
	);
	useEffect(() => {
		document.addEventListener("click", handleClickOutside, true);
		return () => {
			document.removeEventListener("click", handleClickOutside, true);
		};
	}, [handleClickOutside]);
	return { isComponentVisible, setIsComponentVisible };
}
