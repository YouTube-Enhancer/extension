import type { JSX } from "react";

interface Props {
	onChange: (v: boolean) => void;
	value: boolean;
}

export default function VersionToggleSetting({ onChange, value }: Props): JSX.Element {
	return (
		<div className="flex items-center gap-2">
			<input
				checked={value}
				className="size-4 accent-[#007acc]"
				id="openSettingsOnMajorOrMinorVersionChange"
				onChange={(e) => onChange(e.target.checked)}
				type="checkbox"
			/>
			<label className="text-sm text-[#d4d4d4]" htmlFor="openSettingsOnMajorOrMinorVersionChange">
				Open settings page on update
			</label>
		</div>
	);
}
