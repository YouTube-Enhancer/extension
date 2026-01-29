import { forwardRef } from "react";

import { useSettings } from "@/src/components/Settings/Settings";
import { cn } from "@/src/utils/utilities";
type ExpandButtonProps = {
	isExpanded: boolean;
	onToggle: () => void;
};
const ExpandButton = forwardRef<HTMLInputElement, ExpandButtonProps>(({ isExpanded, onToggle }, ref) => {
	const {
		i18nInstance: { t }
	} = useSettings();
	const buttonValue = t((translations) =>
		isExpanded ? translations.settings.sections.customCSS.extras.collapse : translations.settings.sections.customCSS.extras.expand
	);
	return (
		<input
			className={cn("my-2 flex self-start rounded-md bg-[rgba(43,43,43,1)] p-2 text-sm sm:text-base md:text-lg dark:hover:bg-[rgba(43,43,43,0.5)]", {
				"ml-2": isExpanded
			})}
			onClick={onToggle}
			ref={ref}
			type="button"
			value={buttonValue}
		/>
	);
});
ExpandButton.displayName = "ExpandButton";
export default ExpandButton;
