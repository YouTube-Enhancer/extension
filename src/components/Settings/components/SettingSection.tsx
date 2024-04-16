import { cn } from "@/src/utils/utilities";

interface SettingSectionProps {
	children: React.ReactNode;
	className?: string;
}
export default function SettingSection({ children, className }: SettingSectionProps) {
	return <fieldset className={cn("mx-1", className)}>{children}</fieldset>;
}
