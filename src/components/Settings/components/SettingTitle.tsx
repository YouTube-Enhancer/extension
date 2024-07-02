import useSectionTitle from "@/src/hooks/useSectionTitle";
import useSettingsFilter from "@/src/hooks/useSettingsFilter";

export default function SettingTitle() {
	const { filter } = useSettingsFilter();
	const { title } = useSectionTitle();
	const shouldSettingTitleBeVisible = filter === "" ? true : title.toLowerCase().includes(filter.toLowerCase());
	return shouldSettingTitleBeVisible ? <legend className="mb-1 text-lg sm:text-xl md:text-2xl">{title}</legend> : null;
}
