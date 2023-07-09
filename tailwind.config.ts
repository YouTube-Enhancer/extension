import { type Config } from "tailwindcss";

export default {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			animation: {
				"spin-slow": "spin 20s linear infinite"
			}
		}
	},
	prefix: "",
	plugins: []
} satisfies Config;
