import { SectionTitleProvider } from "@/src/hooks/useSectionTitle/provider";
import useSettingsFilter from "@/src/hooks/useSettingsFilter";

interface SettingSectionProps {
	children: React.ReactNode[];
	className?: string;
	title: string;
}
export default function SettingSection({ children, className = "", title: sectionTitle }: SettingSectionProps) {
	const { filter } = useSettingsFilter();
	const shouldSectionBeVisible =
		filter === "" ||
		(sectionTitle && sectionTitle.toLowerCase().includes(filter.toLowerCase())) ||
		(children as React.ReactElement<{ label?: string; title?: string }>[]).some((child) => {
			const { label, title } = child.props ?? {};
			return (
				(label !== undefined && label.toLowerCase().includes(filter.toLowerCase())) ||
				(title !== undefined && title.toLowerCase().includes(filter.toLowerCase()))
			);
		});
	return shouldSectionBeVisible ?
			<SectionTitleProvider className={className} shouldBeVisible={shouldSectionBeVisible} title={sectionTitle}>
				{children}
			</SectionTitleProvider>
		:	null;
}
