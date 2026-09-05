import { createInstance } from "i18next";

import { type AvailableLocales, availableLocales } from "@/src/i18n/constants";
import { waitForSpecificMessage } from "@/src/utils/messaging";
export type i18nInstanceType = ReturnType<typeof createInstance>;
type Translations = typeof import("../../public/locales/en-US.json");

/**
 * Initialized i18n instances, keyed by the locale they were created for. A single module-level instance returned
 * regardless of the requested locale made a live language change re-render with the strings of whichever locale had
 * loaded first.
 */
const i18nInstances = new Map<AvailableLocales, Promise<i18nInstanceType>>();

export async function i18nService(locale: AvailableLocales = "en-US") {
	if (!availableLocales.includes(locale)) throw new Error(`The locale '${locale}' is not available`);
	const cachedInstance = i18nInstances.get(locale);
	// Fast path: an instance for this exact locale was already created.
	if (cachedInstance) {
		const instance = await cachedInstance;
		// Guard against an instance that was switched away from the locale it was created for.
		if (instance.language !== locale) await instance.changeLanguage(locale);
		return instance;
	}
	const instancePromise = createLocaleInstance(locale);
	i18nInstances.set(locale, instancePromise);
	try {
		return await instancePromise;
	} catch (error) {
		// A failed load must not poison the cache, otherwise the locale could never be loaded again.
		i18nInstances.delete(locale);
		throw error;
	}
}
async function createLocaleInstance(locale: AvailableLocales): Promise<i18nInstanceType> {
	const extensionURL = await getExtensionURL();
	const response = await fetch(`${extensionURL}locales/${locale}.json`).catch((err) => {
		if (err instanceof Error) {
			throw err;
		} else {
			throw new Error("unknown error");
		}
	});
	const translations = (await response.json()) as Translations;
	return new Promise<i18nInstanceType>((resolve, reject) => {
		const resources: {
			[k in AvailableLocales]?: {
				translation: Translations;
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
				resources: resources,
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
}
async function getExtensionURL(): Promise<string> {
	const {
		location: { hostname }
	} = window;
	const isYouTube = hostname === "youtube.com" || hostname.endsWith(".youtube.com");
	if (!isYouTube) return chrome.runtime.getURL("");
	const extensionURLResponse = await waitForSpecificMessage("extensionURL", "request_data", "content");
	if (!extensionURLResponse) throw new Error("Failed to get extension URL");
	const {
		data: { extensionURL }
	} = extensionURLResponse;
	return extensionURL;
}
