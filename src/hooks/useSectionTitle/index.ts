import { useContext } from "react";

import { SectionTitleContext } from "./context";

const useSectionTitle = () => {
	const context = useContext(SectionTitleContext);

	if (context === undefined) {
		throw new Error("useSectionTitle must be used within a SectionTitleProvider");
	}

	return context;
};
export default useSectionTitle;
