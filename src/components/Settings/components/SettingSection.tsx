import { Children, isValidElement, type ReactNode } from "react";

import { SectionTitleProvider } from "@/src/hooks/useSectionTitle/provider";
import useSettingsFilter from "@/src/hooks/useSettingsFilter";
import { textMatcher } from "@/src/utils/string";

type SearchableChildProps = {
	children?: ReactNode;
	featureId?: string;
	label?: string;
	title?: string;
};
interface SettingSectionProps {
	children: React.ReactNode[];
	className?: string;
	featureIds?: string[];
	title: string;
}
export default function SettingSection({
	children,
	className = "",
	featureIds = [],
	title: sectionTitle
}: SettingSectionProps) {
	const { filter } = useSettingsFilter();
	const matchesText = textMatcher(filter);
	const shouldSectionBeVisible =
		filter === "" ||
		matchesText(sectionTitle) ||
		featureIds.some((id) => matchesText(id)) ||
		// SettingsGenerator hands its settings over as a nested array, and sections such as button
		// placement put their translated text inside plain elements, so walk the whole subtree.
		Children.toArray(children).some((child) => matchesFilter(child, matchesText));
	return shouldSectionBeVisible ? (
		<SectionTitleProvider
			className={className}
			shouldBeVisible={shouldSectionBeVisible}
			title={sectionTitle}
		>
			{children}
		</SectionTitleProvider>
	) : null;
}

/**
 * True when a child element, its descendants, or its text carry something the filter matches: the
 * translated label, title, or feature id of a setting, or visible copy such as a text node's content.
 */
function matchesFilter(node: ReactNode, matchesText: (text: string) => boolean): boolean {
	if (typeof node === "string") return matchesText(node);
	if (!isValidElement(node)) return false;
	const { children, featureId, label, title } = node.props as SearchableChildProps;
	if (matchesText(featureId ?? "") || matchesText(label ?? "") || matchesText(title ?? "")) {
		return true;
	}
	return Children.toArray(children).some((child) => matchesFilter(child, matchesText));
}
