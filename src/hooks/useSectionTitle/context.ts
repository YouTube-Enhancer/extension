import { createContext } from "react";

export type SectionTitleContextProps = {
	description?: string;
	shouldBeVisible: boolean;
	title: string;
};
export const SectionTitleContext = createContext<SectionTitleContextProps | undefined>(undefined);
