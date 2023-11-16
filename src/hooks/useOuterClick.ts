import { type MutableRefObject, useEffect, useRef } from "react";

export default function useOuterClick<ElementType extends HTMLElementTagNameMap[keyof HTMLElementTagNameMap]>(
	callback: (...args: unknown[]) => unknown
) {
	const callbackRef: MutableRefObject<((...args: unknown[]) => unknown) | undefined> = useRef(); // initialize mutable ref, which stores callback
	const innerRef: MutableRefObject<ElementType | null> = useRef(null); // returned to client, who marks "border" element

	// update cb on each render, so second useEffect has access to current value
	useEffect(() => {
		callbackRef.current = callback;
	});

	useEffect(() => {
		document.addEventListener("click", handleClick);
		return () => document.removeEventListener("click", handleClick);
		function handleClick(e: unknown) {
			if (
				e !== null &&
				typeof e === "object" &&
				"target" in e &&
				e.target !== null &&
				typeof e.target === "object" &&
				"contains" in e.target &&
				typeof e.target.contains === "function"
			) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
				if (innerRef && innerRef.current && callbackRef.current && !innerRef.current.contains(e.target as Node)) callbackRef.current(e);
			}
		}
	}, [innerRef]); // no dependencies -> stable click listener

	return innerRef; // convenience for client (doesn't need to init ref himself)
}
