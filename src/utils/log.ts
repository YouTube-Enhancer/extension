type ColorType = "success" | "info" | "error" | "warning" | keyof typeof TerminalColors;
export function colorizeTerminalLog(message: string, type?: ColorType) {
	let color: ColorType | string | typeof TerminalColors = type || "FgBlack";

	switch (type) {
		case "success":
			({ ["FgGreen"]: color } = TerminalColors);
			break;
		case "info":
			({ ["FgBlue"]: color } = TerminalColors);
			break;
		case "error":
			({ ["FgRed"]: color } = TerminalColors);
			break;
		case "warning":
			({ ["FgYellow"]: color } = TerminalColors);
			break;
		default: {
			if (typeof type === "string" && TerminalColors[type]) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				({ [`${type}`]: color } = TerminalColors);
			}
			break;
		}
	}

	return `${color}${message}${TerminalColors.Reset}`;
}
export default function terminalColorLog(message: string, type?: ColorType) {
	console.log(colorizeTerminalLog(`[YouTube Enhancer]`, "FgCyan"), colorizeTerminalLog(message, type));
}

const TerminalColors = {
	Reset: "\x1b[0m",
	Bright: "\x1b[1m",
	Dim: "\x1b[2m",
	Underscore: "\x1b[4m",
	Blink: "\x1b[5m",
	Reverse: "\x1b[7m",
	Hidden: "\x1b[8m",
	FgBlack: "\x1b[30m",
	FgRed: "\x1b[31m",
	FgGreen: "\x1b[32m",
	FgYellow: "\x1b[33m",
	FgBlue: "\x1b[34m",
	FgMagenta: "\x1b[35m",
	FgCyan: "\x1b[36m",
	FgWhite: "\x1b[37m",
	BgBlack: "\x1b[40m",
	BgRed: "\x1b[41m",
	BgGreen: "\x1b[42m",
	BgYellow: "\x1b[43m",
	BgBlue: "\x1b[44m",
	BgMagenta: "\x1b[45m",
	BgCyan: "\x1b[46m",
	BgWhite: "\x1b[47m"
} as const;
