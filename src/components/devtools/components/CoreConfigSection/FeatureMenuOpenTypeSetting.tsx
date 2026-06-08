import type { JSX } from "react";

interface Props {
	onChange: (v: string) => void;
	options: { label: string; value: string }[];
	value: string;
}

export default function FeatureMenuOpenTypeSetting({ onChange, options, value }: Props): JSX.Element {
	return (
		<div className="flex flex-col gap-2">
			<label className="text-sm font-medium text-[#d4d4d4]">Feature Menu Open Type</label>
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
