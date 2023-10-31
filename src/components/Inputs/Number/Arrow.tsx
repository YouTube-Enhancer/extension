import { cn } from "@/src/utils/utilities";

type RotationDirection = "down" | "up" | "left" | "right";
export default function Arrow({ rotation }: { rotation: RotationDirection }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			className={cn("h-4 w-4 transition-transform duration-300 transform", {
				"rotate-0": rotation === "down",
				"rotate-90": rotation === "left",
				"rotate-180": rotation === "up",
				"rotate-270": rotation === "right"
			})}
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
		</svg>
	);
}
