import { useEffect, useRef, useState } from "react";

export default function useComponentVisible<ElementType extends HTMLElementTagNameMap[keyof HTMLElementTagNameMap]>(initialIsVisible: boolean) {
	const [isComponentVisible, setIsComponentVisible] = useState(initialIsVisible);
	const ref = useRef<ElementType>(null);

	const handleClickOutside = (event: MouseEvent) => {
		if (ref.current && !ref.current.contains(event.target as Node)) {
			setIsComponentVisible(false);
		}
	};

	useEffect(() => {
		document.addEventListener("click", handleClickOutside, true);
		return () => {
			document.removeEventListener("click", handleClickOutside, true);
		};
	}, []);

	return { isComponentVisible, ref, setIsComponentVisible };
}
