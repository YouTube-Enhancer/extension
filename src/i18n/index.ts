import { createInstance, type Resource } from "i18next";

import { type AvailableLocales, availableLocales } from "@/src/i18n/constants";
import { waitForSpecificMessage } from "@/src/utils/messaging";
export type i18nInstanceType = ReturnType<typeof createInstance>;

// Store the initialized i18n instance
let i18nInstance: i18nInstanceType | null = null;
export async function i18nService(locale: AvailableLocales = "en-US") {
	// Return the existing instance if already initialized
	if (i18nInstance) {
		return i18nInstance;
	}

	let extensionURL;
	const {
		location: { hostname }
	} = window;
	const isYouTube = hostname === "youtube.com" || hostname.endsWith(".youtube.com");
	if (isYouTube) {
		const extensionURLResponse = await waitForSpecificMessage("extensionURL", "request_data", "content");
		if (!extensionURLResponse) throw new Error("Failed to get extension URL");
		({
			data: { extensionURL }
		} = extensionURLResponse);
	} else {
		extensionURL = chrome.runtime.getURL("");
	}
	if (!availableLocales.includes(locale)) throw new Error(`The locale '${locale}' is not available`);
	const response = await fetch(`${extensionURL}locales/${locale}.json`).catch((err) => {
		if (err instanceof Error) {
			throw err;
		} else {
			throw new Error("unknown error");
		}
	});
	const translations = (await response.json()) as typeof import("../../public/locales/en-US.json");
	const instance = await new Promise<i18nInstanceType>((resolve, reject) => {
		const resources: {
			[k in AvailableLocales]?: {
				translation: typeof import("../../public/locales/en-US.json");
			};
		} = {
			[locale]: { translation: translations }
		};
		const i18nextInstance = createInstance();
		void i18nextInstance.init(
			{
				debug: true,
				fallbackLng: "en-US",
				interpolation: {
					escapeValue: false
				},
				lng: locale,
				resources: resources as unknown as { [key: string]: Resource },
				returnObjects: true
			},
			(err) => {
				if (err && err instanceof Error) reject(err);
				else if (err && typeof err === "string") reject(new Error(err));
				else if (err) reject(new Error("unknown error"));
				else resolve(i18nextInstance);
			}
		);
	});

	i18nInstance = instance;
	return i18nInstance;
}
