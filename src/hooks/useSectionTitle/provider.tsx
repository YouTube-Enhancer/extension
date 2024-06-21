import { cn } from "@/src/utils/utilities";

import { SectionTitleContext, type SectionTitleContextProps } from "./context";
export const SectionTitleProvider = (
	context: {
		children: React.ReactNode;
		className: string;
	} & SectionTitleContextProps
) => {
	return (
		<SectionTitleContext.Provider value={{ title: context.title }}>
			<fieldset className={cn("mx-1", context.className)}>{context.children}</fieldset>
		</SectionTitleContext.Provider>
	);
};
