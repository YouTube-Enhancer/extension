import { createContext } from "react";

export type SectionTitleContextProps = {
	title: string;
};
export const SectionTitleContext = createContext<SectionTitleContextProps | undefined>(undefined);
