interface SettingSectionProps {
	children: React.ReactNode;
}
export default function SettingSection({ children }: SettingSectionProps) {
	return <fieldset className="mx-1">{children}</fieldset>;
}
