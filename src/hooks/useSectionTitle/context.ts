import { createContext } from "react";

export type SectionTitleContextProps = {
	shouldBeVisible: boolean;
	title: string;
};
export const SectionTitleContext = createContext<SectionTitleContextProps | undefined>(undefined);
