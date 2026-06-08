import type { JSX } from "react";

import { useEffect, useState } from "react";

import type EnUS from "@/public/locales/en-US.json.d";

import { availableLocales, localePercentages } from "@/src/i18n/constants";

interface LanguageOption {
	label: string;
	value: string;
}

interface Props {
	onChange: (v: string) => void;
	value: string;
}

export default function LanguageSetting({ onChange, value }: Props): JSX.Element {
	const [options, setOptions] = useState<LanguageOption[]>([]);

	useEffect(() => {
		void (async () => {
			const promises = availableLocales.map(async (locale) => {
				try {
					const response = await fetch(`${chrome.runtime.getURL("")}locales/${locale}.json`);
					const localeData = (await response.json()) as EnUS;
					return {
						label: `${localeData.langName} (${localePercentages[locale] ?? 0}%)`,
						value: locale
					};
				} catch {
					return { label: locale, value: locale };
				}
			});
			const results = await Promise.all(promises);
			setOptions(results);
		})();
	}, []);

	return (
		<div className="flex flex-col gap-2">
			<label className="text-sm font-medium text-[#d4d4d4]">Language</label>
			<select
				className="w-full rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-[#d4d4d4]"
				onChange={(e) => onChange(e.target.value)}
				value={value}
			>
				{options.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
		</div>
	);
}
