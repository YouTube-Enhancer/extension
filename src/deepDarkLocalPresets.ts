/**
 * Hand-maintained deep-dark presets: contributor-added themes that upstream never shipped.
 * `scripts/updateDeepDarkPresets.js` merges these into `src/deepDarkPresets.ts` on every run,
 * so a regeneration never loses them. Keys are preset names, values are the raw
 * `:root { ... }` block; the generator normalizes indentation. A local preset overrides an
 * upstream theme with the same name.
 */
export const deepDarkLocalPresets: Record<string, string> = {
	"Catppuccin-Mocha": `:root {
	--main-color: #cba6f7;               /*Mauve*/
	--main-background: #1e1e2e;          /*Base*/
	--second-background: #181825;        /*Mantle*/
	--hover-background: #313244;         /*Surface 0*/
	--main-text: #cdd6f4;                /*Text*/
	--dimmer-text: #a6adc8;              /*Subtext 1*/
	--shadow: 0 1px 0.5px rgba(0, 0, 0, .15);
}`
};
