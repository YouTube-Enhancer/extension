import { type Dispatch, type SetStateAction, createContext } from "react";

export type SettingsFilterContextProps = {
	filter: string;
	setFilter: Dispatch<SetStateAction<string>>;
};

export const SettingsFilterContext = createContext<SettingsFilterContextProps | undefined>(undefined);
