import { createContext, type Dispatch, type SetStateAction } from "react";

export type SettingsFilterContextProps = {
	filter: string;
	setFilter: Dispatch<SetStateAction<string>>;
};

export const SettingsFilterContext = createContext<SettingsFilterContextProps | undefined>(undefined);
