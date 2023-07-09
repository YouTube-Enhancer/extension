type ColorType = "success" | "info" | "error" | "warning" | keyof typeof COLORS;
export function colorizeLog(message: string, type?: ColorType) {
	let color: ColorType | string | typeof COLORS = type || "FgBlack";

	switch (type) {
		case "success":
			({ ["FgGreen"]: color } = COLORS);
			break;
		case "info":
			({ ["FgBlue"]: color } = COLORS);
			break;
		case "error":
			({ ["FgRed"]: color } = COLORS);
			break;
		case "warning":
			({ ["FgYellow"]: color } = COLORS);
			break;
		default: {
			if (typeof type === "string" && COLORS[type]) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				({ [`${type}`]: color } = COLORS);
			}
			break;
		}
	}

	return `${color}${message}${COLORS.Reset}`;
}
export default function colorLog(message: string, type?: ColorType) {
	console.log(colorizeLog(`[YouTube Enhancer]`, "FgCyan"), colorizeLog(message, type));
}

const COLORS = {
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
