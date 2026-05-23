import useSectionTitle from "@/src/hooks/useSectionTitle";

export default function SettingTitle() {
	const { description, shouldBeVisible, title } = useSectionTitle();
	if (!shouldBeVisible) return null;
	return (
		<>
			<legend className="mb-1 text-lg sm:text-xl md:text-2xl">{title}</legend>
			{description && <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
		</>
	);
}
