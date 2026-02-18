import { useEffect, useState } from "react";
import { MdOutlineExpandMore } from "react-icons/md";

import { useSettings } from "@/src/components/Settings/Settings";

export default function ScrollHint() {
	const {
		i18nInstance: { t }
	} = useSettings();
	const [canScroll, setCanScroll] = useState<boolean>(true);
	useEffect(() => {
		const handleScroll = () => {
			const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
			setCanScroll(window.scrollY < scrollableHeight);
		};
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);
	const isPopup = window.location.href.match(/.+\/src\/pages\/popup\/index\.html/g);
	return (
		!isPopup &&
		canScroll && (
			<div
				className="z-100 fixed bottom-0 right-0 mb-4 mr-4 flex justify-between gap-1 bg-[#f5f5f5] p-2 dark:bg-[#181a1b]"
				title={t((translations) => translations.pages.options.extras.scrollForMoreSettings)}
			>
				<MdOutlineExpandMore className="size-10 text-gray-500 dark:text-gray-300" />
			</div>
		)
	);
}
