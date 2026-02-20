import type EnUS from "public/locales/en-US.json";

import { Suspense, useEffect, useReducer } from "react";

import type { SelectOption } from "@/src/components/Inputs";

import Loader from "@/src/components/Loader";
import Setting from "@/src/components/Settings/components/Setting";
import SettingSection from "@/src/components/Settings/components/SettingSection";
import SettingTitle from "@/src/components/Settings/components/SettingTitle";
import { useSettings } from "@/src/components/Settings/Settings";
import { availableLocales, localePercentages } from "@/src/i18n/constants";

type Action = { payload: boolean; type: "SET_LOADING" } | { payload: SelectOption<"language">[]; type: "SET_LANGUAGES" };
type State = {
	languageOptions: SelectOption<"language">[];
	languagesLoading: boolean;
};
export default function LanguageSettingsSection() {
	const {
		i18nInstance: { t },
		settings: { language: selectedLanguage },
		setValueOption
	} = useSettings();
	const [state, dispatch] = useReducer(reducer, { languageOptions: [], languagesLoading: true });
	useEffect(() => {
		void (async () => {
			try {
				const languages = await getLanguageOptions();
				dispatch({ payload: languages, type: "SET_LANGUAGES" });
			} catch (_) {
				dispatch({ payload: false, type: "SET_LOADING" });
			}
		})();
	}, []);
	return (
		<Suspense fallback={<Loader />}>
			<SettingSection title={t((translations) => translations.pages.options.extras.language.title)}>
				<SettingTitle />
				<Setting
					disabled={false}
					id="language"
					label={t((translations) => translations.pages.options.extras.language.select.label)}
					loading={state.languagesLoading}
					onChange={setValueOption("language")}
					options={state.languageOptions}
					parentSetting={null}
					selectedOption={selectedLanguage}
					title={t((translations) => translations.pages.options.extras.language.select.title)}
					type="select"
				/>
			</SettingSection>
		</Suspense>
	);
}
async function getLanguageOptions() {
	const promises = availableLocales.map(async (locale) => {
		try {
			const response = await fetch(`${chrome.runtime.getURL("")}locales/${locale}.json`);
			const localeData = await response.json();
			const languageOption: SelectOption<"language"> = {
				label: `${(localeData as EnUS).langName} (${localePercentages[locale] ?? 0}%)`,
				value: locale
			};
			return Promise.resolve(languageOption);
		} catch (err) {
			return Promise.reject(err);
		}
	});

	const results = await Promise.allSettled(promises);

	const languageOptions: SelectOption<"language">[] = results
		.filter((result): result is PromiseFulfilledResult<SelectOption<"language">> => result.status === "fulfilled")
		.map((result) => result.value);

	return languageOptions;
}
function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "SET_LANGUAGES":
			return { ...state, languageOptions: action.payload, languagesLoading: false };
		case "SET_LOADING":
			return { ...state, languagesLoading: action.payload };
		default:
			return state;
	}
}
