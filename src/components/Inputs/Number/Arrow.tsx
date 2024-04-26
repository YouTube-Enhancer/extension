import { cn } from "@/src/utils/utilities";

type RotationDirection = "down" | "left" | "right" | "up";
export default function Arrow({ rotation }: { rotation: RotationDirection }) {
	return (
		<svg
			// eslint-disable-next-line tailwindcss/enforces-shorthand
			className={cn("h-4 w-4 scale-125 transition-transform duration-300", {
				"rotate-0": rotation === "down",
				"rotate-90": rotation === "left",
				"rotate-180": rotation === "up",
				"rotate-270": rotation === "right"
			})}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path d="M7 10l5 5 5-5z"></path>
		</svg>
	);
}
