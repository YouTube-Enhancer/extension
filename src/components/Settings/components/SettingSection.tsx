import { SectionTitleProvider } from "@/src/hooks/useSectionTitle/provider";
import useSettingsFilter from "@/src/hooks/useSettingsFilter";
import { textMatcher } from "@/src/utils/string";

interface SettingSectionProps {
	children: React.ReactNode[];
	className?: string;
	description?: string;
	featureIds?: string[];
	title: string;
}

export default function SettingSection({ children, className = "", description, featureIds = [], title: sectionTitle }: SettingSectionProps) {
	const { filter } = useSettingsFilter();
	const matchesText = textMatcher(filter);
	const shouldSectionBeVisible =
		filter === "" ||
		featureIds.some((id) => matchesText(id)) ||
		(children as React.ReactElement<{ featureId?: string; label?: string; title?: string }>[]).some((child) => {
			const { featureId, label, title } = child.props ?? {};
			return matchesText(featureId ?? "") || matchesText(label ?? "") || matchesText(title ?? "");
		});
	return shouldSectionBeVisible ?
			<SectionTitleProvider className={className} description={description} shouldBeVisible={shouldSectionBeVisible} title={sectionTitle}>
				{children}
			</SectionTitleProvider>
		:	null;
}
