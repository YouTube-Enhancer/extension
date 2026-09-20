import type { CSSProperties, SVGProps } from "react";

import { useState } from "react";
import { MdExpandLess, MdExpandMore, MdFavorite } from "react-icons/md";
import { SiCashapp } from "react-icons/si";

import { useSettings } from "@/src/components/Settings/Settings";
import { cn } from "@/src/utils/style";

const donationOptions = [
	{
		brand: "#00D632",
		fg: "#FFFFFF",
		href: "https://cash.app/$youtubeenhancer",
		icon: SiCashapp,
		iconClassName: "size-[18px]",
		labelKey: "cashApp" as const
	},
	{
		brand: "#FF5A16",
		fg: "#FFFFFF",
		href: "https://ko-fi.com/youtubeenhancer",
		icon: KofiMark,
		iconClassName: "h-[18px] w-[22px]",
		labelKey: "kofi" as const
	},
	{
		brand: "#003087",
		fg: "#FFFFFF",
		href: "https://paypal.me/youtubeenhancer",
		icon: PaypalMark,
		iconClassName: "size-5",
		labelKey: "paypal" as const
	},
	{
		brand: "#008CFF",
		fg: "#FFFFFF",
		href: "https://venmo.com/u/youtubeenhancer",
		icon: VenmoMark,
		iconClassName: "size-[18px]",
		labelKey: "venmo" as const
	}
] as const;

