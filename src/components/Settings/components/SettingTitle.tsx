import useSectionTitle from "@/src/hooks/useSectionTitle";

export default function SettingTitle() {
	const { shouldBeVisible, title } = useSectionTitle();
	return shouldBeVisible ? <legend className="mb-1 text-lg sm:text-xl md:text-2xl">{title}</legend> : null;
}
