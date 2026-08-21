import { type FeatureDependencies, type PageType, pageTypes } from "@/src/features/_registry/types";
export const loginRequiredPages: readonly PageType[] = ["home", "subscriptions"];
export function resolveNonTargetPage(deps?: FeatureDependencies): PageType | undefined {
	return pageTypes.find((pt) => !deps?.includePages?.includes(pt) && !deps?.excludePages?.includes(pt) && !loginRequiredPages.includes(pt));
}
export function resolvePageTypes(include?: readonly PageType[]) {
	return include?.length ? include : pageTypes;
}
