import { SectionTitleProvider } from "@/src/hooks/useSectionTitle/provider";
import useSettingsFilter from "@/src/hooks/useSettingsFilter";

interface SettingSectionProps {
	children: React.ReactNode[];
	className?: string;
	title: string;
}
export default function SettingSection({ children, className = "", title: sectionTitle = "" }: SettingSectionProps) {
	const { filter } = useSettingsFilter();
	if (children.length === 0) return null;
	if (filter === "")
		return (
			<SectionTitleProvider className={className} title={sectionTitle}>
				{children}
			</SectionTitleProvider>
		);
	const shouldSectionBeVisible =
		(sectionTitle && sectionTitle.toLowerCase().includes(filter.toLowerCase())) ||
		(children as React.ReactElement<{ label?: string; title?: string }>[]).filter((child) => {
			if (!child) return false;
			if (!child.props) return false;
			return (
				(child.props.label !== undefined && child.props.label.toLowerCase().includes(filter.toLowerCase())) ||
				(child.props.title !== undefined && child.props.title.toLowerCase().includes(filter.toLowerCase()))
			);
		}).length > 0;
	return shouldSectionBeVisible ?
			<SectionTitleProvider className={className} title={sectionTitle}>
				{children}
			</SectionTitleProvider>
		:	null;
}
