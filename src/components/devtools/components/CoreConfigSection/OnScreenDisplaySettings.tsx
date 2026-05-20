import type { JSX } from "react";

import type { configuration } from "@/src/types";

import {
	onScreenDisplayColors,
	type OnScreenDisplayPosition,
	onScreenDisplayPositions,
	type OnScreenDisplayType,
	onScreenDisplayTypes
} from "@/src/ui/OnScreenDisplayManager/types";
import { cn } from "@/src/utils/style";

interface Props {
	config: configuration["onScreenDisplay"];
	onChange: (v: configuration["onScreenDisplay"]) => void;
}

export default function OnScreenDisplaySettings({ config, onChange }: Props): JSX.Element {
	const osd = config ?? { color: "white", hideTime: 750, opacity: 75, padding: 5, position: "center", type: "text" };

	return (
		<div className="flex flex-col gap-4 rounded border border-[#3c3c3c] p-4">
			<h3 className="text-sm font-medium text-[#d4d4d4]">On-Screen Display</h3>

			<div className="flex flex-col gap-2">
				<label className="text-xs text-[#969696]">Type</label>
				<select
					className="w-full rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-[#d4d4d4]"
					onChange={(e) => onChange({ ...osd, type: e.target.value as OnScreenDisplayType })}
					value={osd.type}
				>
					{onScreenDisplayTypes.map((t) => (
						<option key={t} value={t}>
							{t.replace("_", " ")}
						</option>
					))}
				</select>
			</div>

			<div className="flex flex-col gap-2">
				<label className="text-xs text-[#969696]">Position</label>
				<select
					className="w-full rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-[#d4d4d4]"
					onChange={(e) => onChange({ ...osd, position: e.target.value as OnScreenDisplayPosition })}
					value={osd.position}
				>
					{onScreenDisplayPositions.map((p) => (
						<option key={p} value={p}>
							{p.replace("_", " ")}
						</option>
					))}
				</select>
			</div>

			<div className="flex flex-col gap-2">
				<label className="text-xs text-[#969696]">Color</label>
				<div className="flex flex-wrap gap-2">
					{onScreenDisplayColors.map((c) => (
						<button
							className={cn("size-6 rounded-full border-2", osd.color === c ? "border-[#007acc]" : "border-transparent")}
							key={c}
							onClick={() => onChange({ ...osd, color: c })}
							style={{ backgroundColor: c }}
							title={c}
						/>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<label className="text-xs text-[#969696]">Opacity ({osd.opacity}%)</label>
				<input
					className="w-full"
					max={100}
					min={1}
					onChange={(e) => onChange({ ...osd, opacity: Number(e.target.value) })}
					type="range"
					value={osd.opacity}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<label className="text-xs text-[#969696]">Hide Time (ms)</label>
				<input
					className="w-full rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-[#d4d4d4]"
					min={1}
					onChange={(e) => onChange({ ...osd, hideTime: Number(e.target.value) })}
					type="number"
					value={osd.hideTime}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<label className="text-xs text-[#969696]">Padding</label>
				<input
					className="w-full rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-[#d4d4d4]"
					min={0}
					onChange={(e) => onChange({ ...osd, padding: Number(e.target.value) })}
					type="number"
					value={osd.padding}
				/>
			</div>
		</div>
	);
}
