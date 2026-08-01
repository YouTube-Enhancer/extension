import { createContext } from "react";

import type { i18nInstanceType } from "@/src/i18n";
import type { Nullable } from "@/src/types";

export const DevtoolsTranslationContext = createContext<Nullable<i18nInstanceType["t"]>>(null);
