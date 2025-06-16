import { cn } from "@/src/utils/utilities";

import { SectionTitleContext, type SectionTitleContextProps } from "./context";
export const SectionTitleProvider = (
	context: SectionTitleContextProps & {
		children: React.ReactNode;
		className: string;
	}
) => {
	return (
		<SectionTitleContext.Provider value={{ shouldBeVisible: context.shouldBeVisible, title: context.title }}>
			<fieldset className={cn("mx-1", context.className)}>{context.children}</fieldset>
		</SectionTitleContext.Provider>
	);
};
