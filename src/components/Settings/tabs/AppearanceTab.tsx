import { useCallback, useEffect, useRef, useState } from "react";

import type { ThemePreset, UiTheme } from "@/src/utils/uiTheme";

import { cn } from "@/src/utils/style";
import { DEFAULT_THEME, getUiTheme, setUiTheme } from "@/src/utils/uiTheme";

type ThemeCard = {
	bg: string;
	border: string;
	id: ThemePreset;
	label: string;
	text: string;
};

const ACCENT_PRESETS = [
	{ color: "#2979ff", label: "Blue" },
	{ color: "#9c27b0", label: "Purple" },
	{ color: "#4caf50", label: "Green" },
	{ color: "#f44336", label: "Red" },
	{ color: "#ff6d00", label: "Orange" },
	{ color: "#e91e63", label: "Pink" },
	{ color: "#00bcd4", label: "Cyan" },
	{ color: "#009688", label: "Teal" }
];

const THEME_CARDS: ThemeCard[] = [
	{ bg: "bg-[#f5f5f5]", border: "border-gray-300", id: "system", label: "System", text: "text-gray-800" },
	{ bg: "bg-white", border: "border-gray-200", id: "light", label: "Light", text: "text-gray-900" },
	{ bg: "bg-[#181a1b]", border: "border-gray-600", id: "dark", label: "Dark", text: "text-gray-100" },
	{ bg: "bg-black", border: "border-gray-800", id: "oled", label: "OLED Black", text: "text-gray-100" },
	{ bg: "bg-[#1a0a2e]", border: "border-purple-700", id: "purple", label: "Purple Night", text: "text-purple-200" },
	{ bg: "bg-[#0a1628]", border: "border-blue-700", id: "ocean", label: "Ocean Blue", text: "text-blue-200" }
];

type Props = {
	onThemeChange: (theme: UiTheme) => void;
};

export default function AppearanceTab({ onThemeChange }: Props) {
	const [theme, setTheme] = useState<UiTheme>(DEFAULT_THEME);
	const debounceRef = useRef<null | ReturnType<typeof setTimeout>>(null);

	useEffect(() => {
		void getUiTheme().then(setTheme);
	}, []);

	const persistTheme = useCallback(
		(next: UiTheme) => {
			setTheme(next);
			onThemeChange(next);
			if (debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(() => {
				void setUiTheme(next);
			}, 300);
		},
		[onThemeChange]
	);

	function handlePreset(preset: ThemePreset) {
		persistTheme({ ...theme, preset });
	}

	function handleAccent(e: React.ChangeEvent<HTMLInputElement>) {
		persistTheme({ ...theme, accentColor: e.currentTarget.value });
	}

	function handleReset() {
		persistTheme(DEFAULT_THEME);
	}

	return (
		<div className="space-y-6 px-3 py-4">
			<section>
				<h2 className="mb-3 text-base font-semibold text-[var(--section-heading)]">Theme Presets</h2>
				<div className="grid grid-cols-3 gap-2">
					{THEME_CARDS.map((card) => (
						<button
							className={cn(
								"flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all duration-150",
								card.bg,
								theme.preset === card.id ?
									"ring-[var(--accent)]/30 border-[var(--accent)] shadow-md ring-2"
								:	`${card.border} hover:border-[var(--accent)]/50`
							)}
							key={card.id}
							onClick={() => handlePreset(card.id)}
							title={`Switch to ${card.label} theme`}
							type="button"
						>
							<div className={cn("h-6 w-full rounded-md", card.bg, "border", card.border)} />
							<span className={cn("text-xs font-medium", card.text, "dark:text-current")}>{card.label}</span>
						</button>
					))}
				</div>
			</section>

			<section>
				<h2 className="mb-3 text-base font-semibold text-[var(--section-heading)]">Accent Color</h2>
				<div className="mb-3 flex flex-wrap gap-2">
					{ACCENT_PRESETS.map((preset) => {
						const isSelected = theme.accentColor.toLowerCase() === preset.color.toLowerCase();
						return (
							<button
								className="size-7 rounded-full transition-transform hover:scale-110"
								key={preset.color}
								onClick={() => persistTheme({ ...theme, accentColor: preset.color })}
								style={{
									backgroundColor: preset.color,
									outline: isSelected ? `2px solid ${preset.color}` : "1px solid rgba(0,0,0,0.12)",
									outlineOffset: isSelected ? "2px" : "0"
								}}
								title={preset.label}
								type="button"
							/>
						);
					})}
				</div>
				<div className="flex items-center gap-3">
					<div
						className="relative size-10 cursor-pointer overflow-hidden rounded-full border-2 border-gray-300 shadow-sm transition-transform hover:scale-110 dark:border-gray-600"
						title="Pick accent color"
					>
						<input
							className="absolute inset-0 size-full cursor-pointer opacity-0"
							onChange={handleAccent}
							title="Accent color"
							type="color"
							value={theme.accentColor}
						/>
						<div className="pointer-events-none absolute inset-0 rounded-full" style={{ background: theme.accentColor }} />
					</div>
					<div className="flex flex-col">
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">Accent Color</span>
						<span className="font-mono text-xs text-gray-500 dark:text-gray-400">{theme.accentColor.toUpperCase()}</span>
					</div>
				</div>
			</section>

			<section>
				<button
					className="rounded-lg border border-[var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] px-4 py-2 text-sm text-[var(--btn-secondary-text)] transition-colors hover:opacity-80"
					onClick={handleReset}
					type="button"
				>
					Reset to Default
				</button>
			</section>
		</div>
	);
}
