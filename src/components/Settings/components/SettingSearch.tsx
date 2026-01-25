import { type ChangeEvent, useRef } from "react";
import { MdOutlineSearch } from "react-icons/md";

import type { i18nInstanceType } from "@/src/i18n";

import { useSettings } from "@/src/components/Settings/Settings";
import useSettingsFilter from "@/src/hooks/useSettingsFilter";

export default function SettingSearch({ i18nInstance }: { i18nInstance: i18nInstanceType }) {
	const { filter, setFilter } = useSettingsFilter();
	const { direction } = useSettings();
	const { t } = i18nInstance;
	const inputRef = useRef<HTMLInputElement>(null);
	return (
		<div className="relative my-2 w-full rounded-md border border-gray-300 bg-white dark:multi-['border-gray-700;bg-[#23272a]']" dir={direction}>
			<input
				className="w-full border-none bg-transparent px-3 py-2 text-black placeholder:multi-['text-[hsl(0,0%,70%)];text-xs;sm:text-sm;md:text-base'] focus:outline-none dark:text-white"
				onChange={(e: ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)}
				placeholder={t("pages.options.extras.settingSearch.placeholder")}
				ref={inputRef}
				type="text"
				value={filter}
			/>
			<MdOutlineSearch
				className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(0,0%,70%)] hover:cursor-pointer"
				fontSize={24}
				onClick={() => inputRef.current?.focus()}
			/>
		</div>
	);
}
