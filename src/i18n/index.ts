import { createInstance } from "i18next";

import { type AvailableLocales, availableLocales } from "@/src/i18n/constants";
import { DEV_MODE } from "@/src/utils/config/env";
import { waitForSpecificMessage } from "@/src/utils/messaging";
export type i18nInstanceType = ReturnType<typeof createInstance>;
type Translations = typeof import("../../public/locales/en-US.json");

/**
 * Initialized i18n instances, keyed by the locale they were created for. A single module-level instance returned
 * regardless of the requested locale made a live language change re-render with the strings of whichever locale had
 * loaded first.
 */
const i18nInstances = new Map<AvailableLocales, Promise<i18nInstanceType>>();

/**
 * Shared promise for the en-US bundle used as `fallbackLng`. Cached so each locale instance only fetches it once.
 */
let fallbackTranslationsPromise: Promise<Translations> | undefined;

export async function i18nService(locale: AvailableLocales = "en-US") {
	if (!availableLocales.includes(locale))
		throw new Error(`The locale '${locale}' is not available`);
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
	// i18next can only fall back to en-US when its resources are present in the instance, so every instance
	// loads them alongside the target locale. The en-US fetch is shared across instances; when the target
	// locale is en-US itself it doubles as the target's own fetch.
	const fallbackTranslationsPromise = loadFallbackTranslations();
	const translationsPromise =
		locale === "en-US" ? fallbackTranslationsPromise : fetchTranslations(locale);
	const [translations, fallbackTranslations] = await Promise.all([
		translationsPromise,
		fallbackTranslationsPromise
	]);
	return new Promise<i18nInstanceType>((resolve, reject) => {
		const resources: {
			[k in AvailableLocales]?: {
				translation: Translations;
			};
		} = {
			"en-US": { translation: fallbackTranslations },
			[locale]: { translation: translations }
		};
		const i18nextInstance = createInstance();
		void i18nextInstance.init(
			{
				debug: DEV_MODE,
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
/**
 * Loads one locale's messages.
 *
 * In an extension context (settings, devtools) the locale file is fetched directly, exactly as
 * before. In the page world — where the embedded bundle runs on youtube.com — Chrome ≥157
 * refuses any `chrome-extension://` load initiated by the frame, so the file is read by the
 * content script (isolated world, allowed) and the messages arrive over the window bridge.
 * Either way the caller receives the parsed translations, never a URL it might not be able to
 * fetch.
 */
async function fetchTranslations(locale: AvailableLocales): Promise<Translations> {
	if (isPageWorld()) return fetchTranslationsViaContent(locale);
	const response = await fetch(`${chrome.runtime.getURL("")}locales/${locale}.json`).catch(
		(err) => {
			if (err instanceof Error) {
				throw err;
			} else {
				throw new Error("unknown error");
			}
		}
	);
	return (await response.json()) as Translations;
}
/**
 * Asks the content script to read the locale file and send the messages back.
 *
 * The data crosses the bridge instead of a URL: handing the page a `chrome-extension://` URL
 * would leave it with a resource Chrome refuses it to load. `null` means the file could not be
 * read (unknown locale, missing or unreadable file) and is turned into a throw, matching the
 * rejection a failed fetch would have produced.
 */
async function fetchTranslationsViaContent(locale: AvailableLocales): Promise<Translations> {
	const translationsResponse = await waitForSpecificMessage(
		"translations",
		"request_data",
		"content",
		{ locale }
	);
	const {
		data: { translations }
	} = translationsResponse;
	if (!translations) throw new Error(`Failed to load translations for '${locale}'`);
	return translations;
}
/**
 * True when this module is running as a page script rather than in an extension context.
 *
 * Only extension pages and isolated-world scripts get `chrome.runtime.getURL`; a page-world
 * copy of this module (the embedded bundle injected into youtube.com) does not, and any
 * `chrome-extension://` fetch it attempted would be refused by the frame check anyway.
 */
function isPageWorld(): boolean {
	try {
		return typeof chrome === "undefined" || typeof chrome.runtime?.getURL !== "function";
	} catch {
		// A `chrome.runtime` that cannot even be read is not an extension context either.
		return true;
	}
}
function loadFallbackTranslations(): Promise<Translations> {
	fallbackTranslationsPromise ??= fetchTranslations("en-US").catch((error: unknown) => {
		// A failed load must not poison the cache, otherwise en-US could never be loaded again.
		fallbackTranslationsPromise = undefined;
		throw error;
	});
	return fallbackTranslationsPromise;
}
