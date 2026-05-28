import type { JSX } from "react";

interface Props {
	onChange: (v: string) => void;
	value: string;
}

export default function ApiKeySetting({ onChange, value }: Props): JSX.Element {
	return (
		<div className="flex flex-col gap-2">
			<label className="text-sm font-medium text-[#d4d4d4]">YouTube Data API Key</label>
			<input
				className="w-full rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-[#d4d4d4]"
				onChange={(e) => onChange(e.target.value)}
				type="password"
				value={value}
			/>
		</div>
	);
}
