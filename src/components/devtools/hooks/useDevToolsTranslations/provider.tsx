import type { ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";

import DevToolsLoader from "@/src/components/devtools/components/DevToolsLoader";
import { DevtoolsTranslationContext } from "@/src/components/devtools/hooks/useDevToolsTranslations/context";
import { i18nService } from "@/src/i18n";

type Props = {
	children: ReactNode;
};
export function DevtoolsTranslationsProvider({ children }: Props) {
	const {
		data: t,
		isError,
		isLoading
	} = useQuery({
		queryFn: async () => {
			const i18nInstance = await i18nService("en-US");
			return i18nInstance.t;
		},
		queryKey: ["devtools_translations"]
	});
	if (isLoading) return <DevToolsLoader message="Loading translations..." />;
	if (isError) return <DevToolsLoader message="Failed to load translations. Check the console for details." />;
	if (!t) return null;
	return <DevtoolsTranslationContext.Provider value={t}>{children}</DevtoolsTranslationContext.Provider>;
}
