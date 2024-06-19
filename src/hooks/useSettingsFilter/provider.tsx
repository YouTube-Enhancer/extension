import { type ReactElement, useState } from "react";

import { SettingsFilterContext, type SettingsFilterContextProps } from "./context";

export const SettingsFilterProvider = (context: { children: ReactElement | ReactElement[] }) => {
	const [filter, setFilter] = useState("");

	return (
		<SettingsFilterContext.Provider value={{ filter, setFilter } satisfies SettingsFilterContextProps}>
			{context.children}
		</SettingsFilterContext.Provider>
	);
};
