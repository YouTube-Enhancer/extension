import type { JSX } from "react";

type ConfigEditorProps = {
	config: Record<string, unknown>;
	featureId: string;
	featureName: string;
	onSave: (newConfig: Record<string, unknown>) => void;
};

export default function ConfigEditor({ config, featureId, featureName, onSave }: ConfigEditorProps): JSX.Element {
	const handleChange = (key: number | string, value: boolean | number | string) => {
		onSave({ ...config, [key]: value });
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-medium text-[#d4d4d4]">{featureName}</h3>
				<span className="rounded bg-[#3c3c3c] px-2 py-1 text-xs text-[#6b6b6b]">{featureId}</span>
			</div>

			<div className="space-y-3">
				{Object.entries(config).map(([key, value]) => (
					<div className="flex items-center justify-between" key={key}>
						<label className="text-sm text-[#9cdcfe]">{key}</label>
						{typeof value === "boolean" ?
							<input checked={value} className="size-4 accent-[#007acc]" onChange={(e) => handleChange(key, e.target.checked)} type="checkbox" />
						: typeof value === "number" ?
							<input
								className="w-24 rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-sm text-[#d4d4d4]"
								onChange={(e) => handleChange(key, Number(e.target.value))}
								type="number"
								value={value}
							/>
						:	<input
								className="w-48 rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-sm text-[#d4d4d4]"
								onChange={(e) => handleChange(key, e.target.value)}
								type="text"
								value={String(value)}
							/>
						}
					</div>
				))}
			</div>

			<div className="flex justify-end gap-2 pt-2">
				<button className="rounded bg-[#2d2d2d] px-3 py-1.5 text-sm text-[#d4d4d4] hover:bg-[#3c3c3c]" onClick={() => {}}>
					Reset to Defaults
				</button>
				<button className="rounded bg-[#007acc] px-3 py-1.5 text-sm text-white hover:bg-[#005a9e]" onClick={() => onSave(config)}>
					Save Changes
				</button>
			</div>
		</div>
	);
}
