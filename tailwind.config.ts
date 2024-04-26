import { type Config } from "tailwindcss";
import multi from "tailwindcss-multi";
export default {
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	plugins: [multi.handler],
	prefix: "",
	theme: {
		extend: {
			animation: {
				"spin-slow": "spin 20s linear infinite"
			}
		}
	}
} satisfies Config;
