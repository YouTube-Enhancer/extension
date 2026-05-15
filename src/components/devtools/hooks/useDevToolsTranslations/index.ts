import { useContext } from "react";

import { DevtoolsTranslationContext } from "@/src/components/devtools/hooks/useDevToolsTranslations/context";

export function useDevToolsTranslations() {
	const context = useContext(DevtoolsTranslationContext);
	if (!context) {
		throw new Error("useDevToolsTranslations must be used within a TranslationProvider");
	}
	return context;
}
