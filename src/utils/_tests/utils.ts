import { type PageType, pageTypes } from "@/src/features/_registry/types";
export function resolvePageTypes(include?: readonly PageType[]) {
	return include?.length ? include : pageTypes;
}