export default function DonateCta() {
	const [expanded, setExpanded] = useState(false);
	const {
		i18nInstance: { t }
	} = useSettings();

	return (
		<div className="mx-2 mb-2">
			<button
				className="flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs transition-[background] hover:bg-[var(--neutral-transparent-5)] sm:text-sm"
				onClick={() => setExpanded(!expanded)}
				type="button"
			>
				<span className="flex items-center gap-1.5 text-[var(--foreground-light)]">
					<MdFavorite size={14} />
					{t((translations) => translations.pages.options.extras.donateCta.label)}
				</span>
				{expanded ?
					<MdExpandLess size={16} />
				:	<MdExpandMore size={16} />}
			</button>
			{expanded && (
				<div className="overflow-hidden px-2 pb-2 pt-1">
					<p className="mb-2 text-xs text-[var(--foreground-light)]">
						{t((translations) => translations.pages.options.extras.donateCta.description)}
					</p>
					<div className="grid gap-3 sm:grid-cols-4">
						{donationOptions.map((option) => {
							const Icon = option.icon;
							return (
								<a
									className={cn(
										"relative isolate inline-flex h-10 w-full items-center justify-center gap-2 overflow-hidden rounded-lg px-4 text-sm font-semibold leading-none shadow-sm transition",
										"before:absolute before:inset-0 before:-z-10 before:bg-white/0 before:transition",
										"hover:-translate-y-0.5 hover:shadow-md hover:before:bg-white/20",
										"active:translate-y-0"
									)}
									href={option.href}
									key={option.labelKey}
									rel="noreferrer"
									style={
										{
											"--tw-ring-color": option.brand,
											backgroundColor: option.brand,
											color: option.fg
										} as CSSProperties
									}
									target="_blank"
								>
									<Icon aria-hidden className={option.iconClassName} />
									{t((translations) => translations.pages.options.extras.donateCta[option.labelKey])}
								</a>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

function KofiMark(props: SVGProps<SVGSVGElement>) {
	return (
		<svg fill="none" viewBox="0 0 241 194" xmlns="http://www.w3.org/2000/svg" {...props}>
			<path
				d="M96.1344 193.911C61.1312 193.911 32.6597 178.256 15.9721 149.829C1.19788 124.912 -0.00585938 97.9229 -0.00585938 67.7662C-0.00585938 49.8876 5.37293 34.3215 15.5413 22.7466C24.8861 12.1157 38.1271 5.22907 52.8317 3.35378C70.2858 1.14271 91.9848 0.958984 114.545 0.958984C151.259 0.958984 161.63 1.4088 176.075 2.85328C195.29 4.76026 211.458 11.932 222.824 23.5955C234.368 35.4428 240.469 51.2624 240.469 69.3627V72.9994C240.469 103.885 219.821 129.733 191.046 136.759C188.898 141.827 186.237 146.871 183.089 151.837L183.006 151.964C172.869 167.632 149.042 193.918 103.401 193.918H96.1281L96.1344 193.911Z"
				fill="#FFFFFF"
			/>
			<path
				d="M15.1975 67.7674C15.1975 37.5285 33.3866 21.164 54.7559 18.4334C70.8987 16.387 90.906 16.1589 114.544 16.1589C151.372 16.1589 160.919 16.6151 174.559 17.9772C206.617 21.1576 225.255 40.937 225.255 69.3577V72.9941C225.255 99.3687 205.932 120.966 179.786 123.234C177.74 130.058 174.559 136.874 170.238 143.698C160.235 159.156 140.228 178.707 103.4 178.707H96.1264C66.1155 178.707 42.9277 165.751 29.0595 142.107C16.7814 121.422 15.1912 98.4563 15.1912 67.7674"
				fill="#202020"
			/>
			<path
				d="M32.2469 67.9899C32.2469 97.3168 34.0654 116.184 43.6127 133.689C54.5225 153.924 74.3018 161.653 96.8117 161.653H103.857C133.411 161.653 147.736 147.329 155.693 134.829C159.558 128.462 162.966 121.417 164.784 112.547L166.147 106.864H174.332C192.521 106.864 208.208 92.09 208.208 73.2166V69.8082C208.208 48.6669 195.024 37.5228 172.058 34.7987C159.102 33.6646 151.372 33.2084 114.538 33.2084C89.7602 33.2084 72.0272 33.4364 58.6152 35.4828C39.7483 38.2134 32.2407 48.8951 32.2407 67.9899"
				fill="#FFFFFF"
			/>
			<path
				d="M166.158 83.6801C166.158 86.4107 168.204 88.4572 171.841 88.4572C183.435 88.4572 189.802 81.8619 189.802 70.9523C189.802 60.0427 183.435 53.2195 171.841 53.2195C168.204 53.2195 166.158 55.2657 166.158 57.9963V83.6866V83.6801Z"
				fill="#202020"
			/>
			<path
				d="M54.5321 82.3198C54.5321 95.732 62.0332 107.326 71.5807 116.424C77.9478 122.562 87.9515 128.93 94.7685 133.022C96.8147 134.157 98.8611 134.841 101.136 134.841C103.866 134.841 106.134 134.157 107.959 133.022C114.782 128.93 124.779 122.562 130.919 116.424C140.694 107.332 148.195 95.7383 148.195 82.3198C148.195 67.7673 137.286 54.8115 121.599 54.8115C112.28 54.8115 105.912 59.5882 101.136 66.1772C96.8147 59.582 90.2259 54.8115 80.9001 54.8115C64.9855 54.8115 54.5256 67.7673 54.5256 82.3198"
				fill="#FF5A16"
			/>
		</svg>
	);
}

function PaypalMark(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="2.2 2 47 47" xmlns="http://www.w3.org/2000/svg" {...props}>
			<path
				d="M38.914 13.35c0 5.574-5.144 12.15-12.927 12.15H18.49l-.368 2.322L16.373 39H7.056l5.605-36h15.095c5.083 0 9.082 2.833 10.555 6.77a9.687 9.687 0 0 1 .603 3.58z"
				fill="#A3B1D0"
			/>
			<path
				d="M44.284 23.7A12.894 12.894 0 0 1 31.53 34.5h-5.206L24.157 48H14.89l1.483-9 1.75-11.178.367-2.322h7.497c7.773 0 12.927-6.576 12.927-12.15 3.825 1.974 6.055 5.963 5.37 10.35z"
				fill="#E6E6E6"
			/>
			<path d="M38.914 13.35C37.31 12.511 35.365 12 33.248 12h-12.64L18.49 25.5h7.497c7.773 0 12.927-6.576 12.927-12.15z" fill="#D2D6E0" />
		</svg>
	);
}

const VENMO_V =
	"M2.543 10.009c.089.186.146.412.146.743 0 .606-.429 1.494-.777 2.06l-.373-2.989L0 9.969l.705 4.2h1.757c.77-1.01 1.718-2.448 1.718-3.554 0-.347-.073-.622-.235-.889l-1.402.283Z";

function VenmoMark(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
			<defs>
				<mask id="venmo-mark-v">
					<rect fill="#FFFFFF" height="24" width="24" />
					<path d={VENMO_V} fill="#000000" transform="translate(5.3 -26.6) scale(3.2)" />
				</mask>
			</defs>
			<rect fill="#FFFFFF" height="23" mask="url(#venmo-mark-v)" rx="5.2" width="23" x="0.5" y="0.5" />
		</svg>
	);
}
