import { useContext } from "react";

import { SettingsFilterContext } from "./context";

const useSettingsFilter = () => {
	const context = useContext(SettingsFilterContext);

	if (context === undefined) {
		throw new Error("useSettingsFilter must be used within a SettingsFilterProvider");
	}

	return context;
};

export default useSettingsFilter;
