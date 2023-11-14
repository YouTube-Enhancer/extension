import { type Config } from "tailwindcss";

export default {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	plugins: [],
	prefix: "",
	theme: {
		extend: {
			animation: {
				"spin-slow": "spin 20s linear infinite"
			}
		}
	}
} satisfies Config;
