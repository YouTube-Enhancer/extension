interface SettingTitleProps {
	title: string;
}
export default function SettingTitle({ title }: SettingTitleProps) {
	return <legend className="mb-1 text-lg sm:text-xl md:text-2xl">{title}</legend>;
}
