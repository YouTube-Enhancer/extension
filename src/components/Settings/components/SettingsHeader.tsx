import SettingSearch from "@/src/components/Settings/components/SettingSearch";

export default function SettingHeader() {
	return (
		<div className="sticky left-0 top-0 z-10 flex flex-col justify-between gap-1 bg-[#f5f5f5] dark:bg-[#181a1b]">
			<h1 className="flex content-center items-center gap-3 text-xl font-bold sm:text-2xl md:text-3xl" dir={"ltr"}>
				<img alt="YouTube Enhancer Icon" className="size-16" src="/icons/icon_128.png" />
				YouTube Enhancer
				<small className="light text-xs sm:text-sm md:text-base">v{chrome.runtime.getManifest().version}</small>
			</h1>
			<SettingSearch />
		</div>
	);
}
