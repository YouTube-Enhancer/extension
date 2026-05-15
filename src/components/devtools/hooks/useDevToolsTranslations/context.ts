import { createContext } from "react";

import type { i18nInstanceType } from "@/src/i18n";

export const DevtoolsTranslationContext = createContext<i18nInstanceType["t"] | null>(null);
