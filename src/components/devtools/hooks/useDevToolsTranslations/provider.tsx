import { useQuery } from "@tanstack/react-query";

import { DevtoolsTranslationContext } from "@/src/components/devtools/hooks/useDevToolsTranslations/context";
import { i18nService } from "@/src/i18n";

export function DevtoolsTranslationsProvider({ children }: { children: React.ReactNode }) {
	const { data: t } = useQuery({
		queryFn: async () => {
			const i18nInstance = await i18nService("en-US");
			return i18nInstance.t;
		},
		queryKey: ["devtools_translations"]
	});
	if (!t) return null;
	return <DevtoolsTranslationContext.Provider value={t}>{children}</DevtoolsTranslationContext.Provider>;
}
