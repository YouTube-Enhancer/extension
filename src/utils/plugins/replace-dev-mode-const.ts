import type { PluginOption } from "vite";

import terminalColorLog from "../log";
export default function replaceDevModeConst(): PluginOption {
	return {
		name: "replace-dev-mode-const",
		transform(code, id) {
			if (id.includes("constants.ts")) {
				terminalColorLog(`Replacing DEV_MODE constant`);
				const replacedConstantCode = code.replace(
					/export const DEV_MODE = process.env.__DEV__ === "true";/g,
					`export const DEV_MODE = ${process.env.__DEV__ === "true"};`
				);
				return {
					code: replacedConstantCode,
					map: null
				};
			}
		}
	};
}
